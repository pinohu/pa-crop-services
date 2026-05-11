// PA CROP Services — Post-Purchase Entity Intake
// POST /api/entity-intake { email, entityName, entityType, dosFileNumber, foreignState? }
// Saves entity data to Neon DB (if connected), updates SuiteDash, and notifies admin.

import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';
import { resolveEntityType } from './_compliance.js';
import { isServicePaused, sendPausedResponse } from './_pause.js';

const log = createLogger('entity-intake');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  if (isServicePaused()) return sendPausedResponse(res);

  // Rate limit: 10/min per IP
  const blocked = await checkRateLimit(getClientIp(req), 'entity-intake', 10, '60s');
  if (blocked) {
    res.setHeader('Retry-After', String(blocked.retryAfter));
    return res.status(429).json({ success: false, error: 'Too many requests' });
  }

  const { email, entityName, entityType, dosFileNumber, foreignState } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Valid email required' });
  }
  if (!entityName || typeof entityName !== 'string' || entityName.trim().length < 2) {
    return res.status(400).json({ success: false, error: 'entityName required (min 2 characters)' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanEntityName = entityName.trim();
  const resolvedEntityType = resolveEntityType(entityType || 'LLC');

  // ── Step 1: Save to Neon DB ──────────────────────────────────
  let neonOrgId = null;
  try {
    const db = await import('./services/db.js');
    if (db.isConnected()) {
      // Find existing client record by email
      const client = await db.getClientByEmail(cleanEmail);

      if (client && client.organization_id) {
        // Update existing org
        await db.updateOrganization(client.organization_id, {
          legal_name: cleanEntityName,
          entity_type: resolvedEntityType,
          dos_number: dosFileNumber?.trim() || undefined,
          jurisdiction: foreignState ? 'PA_FOREIGN' : 'PA',
          metadata: {
            foreign_state: foreignState || null,
            intake_updated_at: new Date().toISOString()
          }
        });
        neonOrgId = client.organization_id;
        log.info('entity_intake_updated_existing', { orgId: neonOrgId, email: cleanEmail });
      } else {
        // Create new org record
        const newOrg = await db.createOrganization({
          legal_name: cleanEntityName,
          entity_type: resolvedEntityType,
          jurisdiction: 'PA',
          dos_number: dosFileNumber?.trim() || null,
          entity_status: 'pending_verification',
          principal_address: {},
          registered_office_address: {
            street: '924 W 23rd St',
            city: 'Erie',
            state: 'PA',
            zip: '16502'
          },
          metadata: {
            foreign_state: foreignState || null,
            intake_email: cleanEmail,
            intake_at: new Date().toISOString(),
            source: 'entity-intake'
          }
        });

        if (newOrg) {
          neonOrgId = newOrg.id;
          log.info('entity_intake_created_org', { orgId: neonOrgId, email: cleanEmail });

          // Link org to client if client exists without an org
          if (client && !client.organization_id) {
            await db.updateClient(client.id, { organization_id: neonOrgId });
          }
        }
      }
    }
  } catch (dbErr) {
    // Non-fatal — log and continue
    log.error('entity_intake_db_error', { email: cleanEmail }, dbErr instanceof Error ? dbErr : new Error(String(dbErr)));
  }

  // ── Step 2: Update SuiteDash ────────────────────────────────
  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;

  if (SD_PUBLIC && SD_SECRET) {
    try {
      const findRes = await fetch(
        `https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(cleanEmail)}&limit=1`,
        {
          headers: {
            'X-Public-ID': SD_PUBLIC,
            'X-Secret-Key': SD_SECRET,
            'Accept': 'application/json'
          }
        }
      );

      if (findRes.ok) {
        const findData = await findRes.json();
        const contacts = findData?.data || findData || [];
        const sdClient = Array.isArray(contacts) ? contacts[0] : contacts;

        if (sdClient?.id) {
          await fetch(`https://app.suitedash.com/secure-api/contacts/${sdClient.id}`, {
            method: 'PUT',
            headers: {
              'X-Public-ID': SD_PUBLIC,
              'X-Secret-Key': SD_SECRET,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              company: cleanEntityName,
              custom_fields: {
                entity_type: resolvedEntityType,
                dos_file_number: dosFileNumber?.trim() || '',
                foreign_state: foreignState || '',
                neon_org_id: neonOrgId || ''
              }
            })
          });
          log.info('entity_intake_suitedash_updated', { sdId: sdClient.id, email: cleanEmail });
        }
      }
    } catch (sdErr) {
      log.error('suitedash_update_failed', { email: cleanEmail }, sdErr instanceof Error ? sdErr : new Error(String(sdErr)));
    }
  }

  // ── Step 3: Notify admin ─────────────────────────────────────
  const EMAILIT_KEY = process.env.EMAILIT_API_KEY;
  if (EMAILIT_KEY) {
    try {
      await fetch('https://api.emailit.com/v1/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + EMAILIT_KEY
        },
        body: JSON.stringify({
          from: 'hello@pacropservices.com',
          to: 'polycarpohu@gmail.com',
          subject: `New Entity Intake: ${cleanEntityName}`,
          text: [
            `New entity submitted:`,
            ``,
            `Entity: ${cleanEntityName}`,
            `Type: ${resolvedEntityType}`,
            `DOS File: ${dosFileNumber?.trim() || 'Not provided'}`,
            `Email: ${cleanEmail}`,
            `Foreign State: ${foreignState || 'N/A'}`,
            `Neon Org ID: ${neonOrgId || 'Not created'}`,
            ``,
            `Action: Verify at PA DOS and confirm registration.`
          ].join('\n')
        })
      });
    } catch {
      // Non-fatal
    }
  }

  // ── Step 4: Hot lead signal to n8n ──────────────────────────
  try {
    await fetch('https://n8n.audreysplace.place/webhook/crop-hot-lead-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        name: cleanEntityName,
        source: 'entity-intake',
        score: 100,
        reason: 'New entity intake submitted',
        neon_org_id: neonOrgId
      })
    });
  } catch {
    // Non-fatal
  }

  return res.status(200).json({
    success: true,
    message: 'Entity details saved',
    org_id: neonOrgId
  });
}
