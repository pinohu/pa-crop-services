// PA CROP Services — Email service module
// Consolidates ~28 duplicated Emailit POST blocks across the codebase.
//
// Two send shapes are exposed:
//   sendEmail({ to, subject, html, from? }) — raw delivery; no template.
//   sendBranded({ to, subject, body, from?, ctaUrl?, ctaLabel? }) — wraps body
//                in the standard PA CROP HTML shell (footer + UPL disclaimer).
//   notifyOps(subject, htmlBody) — sends to hello@pacropservices.com from
//                alerts@; replaces the _notifyIke helpers duplicated in 5+ files.
//
// All calls fail gracefully if EMAILIT_API_KEY is missing — they log a warning
// and return { sent: false, reason: 'emailit_not_configured' } rather than
// throwing. Callers that depend on actual delivery should check the result.

import { fetchWithTimeout } from '../_fetch.js';
import { logWarn, logError } from '../_log.js';

const EMAILIT_ENDPOINT = 'https://api.emailit.com/v1/emails';

const DEFAULT_FROM = 'hello@pacropservices.com';
const ALERTS_FROM = 'alerts@pacropservices.com';
const OPS_TO = 'hello@pacropservices.com';

function escHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function isConfigured() {
  return !!process.env.EMAILIT_API_KEY;
}

/**
 * Low-level send. Returns { sent: boolean, status?, reason?, error? }.
 * Never throws.
 */
export async function sendEmail({ to, subject, html, from }) {
  const key = process.env.EMAILIT_API_KEY;
  if (!key) {
    logWarn('emailit_not_configured', { subject });
    return { sent: false, reason: 'emailit_not_configured' };
  }
  if (!to || !subject || !html) {
    return { sent: false, reason: 'missing_fields' };
  }
  try {
    const res = await fetchWithTimeout(EMAILIT_ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: from || DEFAULT_FROM, to, subject, html })
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logError('emailit_send_failed', { subject, status: res.status, detail: detail.slice(0, 200) });
      return { sent: false, status: res.status, reason: 'delivery_failed' };
    }
    return { sent: true, status: res.status };
  } catch (err) {
    logError('emailit_request_failed', { subject }, err);
    return { sent: false, reason: 'request_failed', error: err.message };
  }
}

/**
 * Send a body wrapped in the standard PA CROP branded shell. `body` may be raw
 * HTML or plain text (newlines become <br>). Optionally include a CTA button.
 */
export async function sendBranded({ to, subject, body, from, ctaUrl, ctaLabel }) {
  const isHtml = typeof body === 'string' && body.includes('<');
  const safeBody = isHtml ? body : escHtml(body || '').replace(/\n/g, '<br>');
  const html = `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1C1C1C;line-height:1.7;font-size:15px">
  <div style="border-bottom:3px solid #C9982A;padding-bottom:16px;margin-bottom:24px">
    <strong style="font-size:18px;color:#0C1220">PA CROP Services</strong>
  </div>
  <div>${safeBody}</div>
  ${ctaUrl ? `<p style="margin:24px 0"><a href="${escHtml(ctaUrl)}" style="display:inline-block;background:#0C1220;color:#fff;padding:12px 22px;border-radius:9999px;font-weight:600;text-decoration:none">${escHtml(ctaLabel || 'Open')}</a></p>` : ''}
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #EBE8E2;font-size:12px;color:#7A7A7A">
    PA Registered Office Services, LLC &middot; 924 W 23rd St, Erie, PA 16502 &middot; 814-228-2822<br>
    PA CROP Services is not a law firm and does not provide legal advice. For legal questions, consult a Pennsylvania-licensed attorney; for tax questions, consult a CPA.
  </div>
</div>`;
  return sendEmail({ to, subject, html, from });
}

/**
 * Send an internal ops/Ike notification. Equivalent to the _notifyIke helpers
 * duplicated in stripe-webhook.js, admin/index.js, voice-recording.js,
 * partner-intake.js, mail-process.js etc.
 */
export async function notifyOps(subject, body) {
  return sendEmail({
    from: ALERTS_FROM,
    to: OPS_TO,
    subject: '[PA CROP] ' + subject,
    html: '<div style="font-family:sans-serif;max-width:600px">' + body + '</div>'
  });
}

export { escHtml };
