// PA CROP Services — SMS sender via SMS-iT
// POST /api/sms { to, message, type }
// Types: welcome, reminder_90, reminder_30, reminder_7, renewal, custom

const _rl = new Map();
function _rateLimit(req, res, max, win) {
  const ip = (req.headers['x-forwarded-for']||'').split(',')[0].trim() || 'unknown';
  const k = ip + ':' + (req.url||'').split('?')[0];
  const now = Date.now();
  let d = _rl.get(k);
  if (!d || now - d.s > win) { _rl.set(k, {c:1,s:now,w:win}); return false; }
  d.c++;
  if (d.c > max) { res.setHeader('Retry-After', String(Math.ceil((d.s+win-now)/1000))); res.status(429).json({error:'Too many requests'}); return true; }
  return false;
}

const TEMPLATES = {
  welcome: (data) => `Welcome to PA CROP Services! Your portal is ready: pacropservices.com/portal\n\nAccess code: ${data.code || '[check email]'}\n\nQuestions? Call 814-228-2822`,
  reminder_90: (data) => `PA CROP Services: Your PA annual report for ${data.entity || 'your entity'} is due in ~90 days. We'll keep you posted. Log in: pacropservices.com/portal`,
  reminder_30: (data) => `⚠️ PA CROP Services: Annual report due in 30 days for ${data.entity || 'your entity'}. ${data.filing ? 'We\'ll handle the filing — confirm details in your portal.' : 'File at file.dos.pa.gov ($7).'} Questions? 814-228-2822`,
  reminder_7: (data) => `🚨 URGENT — PA CROP Services: Annual report due in 7 DAYS for ${data.entity || 'your entity'}. ${data.filing ? 'We\'re filing for you. Confirm now: pacropservices.com/portal' : 'File TODAY at file.dos.pa.gov or call us: 814-228-2822'}`,
  renewal: (data) => `PA CROP Services: Your ${data.tier || ''} plan renews in ${data.days || '30'} days. No action needed — auto-renews. Questions? 814-228-2822`,
  entity_alert: (data) => `PA CROP Services: Status change detected for ${data.entity || 'your entity'}. New status: ${data.status || 'unknown'}. Log in: pacropservices.com/portal or call 814-228-2822`,
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) {
    if (_rateLimit(req, res, 3, 60000)) return;
  }

  const { to, message, type, data = {} } = req.body || {};
  if (!to) return res.status(400).json({ error: 'to (phone number) required' });

  const SMSIT_KEY = process.env.SMSIT_API_KEY || 'SMSIT_a1a5c935d1626fb1ad8d95de9455857d3225730e1b992f62c355c83158a4a7dc';
  const smsBody = message || (TEMPLATES[type] ? TEMPLATES[type](data) : null);
  if (!smsBody) return res.status(400).json({ error: 'message or valid type required' });

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
    return res.status(200).json({ success: true, sms_id: result?.data?.id, to, type: type || 'custom' });
  } catch (e) {
    console.error('SMS send error:', e.message);
    return res.status(502).json({ error: 'SMS delivery failed', detail: e.message });
  }
}
