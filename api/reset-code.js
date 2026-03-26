// PA CROP Services — /api/reset-code
// Self-service portal access code recovery
// POST { email }

import { isValidEmail } from './_validate.js';

// ── Rate Limiter (in-memory, per-instance) ──
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

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: Code reset — 3/min
  if (_rateLimit(req, res, 3, 60000)) return;

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });

  const cleanEmail = email.toLowerCase().trim();
  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;

  // Always return success to prevent email enumeration
  const SUCCESS = { success: true, message: 'If this email is in our system, you will receive your access code within a few minutes.' };

  try {
    if (!SD_PUBLIC || !SD_SECRET) return res.status(200).json(SUCCESS);

    const sdRes = await fetch(
      `https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(cleanEmail)}&limit=1`,
      { headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET } }
    );
    const sdData = await sdRes.json();
    const contacts = sdData?.data || [];
    const contact = contacts.find(c => (c.email || '').toLowerCase() === cleanEmail);

    if (contact) {
      const code = contact.custom_fields?.portal_access_code;
      const firstName = contact.first_name || '';
      
      if (code) {
        // Fire n8n to send the code via email
        await fetch('https://n8n.audreysplace.place/webhook/crop-portal-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, code, firstName })
        }).catch(e => console.error('Silent failure:', e.message));
      }
    }

    return res.status(200).json(SUCCESS);
  } catch (err) {
    console.error('Reset code error:', err);
    return res.status(200).json(SUCCESS); // Always succeed publicly
  }
}
