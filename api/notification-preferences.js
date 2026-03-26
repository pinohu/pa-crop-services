import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';

const log = createLogger('notification-preferences');

// PA CROP Services — Client Notification Preferences
// GET /api/notification-preferences?email=x (read)
// POST /api/notification-preferences { email, prefs } (update)

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const blocked = await checkRateLimit(getClientIp(req), 'notification-preferences', 10, '60s');
  if (blocked) { res.setHeader('Retry-After', String(blocked.retryAfter)); return res.status(429).json({ success: false, error: 'Too many requests' }); }

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  if (!SD_PUBLIC || !SD_SECRET) return res.status(500).json({ success: false, error: 'CRM not configured' });

  const email = req.query?.email || req.body?.email;
  if (!email) return res.status(400).json({ success: false, error: 'email required' });

  try {
    // Find contact
    const searchRes = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const contacts = (await searchRes.json())?.data || [];
    if (!contacts.length) return res.status(404).json({ success: false, error: 'Client not found' });
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
    log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
