import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';
import { N8N_BASE } from './_config.js';

const log = createLogger('partner-intake');

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

    // Fire n8n partner onboarding sequence
    if (N8N_BASE) {
      await fetch(`${N8N_BASE}/crop-partner-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmName, firstName, lastName, email: cleanEmail, phone,
          clientCount, pricingPreference, firmType, tags
        })
      }).catch(e => log.warn('external_call_failed', { error: e.message }));
    } else {
      log.warn('n8n_not_configured', { step: 'partner_onboarding', reason: 'N8N_WEBHOOK_URL not set' });
    }

    return res.status(200).json({
      success: true,
      message: 'Partner application received. You will hear from us within 1 business day.'
    });
  } catch (err) {
    log.error('partner_intake_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'Internal error. Please email partners@pacropservices.com directly.' });
  }
}
