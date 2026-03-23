// PA CROP Services — Churn Prediction & Retention
// GET /api/churn-check (admin-key required)
// Analyzes all clients for churn risk, triggers retention campaigns

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  if (!SD_PUBLIC || !SD_SECRET) return res.status(500).json({ error: 'SuiteDash not configured' });

  const results = { at_risk: [], healthy: 0, total: 0 };

  try {
    const sdRes = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500&role=client', {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const clients = (await sdRes.json())?.data || [];
    results.total = clients.length;

    const now = new Date();
    for (const c of clients) {
      const since = c.custom_fields?.crop_since ? new Date(c.custom_fields.crop_since) : null;
      const daysSince = since ? Math.floor((now - since) / 86400000) : 999;
      const lastLogin = c.custom_fields?.last_portal_login ? new Date(c.custom_fields.last_portal_login) : null;
      const daysSinceLogin = lastLogin ? Math.floor((now - lastLogin) / 86400000) : 999;
      const tier = c.custom_fields?.crop_plan || 'unknown';

      // Churn risk scoring
      let risk = 0;
      if (daysSinceLogin > 60) risk += 3;
      else if (daysSinceLogin > 30) risk += 1;
      if (daysSince > 300 && daysSince < 400) risk += 2; // Approaching renewal
      if (!c.custom_fields?.entity_name) risk += 1; // Never completed onboarding

      if (risk >= 3) {
        results.at_risk.push({
          email: c.email,
          name: c.first_name || c.name,
          tier,
          risk_score: risk,
          days_since_login: daysSinceLogin,
          days_as_client: daysSince,
          reasons: [
            ...(daysSinceLogin > 60 ? ['No portal login in 60+ days'] : []),
            ...(daysSince > 300 ? ['Approaching renewal period'] : []),
            ...(!c.custom_fields?.entity_name ? ['Onboarding incomplete'] : []),
          ]
        });

        // Auto-trigger retention email
        const emailitKey = process.env.EMAILIT_API_KEY;
        if (emailitKey && risk >= 4) {
          await fetch('https://api.emailit.com/v1/emails', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'hello@pacropservices.com', to: c.email,
              subject: 'We noticed you haven\'t logged in recently',
              html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                <div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#0C1220">PA CROP Services</strong></div>
                <p>Hi ${c.first_name || 'there'},</p>
                <p>We noticed you haven't checked your compliance portal recently. Here's a quick update on your entity:</p>
                <div style="background:#FAF9F6;border:1px solid #EBE8E2;border-radius:12px;padding:20px;margin:16px 0">
                  <p style="margin:0"><strong>Entity:</strong> ${c.custom_fields?.entity_name || 'Check your portal'}<br>
                  <strong>Plan:</strong> ${tier}<br>
                  <strong>Status:</strong> We're actively monitoring your compliance</p>
                </div>
                <p>Your annual report deadlines, entity status, and any documents we've received are all waiting in your portal.</p>
                <p><a href="https://pacropservices.com/portal" style="background:#0C1220;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Log in to your portal →</a></p>
                <p style="margin-top:20px">Questions? Call <a href="tel:8142282822">814-228-2822</a> or reply to this email.</p>
              </div>`
            })
          }).catch(() => {});
        }
      } else {
        results.healthy++;
      }
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  return res.status(200).json({ success: true, ...results });
}
