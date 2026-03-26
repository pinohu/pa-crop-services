// PA CROP Services — Monthly Client Health Report Email
// GET /api/client-health-report?key=ADMIN&send=true
// Generates personalized compliance health report for each client, emails it

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('client-health-report');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const emailitKey = process.env.EMAILIT_API_KEY;
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const results = { sent: 0, skipped: 0, errors: 0 };

  try {
    const sdRes = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500&role=client', {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const clients = (await sdRes.json())?.data || [];

    for (const c of clients.slice(0, 50)) {
      if (!c.tags?.some(t => t.includes('crop-active'))) { results.skipped++; continue; }
      if (c.custom_fields?.pref_marketing === 'off') { results.skipped++; continue; }

      // Get compliance score
      let score = 50, level = 'moderate';
      try {
        const scoreRes = await fetch(`${baseUrl}/api/compliance-score`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: c.email })
        });
        const scoreData = await scoreRes.json();
        score = scoreData.score || 50;
        level = scoreData.level || 'moderate';
      } catch(e) {}

      const tier = c.custom_fields?.crop_plan || 'compliance';
      const entity = c.custom_fields?.entity_name || 'Your entity';
      const status = c.custom_fields?.entity_status || 'monitored';
      const scoreColor = score >= 80 ? '#6B8F71' : score >= 50 ? '#C9982A' : '#C44536';

      if (req.query?.send === 'true' && emailitKey) {
        try {
          await fetch('https://api.emailit.com/v1/emails', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'reports@pacropservices.com', to: c.email,
              subject: `Your Compliance Health Report — ${month}`,
              html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                <div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#0C1220">PA CROP Services</strong><span style="float:right;font-size:13px;color:#7A7A7A">${month} Report</span></div>
                <p>Hi ${c.first_name || 'there'},</p>
                <p>Here's your monthly compliance health summary for <strong>${entity}</strong>:</p>
                <div style="text-align:center;margin:24px 0">
                  <div style="display:inline-block;width:100px;height:100px;border-radius:50%;border:6px solid ${scoreColor};display:flex;align-items:center;justify-content:center;margin:0 auto">
                    <span style="font-size:36px;font-weight:700;color:${scoreColor}">${score}</span>
                  </div>
                  <p style="font-size:14px;color:#7A7A7A;margin-top:8px">Compliance Score: <strong style="color:${scoreColor}">${level.toUpperCase()}</strong></p>
                </div>
                <div style="background:#FAF9F6;border:1px solid #EBE8E2;border-radius:12px;padding:20px;margin:16px 0">
                  <p style="margin:0 0 8px"><strong>Entity:</strong> ${entity}</p>
                  <p style="margin:0 0 8px"><strong>Status:</strong> ${status}</p>
                  <p style="margin:0 0 8px"><strong>Plan:</strong> ${tier}</p>
                  <p style="margin:0"><strong>Documents this month:</strong> ${c.custom_fields?.document_count || '0'}</p>
                </div>
                <p><a href="https://pacropservices.com/portal" style="background:#0C1220;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">View full details →</a></p>
                <div style="border-top:1px solid #EBE8E2;padding-top:16px;margin-top:24px;font-size:12px;color:#7A7A7A;text-align:center">PA Registered Office Services, LLC · 924 W 23rd St, Erie, PA 16502</div>
              </div>`
            })
          });
          results.sent++;
        } catch(e) { results.errors++; }
      } else { results.skipped++; }
    }
  } catch(e) { log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' }); }

  return res.status(200).json({ success: true, month, ...results });
}
