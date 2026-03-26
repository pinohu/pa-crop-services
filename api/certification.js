import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';

const log = createLogger('certification');

// PA CROP Services — Compliance Certification Badge System
// POST /api/certification { email, action } actions: check|complete_lesson|award
// GET /api/certification?email=x (check status)
// Tracks course completion and awards "PA Compliance Certified" badge

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const blocked = await checkRateLimit(getClientIp(req), 'certification', 15, '60s');
  if (blocked) { res.setHeader('Retry-After', String(blocked.retryAfter)); return res.status(429).json({ success: false, error: 'Too many requests' }); }

  const email = req.query?.email || req.body?.email;
  if (!email) return res.status(400).json({ success: false, error: 'email required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  if (!SD_PUBLIC || !SD_SECRET) return res.status(500).json({ success: false, error: 'CRM not configured' });

  try {
    const sdRes = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const contact = ((await sdRes.json())?.data || [])[0];
    if (!contact) return res.status(404).json({ success: false, error: 'Client not found' });

    const progress = parseInt(contact.custom_fields?.course_progress || '0');
    const certified = contact.custom_fields?.certified === 'yes';
    const certDate = contact.custom_fields?.certified_date;

    if (req.method === 'GET') {
      return res.status(200).json({
        success: true, email,
        progress: `${progress}/5 lessons`,
        certified,
        certifiedDate: certDate || null,
        badgeUrl: certified ? `https://pacropservices.com/badge/${contact.custom_fields?.referral_code || 'certified'}` : null,
        embedCode: certified ? `<a href="https://pacropservices.com" target="_blank"><img src="https://pacropservices.com/badge-image.svg" alt="PA Compliance Certified" width="150"></a>` : null,
      });
    }

    // POST actions
    const { action, lessonId } = req.body || {};
    if (action === 'complete_lesson' && lessonId) {
      const newProgress = Math.min(5, Math.max(progress, lessonId));
      const updates = { course_progress: String(newProgress) };
      if (newProgress >= 5 && !certified) {
        updates.certified = 'yes';
        updates.certified_date = new Date().toISOString();
        // Send certification email
        const emailitKey = process.env.EMAILIT_API_KEY;
        if (emailitKey) {
          await fetch('https://api.emailit.com/v1/emails', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'hello@pacropservices.com', to: email,
              subject: '🎓 Congratulations — PA Compliance Certified!',
              html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;text-align:center">
                <div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:24px"><strong style="font-size:18px;color:#0C1220">PA CROP Services</strong></div>
                <div style="font-size:48px;margin:20px 0">🎓</div>
                <h2 style="color:#0C1220">You're PA Compliance Certified!</h2>
                <p style="color:#4A4A4A">You've completed all 5 lessons of the PA Business Compliance Essentials course.</p>
                <div style="background:#E8F0E9;border:1px solid #6B8F71;border-radius:12px;padding:20px;margin:20px 0">
                  <p style="margin:0;font-weight:700;color:#6B8F71">PA Compliance Certified</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#4A4A4A">Awarded ${new Date().toLocaleDateString()}</p>
                </div>
                <p style="font-size:14px;color:#4A4A4A">Add this badge to your website to show clients you take compliance seriously:</p>
                <code style="display:block;background:#FAF9F6;padding:12px;border-radius:8px;font-size:11px;word-break:break-all;text-align:left">&lt;a href="https://pacropservices.com"&gt;&lt;img src="https://pacropservices.com/badge-image.svg" alt="PA Compliance Certified" width="150"&gt;&lt;/a&gt;</code>
              </div>`
            })
          }).catch(e => log.warn('external_call_failed', { error: e.message }));
        }
      }
      await fetch(`https://app.suitedash.com/secure-api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_fields: updates })
      });
      return res.status(200).json({ success: true, progress: `${newProgress}/5`, newlyCertified: newProgress >= 5 && !certified });
    }

    return res.status(200).json({ success: true, progress: `${progress}/5`, certified });
  } catch(e) { log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' }); }
}
