// PA CROP Services — Client Notification Preferences
// GET /api/notification-preferences?email=x (read)
// POST /api/notification-preferences { email, prefs } (update)

const _rl = new Map();
function _rateLimit(req, res, max, win) {
  const ip = (req.headers['x-forwarded-for']||'').split(',')[0].trim()||'unknown';
  const k = ip+':'+(req.url||'').split('?')[0]; const now = Date.now();
  let d = _rl.get(k); if(!d||now-d.s>win){_rl.set(k,{c:1,s:now});return false;}
  d.c++; if(d.c>max){res.setHeader('Retry-After',String(Math.ceil((d.s+win-now)/1000)));res.status(429).json({error:'Too many requests'});return true;} return false;
}

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (_rateLimit(req, res, 10, 60000)) return;

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  if (!SD_PUBLIC || !SD_SECRET) return res.status(500).json({ error: 'CRM not configured' });

  const email = req.query?.email || req.body?.email;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    // Find contact
    const searchRes = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const contacts = (await searchRes.json())?.data || [];
    if (!contacts.length) return res.status(404).json({ error: 'Client not found' });
    const contact = contacts[0];

    if (req.method === 'GET') {
      // Return current preferences
      return res.status(200).json({
        success: true, email,
        preferences: {
          email_notifications: contact.custom_fields?.pref_email !== 'off',
          sms_notifications: contact.custom_fields?.pref_sms === 'on',
          phone_ok: contact.custom_fields?.pref_phone === 'on',
          marketing_emails: contact.custom_fields?.pref_marketing !== 'off',
          deadline_sms: contact.custom_fields?.pref_deadline_sms !== 'off',
        }
      });
    }

    // POST — update preferences
    const prefs = req.body?.prefs || {};
    const updates = {};
    if (prefs.email_notifications !== undefined) updates.pref_email = prefs.email_notifications ? 'on' : 'off';
    if (prefs.sms_notifications !== undefined) updates.pref_sms = prefs.sms_notifications ? 'on' : 'off';
    if (prefs.phone_ok !== undefined) updates.pref_phone = prefs.phone_ok ? 'on' : 'off';
    if (prefs.marketing_emails !== undefined) updates.pref_marketing = prefs.marketing_emails ? 'on' : 'off';
    if (prefs.deadline_sms !== undefined) updates.pref_deadline_sms = prefs.deadline_sms ? 'on' : 'off';

    await fetch(`https://app.suitedash.com/secure-api/contacts/${contact.id}`, {
      method: 'PUT',
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_fields: updates })
    });

    return res.status(200).json({ success: true, message: 'Preferences updated', updates });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
