import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';
import * as db from './services/db.js';

const log = createLogger('partner-intake');

async function notifyIke(subject, body) {
  const key = process.env.EMAILIT_API_KEY;
  if (!key) return;
  try {
    await fetch('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'partners@pacropservices.com',
        to: 'hello@pacropservices.com',
        subject: '[PA CROP] ' + subject,
        html: '<div style="font-family:sans-serif;max-width:600px">' + body + '</div>'
      })
    });
  } catch (e) { log.warn('partner_notify_failed', { error: e.message }); }
}

// PA CROP Services — /api/partner-intake
// CPA/Attorney partner application intake
// Follows the neatcircle compliance-productized pattern (GAP-15)
// POST { firmName, firstName, lastName, email, phone, clientCount, pricingPreference, firmType }

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // Rate limit: Partner apps — 5/min
  const blocked = await checkRateLimit(getClientIp(req), 'partner-intake', 5, '60s');
  if (blocked) { res.setHeader('Retry-After', String(blocked.retryAfter)); return res.status(429).json({ success: false, error: 'Too many requests' }); }

  const {
    firmName, firstName, lastName, email, phone,
    clientCount, pricingPreference, firmType
  } = req.body || {};

  if (!email || !firmName) return res.status(400).json({ success: false, error: 'Email and firm name required' });

  const cleanEmail = email.toLowerCase().trim();

  // Build tags (compliance-productized pattern)
  const tags = [
    'crop-partner-applicant',
    firmType ? `firm-${firmType}` : '',
    (clientCount && Number(clientCount) > 20) ? 'high-value-partner' : 'standard-partner',
    pricingPreference ? `pricing-${pricingPreference}` : '',
  ].filter(Boolean);

  // Background info for SuiteDash notes
  const backgroundInfo = [
    firmType ? `Firm type: ${firmType}` : '',
    clientCount ? `Estimated client count: ${clientCount}` : '',
    pricingPreference ? `Pricing preference: ${pricingPreference}` : '',
  ].filter(Boolean).join('\n');

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;

  try {
    // Create SuiteDash contact as partner lead
    if (SD_PUBLIC && SD_SECRET) {
      await fetch('https://app.suitedash.com/secure-api/contacts', {
        method: 'POST',
        headers: {
          'X-Public-ID': SD_PUBLIC,
          'X-Secret-Key': SD_SECRET,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: firstName || '',
          last_name: lastName || '',
          email: cleanEmail,
          phone: phone || '',
          company: firmName,
          role: 'lead',
          tags,
          notes: backgroundInfo,
          custom_fields: {
            lead_source: 'partner-application',
            firm_name: firmName,
            firm_type: firmType || '',
            estimated_client_count: clientCount || '',
            pricing_preference: pricingPreference || ''
          }
        })
      }).catch(e => log.warn('external_call_failed', { error: e.message }));
    }

    // Persist partner record in Neon so admin/partner-channel + /api/partners/me/*
    // see the applicant immediately, not only after n8n runs. Idempotent on email.
    let neonPartner = null;
    try {
      if (db.isConnected()) {
        neonPartner = await db.createPartner({
          name: firmName,
          email: cleanEmail,
          partner_type: firmType || 'cpa',
          is_active: false, // Pending approval — flip to true after Ike reviews.
          metadata: {
            first_name: firstName || '',
            last_name: lastName || '',
            phone: phone || '',
            estimated_client_count: clientCount || '',
            pricing_preference: pricingPreference || '',
            tags,
            applied_at: new Date().toISOString(),
            status: 'pending_review'
          }
        });
      }
    } catch (e) { log.warn('partner_neon_persist_failed', { email: cleanEmail, error: e.message }); }

    // Fire n8n partner onboarding sequence
    await fetch('https://n8n.audreysplace.place/webhook/crop-partner-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firmName, firstName, lastName, email: cleanEmail, phone,
        clientCount, pricingPreference, firmType, tags,
        neonPartnerId: neonPartner?.id || null
      })
    }).catch(e => log.warn('external_call_failed', { error: e.message }));

    // Direct admin notification — n8n may not run, but Ike still needs to know.
    await notifyIke(`New partner application: ${firmName}`,
      `<h2>New partner application</h2>
       <p><strong>Firm:</strong> ${firmName} (${firmType || 'unspecified'})</p>
       <p><strong>Contact:</strong> ${firstName || ''} ${lastName || ''} &lt;${cleanEmail}&gt; ${phone || ''}</p>
       <p><strong>Estimated clients:</strong> ${clientCount || 'unspecified'}</p>
       <p><strong>Pricing preference:</strong> ${pricingPreference || 'unspecified'}</p>
       <p><strong>Neon partner id:</strong> ${neonPartner?.id || 'not persisted'}</p>
       <p>Review and activate at <a href="https://www.pacropservices.com/admin">/admin</a> when ready.</p>`);

    return res.status(200).json({
      success: true,
      message: 'Partner application received. You will hear from us within 1 business day.'
    });
  } catch (err) {
    log.error('partner_intake_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'Internal error. Please email partners@pacropservices.com directly.' });
  }
}
