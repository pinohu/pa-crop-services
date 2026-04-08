import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';
import { N8N_BASE } from './_config.js';

const log = createLogger('retarget');

// PA CROP Services — Lead Retargeting Drip Trigger
// POST /api/retarget { email, name, riskScore, source }
// Adds lead to Acumbamail retargeting sequence (4-email drip)
// Called by /api/intake and /api/qualify-lead for unconverted leads

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });
  const blocked = await checkRateLimit(getClientIp(req), 'retarget', 10, '60s');
  if (blocked) { res.setHeader('Retry-After', String(blocked.retryAfter)); return res.status(429).json({ success: false, error: 'Too many requests' }); }

  const { email, name, riskScore, source } = req.body || {};
  if (!email) return res.status(400).json({ success: false, error: 'email required' });

  const acuKey = process.env.ACUMBAMAIL_API_KEY;
  const RETARGET_LIST = '1267325'; // Acumbamail retargeting list

  try {
    // Add to retargeting list with merge fields for personalization
    await fetch('https://acumbamail.com/api/1/addSubscriber/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: acuKey,
        list_id: RETARGET_LIST,
        email,
        merge_fields: {
          NAME: name || '',
          RISK: riskScore || '',
          SOURCE: source || 'website',
          SIGNUP_DATE: new Date().toISOString().split('T')[0]
        },
        response_type: 'json'
      })
    });

    // Also trigger n8n for immediate Day-1 email
    if (N8N_BASE) {
      await fetch(`${N8N_BASE}/crop-retarget-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, riskScore, source, day: 1 })
      }).catch(e => log.warn('external_call_failed', { error: e.message }));
    } else {
      log.warn('n8n_not_configured', { step: 'retarget_start', reason: 'N8N_WEBHOOK_URL not set' });
    }

    return res.status(200).json({ success: true, message: 'Added to retargeting sequence', email });
  } catch (e) {
    log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
