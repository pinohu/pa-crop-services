// PA CROP Services — Automated Review Request
// GET /api/review-request?key=ADMIN (batch — sends to eligible clients)
// Requests Google reviews from clients 60+ days in, good standing

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('review-request');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const emailitKey = process.env.EMAILIT_API_KEY;
  if (!SD_PUBLIC || !SD_SECRET || !emailitKey) return res.status(500).json({ success: false, error: 'Missing config' });

  const results = { sent: 0, skipped: 0 };
  try {
    const sdRes = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500&role=client', {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const clients = (await sdRes.json())?.data || [];

    for (const c of clients) {
      const since = c.custom_fields?.crop_since ? new Date(c.custom_fields.crop_since) : null;
      const daysSince = since ? Math.floor((new Date() - since) / 86400000) : 0;
      const reviewSent = c.custom_fields?.review_requested === 'yes';

      if (daysSince >= 60 && daysSince <= 90 && !reviewSent) {
        await fetch('https://api.emailit.com/v1/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'hello@pacropservices.com', to: c.email,
            subject: 'How are we doing? (30-second review)',
            html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#0C1220">PA CROP Services</strong></div>
              <p>Hi ${c.first_name || 'there'},</p>
              <p>You've been with us for about 2 months now. We'd love to know how we're doing.</p>
              <p>If you've had a good experience, a quick Google review would mean the world to our small team:</p>
              <p><a href="https://g.page/r/pacropservices/review" style="background:#0C1220;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;font-size:16px">⭐ Leave a quick review</a></p>
              <p style="font-size:13px;color:#7A7A7A;margin-top:16px">It takes about 30 seconds and helps other PA business owners find us. Thank you!</p>
            </div>`
          })
        }).catch(e => log.warn('external_call_failed', { error: e.message }));

        // Mark as sent in SuiteDash
        if (c.id) {
          await fetch(`https://app.suitedash.com/secure-api/contacts/${c.id}`, {
            method: 'PUT',
            headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
            body: JSON.stringify({ custom_fields: { review_requested: 'yes', review_requested_date: new Date().toISOString() } })
          }).catch(e => log.warn('external_call_failed', { error: e.message }));
        }
        results.sent++;
      } else {
        results.skipped++;
      }
    }
  } catch (e) {
    log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' });
  }

  return res.status(200).json({ success: true, ...results });
}
