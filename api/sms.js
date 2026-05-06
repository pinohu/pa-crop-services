// PA CROP Services — SMS sender via SMS-iT
// POST /api/sms { to, message, type }
// Types: welcome, reminder_90, reminder_30, reminder_7, renewal, custom

import { isAdminRequest, setCors } from './services/auth.js';
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

  // Twilio config is read here so both the SMS-iT fallback path AND a primary
  // delivery failure can route to the same fallback block.
  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_FROM = process.env.TWILIO_PHONE || '+18142282822';

  async function tryTwilio(reasonForFallback) {
    if (!TWILIO_SID || !TWILIO_TOKEN) return null;
    try {
      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: smsBody })
      });
      if (twilioRes.ok) {
        const twilioData = await twilioRes.json().catch(() => ({}));
        log.info('sms_twilio_fallback_ok', { reasonForFallback, to, type: type || 'custom' });
        return { ok: true, sms_id: twilioData?.sid };
      }
      const detail = await twilioRes.text().catch(() => 'unknown');
      log.error('twilio_fallback_non_ok', { reasonForFallback, status: twilioRes.status, detail: detail.slice(0, 200) });
      return { ok: false, status: twilioRes.status, detail: detail.slice(0, 200) };
    } catch (te) {
      log.error('twilio_fallback_threw', { reasonForFallback }, te instanceof Error ? te : new Error(String(te)));
      return { ok: false, error: te.message };
    }
  }

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

    // CRITICAL: same shape as the Wave-9 Emailit silent-failure fix. SMS-iT
    // returns 4xx for invalid phone, suspended account, exhausted credits,
    // banned content — none of those throw, they just yield a non-OK response.
    // Without this check, every failed SMS would silently report success: true
    // and the caller would mark e.g. welcome_sms 'done' with no delivery.
    if (smsRes.ok) {
      const result = await smsRes.json().catch(() => ({}));
      return res.status(200).json({ success: true, sms_id: result?.data?.id, to, type: type || 'custom', via: 'smsit' });
    }

    const detail = await smsRes.text().catch(() => 'unknown');
    log.error('sms_it_non_ok', { status: smsRes.status, detail: detail.slice(0, 200), to: to.slice(-4), type });

    // Try Twilio as a recovery path before reporting failure.
    const twilio = await tryTwilio(`smsit_${smsRes.status}`);
    if (twilio?.ok) {
      return res.status(200).json({ success: true, sms_id: twilio.sms_id, to, type: type || 'custom', via: 'twilio_fallback', primary_failed: { provider: 'smsit', status: smsRes.status, detail: detail.slice(0, 200) } });
    }

    return res.status(502).json({
      success: false,
      error: 'SMS delivery failed',
      provider: 'smsit',
      status: smsRes.status,
      detail: detail.slice(0, 200),
      twilio_attempted: twilio !== null,
      twilio_error: twilio?.detail || twilio?.error || null
    });
  } catch (e) {
    // Network-level error (DNS, timeout) on SMS-iT → try Twilio.
    log.error('sms_it_threw', {}, e instanceof Error ? e : new Error(String(e)));
    const twilio = await tryTwilio(`smsit_threw:${e.message?.slice(0, 60)}`);
    if (twilio?.ok) {
      return res.status(200).json({ success: true, sms_id: twilio.sms_id, to, type: type || 'custom', via: 'twilio_fallback', primary_failed: { provider: 'smsit', error: e.message } });
    }
    if (twilio === null) {
      return res.status(502).json({ success: false, error: 'SMS delivery failed', detail: e.message, twilio_configured: false });
    }
    return res.status(502).json({ success: false, error: 'Both SMS-iT and Twilio failed', smsit_error: e.message, twilio_error: twilio.detail || twilio.error || null });
  }
}
