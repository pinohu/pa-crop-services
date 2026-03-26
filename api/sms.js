// PA CROP Services — SMS sender via SMS-iT
// POST /api/sms { to, message, type }
// Types: welcome, reminder_90, reminder_30, reminder_7, renewal, custom

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';

const log = createLogger('sms');

const TEMPLATES = {
  welcome: (data) => `Welcome to PA CROP Services! Your portal is ready: pacropservices.com/portal\n\nAccess code: ${data.code || '[check email]'}\n\nQuestions? Call 814-228-2822`,
  reminder_90: (data) => `PA CROP Services: Your PA annual report for ${data.entity || 'your entity'} is due in ~90 days. We'll keep you posted. Log in: pacropservices.com/portal`,
  reminder_30: (data) => `⚠️ PA CROP Services: Annual report due in 30 days for ${data.entity || 'your entity'}. ${data.filing ? 'We\'ll handle the filing — confirm details in your portal.' : 'File at file.dos.pa.gov ($7).'} Questions? 814-228-2822`,
  reminder_7: (data) => `🚨 URGENT — PA CROP Services: Annual report due in 7 DAYS for ${data.entity || 'your entity'}. ${data.filing ? 'We\'re filing for you. Confirm now: pacropservices.com/portal' : 'File TODAY at file.dos.pa.gov or call us: 814-228-2822'}`,
  renewal: (data) => `PA CROP Services: Your ${data.tier || ''} plan renews in ${data.days || '30'} days. No action needed — auto-renews. Questions? 814-228-2822`,
  entity_alert: (data) => `PA CROP Services: Status change detected for ${data.entity || 'your entity'}. New status: ${data.status || 'unknown'}. Log in: pacropservices.com/portal or call 814-228-2822`,
};

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  // Admin requests bypass the SMS rate limit; non-admin requests are rate limited
  const isAdmin = isAdminRequest(req);
  if (!isAdmin) {
    const blocked = await checkRateLimit(getClientIp(req), 'sms', 3, '60s');
  if (blocked) { res.setHeader('Retry-After', String(blocked.retryAfter)); return res.status(429).json({ success: false, error: 'Too many requests' }); }
  }

  const { to, message, type, data = {} } = req.body || {};
  if (!to) return res.status(400).json({ success: false, error: 'to (phone number) required' });

  const SMSIT_KEY = process.env.SMSIT_API_KEY;
  if (!SMSIT_KEY) return res.status(503).json({ success: false, error: 'SMSIT_API_KEY not configured. Add to Vercel env vars.' });
  const smsBody = message || (TEMPLATES[type] ? TEMPLATES[type](data) : null);
  if (!smsBody) return res.status(400).json({ success: false, error: 'message or valid type required' });

  try {
    const smsRes = await fetch('https://aicpanel.smsit.ai/api/v2/sms/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SMSIT_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: to,
        message: smsBody,
        sender_id: 'PACROP'
      })
    });
    const result = await smsRes.json().catch(() => ({}));
    return res.status(200).json({ success: true, sms_id: result?.data?.id, to, type: type || 'custom', via: 'smsit' });
  } catch (e) {
    // Twilio fallback
    const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_FROM = process.env.TWILIO_PHONE || '+18142282822';
    if (TWILIO_SID && TWILIO_TOKEN) {
      try {
        const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
          method: 'POST',
          headers: { 'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: smsBody })
        });
        const twilioData = await twilioRes.json();
        return res.status(200).json({ success: true, sms_id: twilioData?.sid, to, type: type || 'custom', via: 'twilio_fallback' });
      } catch (te) {
        log.error('twilio_fallback_also_failed', {}, te instanceof Error ? te : new Error(String(te)));
        return res.status(502).json({ success: false, error: 'Both SMS-iT and Twilio failed', detail: te.message });
      }
    }
    log.error('sms_it_failed_and_no_twilio_configured', {}, e instanceof Error ? e : new Error(String(e)));
    return res.status(502).json({ success: false, error: 'SMS delivery failed', detail: e.message });
  }
}
