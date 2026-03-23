import { rateLimit } from './_rateLimit.js';
// PA CROP Services — /api/reset-code
// Self-service portal access code recovery
// POST { email }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: Code reset — 3/min
  if (rateLimit(req, res, 3, 60000)) return;

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

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
        }).catch(() => {});
      }
    }

    return res.status(200).json(SUCCESS);
  } catch (err) {
    console.error('Reset code error:', err);
    return res.status(200).json(SUCCESS); // Always succeed publicly
  }
}
