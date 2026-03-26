// PA CROP Services — WhatsApp Business Messaging via Twilio
// POST /api/whatsapp { to, message, type, data }
// Uses Twilio WhatsApp API for compliance alerts + deadline reminders

const TEMPLATES = {
  welcome: (d) => `Welcome to PA CROP Services! Your portal is ready at pacropservices.com/portal\n\nAccess code: ${d.code || '[check email]'}\n\nQuestions? Call 814-228-2822`,
  deadline: (d) => `⚠️ PA CROP Services: Annual report for ${d.entity || 'your entity'} is due in ${d.days || '30'} days. Log in: pacropservices.com/portal`,
  alert: (d) => `🚨 PA CROP: Status change for ${d.entity || 'your entity'}: ${d.status || 'check portal'}. Details: pacropservices.com/portal`,
  document: (d) => `📄 PA CROP: New document received — ${d.type || 'document'}. ${d.urgency === 'critical' ? 'URGENT — check immediately.' : 'View in portal.'} pacropservices.com/portal`,
};

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('whatsapp');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { to, message, type, data = {} } = req.body || {};
  if (!to) return res.status(400).json({ success: false, error: 'to (phone) required' });

  const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const WA_FROM = 'whatsapp:+18142282822';

  if (!TWILIO_SID || !TWILIO_TOKEN) return res.status(500).json({ success: false, error: 'Twilio not configured' });

  const body = message || (TEMPLATES[type] ? TEMPLATES[type](data) : null);
  if (!body) return res.status(400).json({ success: false, error: 'message or valid type required' });

  const recipient = to.startsWith('whatsapp:') ? to : `whatsapp:${to.startsWith('+') ? to : '+1' + to.replace(/\D/g,'')}`;

  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: recipient, From: WA_FROM, Body: body })
    });
    const result = await r.json();
    return res.status(200).json({ success: true, sid: result?.sid, to: recipient });
  } catch(e) {
    log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(502).json({ success: false, error: 'internal_error' });
  }
}
