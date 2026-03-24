// PA CROP Services — /api/subscribe
// Newsletter / lead magnet email capture
// POST { email, source, tag }

const ALLOWED_ORIGINS = ['https://pacropservices.com', 'https://www.pacropservices.com'];

// ── Rate Limiter (in-memory, per-instance — upgrade to Upstash Redis for durable limiting) ──
const _rl = new Map();
function _rateLimit(req, res, max, win) {
  const ip = (req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.headers['x-real-ip'] || 'unknown';
  const k = ip + ':' + (req.url||'').split('?')[0];
  const now = Date.now();
  let d = _rl.get(k);
  if (!d || now - d.s > win) { _rl.set(k, {c:1,s:now,w:win}); return false; }
  d.c++;
  if (d.c > max) { res.setHeader('Retry-After', String(Math.ceil((d.s+win-now)/1000))); res.status(429).json({error:'Too many requests'}); return true; }
  return false;
}

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: Newsletter — 5/min
  if (_rateLimit(req, res, 5, 60000)) return;

  const { email, source, tag } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  const cleanEmail = email.toLowerCase().trim();

  // Acumbamail list 1267324 (All Clients / Leads)
  const ACUMBAMAIL_KEY = process.env.ACUMBAMAIL_API_KEY;
  const LIST_ID = '1267324';

  const warnings = [];

  try {
    // ── Acumbamail subscription ──
    if (ACUMBAMAIL_KEY) {
      try {
        const acumbaRes = await fetch('https://acumbamail.com/api/1/addSubscriber/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auth_token: ACUMBAMAIL_KEY,
            list_id: LIST_ID,
            email: cleanEmail,
            extra_fields: {
              SOURCE: source || 'website',
              TAG: tag || 'newsletter'
            }
          })
        });
        if (!acumbaRes.ok) {
          const errText = await acumbaRes.text().catch(() => 'unknown');
          console.error('[subscribe] Acumbamail failed (' + acumbaRes.status + '): ' + errText + ' | email=' + cleanEmail);
          warnings.push('email_list');
        }
      } catch (acumbaErr) {
        console.error('[subscribe] Acumbamail error: ' + acumbaErr.message + ' | email=' + cleanEmail);
        warnings.push('email_list');
      }
    } else {
      console.warn('[subscribe] ACUMBAMAIL_API_KEY not set — skipping list subscription');
      warnings.push('email_list_config');
    }

    // ── n8n nurture sequence webhook ──
    try {
      const n8nRes = await fetch('https://n8n.audreysplace.place/webhook/crop-lead-nurture-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, source: source || 'newsletter', tag, leadTier: 'warm', guideUrl: 'https://pacropservices.com/pa-annual-report-compliance-checklist.pdf' })
      });
      if (!n8nRes.ok) {
        const errText = await n8nRes.text().catch(() => 'unknown');
        console.error('[subscribe] n8n webhook failed (' + n8nRes.status + '): ' + errText + ' | email=' + cleanEmail);
        warnings.push('nurture_sequence');
      }
    } catch (n8nErr) {
      console.error('[subscribe] n8n webhook error: ' + n8nErr.message + ' | email=' + cleanEmail);
      warnings.push('nurture_sequence');
    }

    // Return success with visibility into partial failures
    return res.status(200).json({
      success: true,
      ...(warnings.length > 0 && { warnings, partial: true })
    });
  } catch (err) {
    console.error('[subscribe] Unexpected error:', err);
    return res.status(500).json({ error: 'Something went wrong processing your request. Please try again or call 814-228-2822.' });
  }
}
