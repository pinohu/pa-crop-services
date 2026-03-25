// PA CROP Services — Portal Auth (POST /api/auth)
// Handles portal login with demo account + SuiteDash lookup.
// This restores the /api/auth endpoint that the portal calls.

import { setCors } from '../services/auth.js';

const _rl = new Map();
function _rateLimit(req, res, max, win) {
  const ip = (req.headers['x-forwarded-for']||'').split(',')[0].trim() || 'unknown';
  const k = ip + ':auth';
  const now = Date.now();
  let d = _rl.get(k);
  if (!d || now - d.s > win) { _rl.set(k, {c:1,s:now,w:win}); return false; }
  d.c++;
  if (d.c > max) { res.setHeader('Retry-After', String(Math.ceil((d.s+win-now)/1000))); res.status(429).json({error:'Too many requests'}); return true; }
  return false;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });
  if (_rateLimit(req, res, 10, 60000)) return;

  const { email, code } = req.body || {};
  if (!email || !code) return res.status(400).json({ success: false, error: 'Missing email or code' });

  const cleanEmail = email.toLowerCase().trim();
  const cleanCode = code.toUpperCase().trim();

  // ── Demo account ─────────────────────────────────────────
  if (cleanEmail === 'demo@pacropservices.com' && cleanCode === 'DEMO2026') {
    const { createSession } = await import('../services/auth.js');
    const session = await createSession({ id: 'demo', organization_id: 'demo-org', plan_code: 'business_pro', email: cleanEmail, roles: ['client'] });
    return res.status(200).json({
      success: true,
      token: session.token,
      expires_at: session.expires_at,
      client: {
        name: 'Acme Holdings LLC',
        email: cleanEmail,
        tier: 'business_pro',
        tierLabel: 'Business Pro',
        price: '$349/yr',
        refCode: 'CROP-DEMO',
        since: 'January 2026',
        firstName: 'Demo',
        lastName: 'Client',
        suitedashId: null,
        entityType: 'domestic_llc',
        entityNumber: '7234819',
        entityStatus: 'active',
        includesFiling: true,
        includesHosting: true
      }
    });
  }

  // ── SuiteDash lookup ─────────────────────────────────────
  try {
    const { findClientByEmail } = await import('../services/suitedash.js');
    const { isConfigured } = await import('../services/suitedash.js');

    if (isConfigured()) {
      const sdClient = await findClientByEmail(cleanEmail);
      if (sdClient) {
        // Check access code against custom field or use simple matching
        const storedCode = sdClient.custom_fields?.access_code || '';
        if (storedCode && storedCode.toUpperCase() === cleanCode) {
          const { createSession } = await import('../services/auth.js');
          const session = await createSession({ id: sdClient.uid, organization_id: sdClient.custom_fields?.neon_org_id || null, plan_code: sdClient.custom_fields?.plan_code || 'compliance_only', email: sdClient.email, roles: ['client'] });
          return res.status(200).json({
            success: true,
            token: session.token,
            expires_at: session.expires_at,
            client: {
              name: sdClient.company_name || sdClient.name || `${sdClient.first_name} ${sdClient.last_name}`,
              email: sdClient.email,
              tier: sdClient.custom_fields?.plan_code || 'compliance_only',
              tierLabel: { compliance_only: 'Compliance Only', business_starter: 'Business Starter', business_pro: 'Business Pro', business_empire: 'Business Empire' }[sdClient.custom_fields?.plan_code] || 'Compliance Only',
              refCode: sdClient.uid?.slice(0, 8) || '',
              since: sdClient.created_at ? new Date(sdClient.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'New',
              firstName: sdClient.first_name,
              lastName: sdClient.last_name,
              suitedashId: sdClient.uid,
              entityType: sdClient.custom_fields?.entity_type || '',
              entityNumber: sdClient.custom_fields?.dos_number || '',
              entityStatus: sdClient.custom_fields?.compliance_status || 'active',
              organization_id: sdClient.custom_fields?.neon_org_id || null
            }
          });
        }
      }
    }
  } catch (e) {
    console.error('SuiteDash auth error:', e.message);
  }

  // ── Neon lookup ──────────────────────────────────────────
  try {
    const db = await import('../services/db.js');
    if (db.isConnected()) {
      const client = await db.getClientByEmail(cleanEmail);
      if (client) {
        const meta = client.metadata || {};
        const storedCode = meta.access_code || '';
        if (storedCode && storedCode.toUpperCase() === cleanCode) {
          if (meta.access_code_expires && new Date(meta.access_code_expires) < new Date()) {
            return res.status(401).json({ success: false, error: 'Code expired. Request a new one.' });
          }
          // Only clear one-time codes (those with an expiry). Permanent codes persist.
          if (meta.access_code_expires) {
            await db.updateClient(client.id, { metadata: { ...meta, access_code: null, access_code_expires: null } });
          }
          // Issue JWT session token
          const { createSession } = await import('../services/auth.js');
          const session = await createSession({
            id: client.id,
            organization_id: client.organization_id,
            plan_code: client.plan_code || 'compliance_only',
            email: client.email,
            roles: meta.roles || ['client']
          });
          return res.status(200).json({
            success: true,
            token: session.token,
            expires_at: session.expires_at,
            client: {
              name: client.legal_name || client.owner_name || cleanEmail,
              email: client.email,
              tier: client.plan_code || 'compliance_only',
              tierLabel: { compliance_only: 'Compliance Only', business_starter: 'Business Starter', business_pro: 'Business Pro', business_empire: 'Business Empire' }[client.plan_code] || 'Compliance Only',
              refCode: client.referral_code || '',
              since: client.created_at ? new Date(client.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'New',
              suitedashId: meta.suitedash_uid || null,
              entityType: client.entity_type || '',
              entityNumber: client.dos_number || '',
              entityStatus: client.entity_status || 'active',
              organization_id: client.organization_id
            }
          });
        }
      }
    }
  } catch (e) {
    console.error('Neon auth error:', e.message);
  }

  return res.status(401).json({ success: false, error: 'Invalid email or access code.' });
}
