// PA CROP Services — Upsell Engine
// POST /api/upsell { email } or GET /api/upsell?key=ADMIN (batch)
// Analyzes client behavior and sends tier upgrade suggestions

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  if (adminKey !== (process.env.ADMIN_SECRET_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!SD_PUBLIC || !SD_SECRET) return res.status(500).json({ error: 'SuiteDash not configured' });

  const results = { opportunities: [], total_checked: 0 };

  try {
    const sdRes = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500&role=client', {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const clients = (await sdRes.json())?.data || [];
    
    const UPGRADE_MAP = {
      compliance: { next: 'starter', reason: 'You\'re on Compliance Only — upgrade to Starter and get a domain, 5 email accounts, and website hosting included. Just $100/yr more.', price_diff: '$100/yr' },
      starter: { next: 'pro', reason: 'You\'re on Business Starter — upgrade to Pro and we\'ll handle your annual report filing for you, plus unlimited email and a direct phone line. Just $150/yr more.', price_diff: '$150/yr' },
      pro: { next: 'empire', reason: 'You\'re on Business Pro — upgrade to Empire for dedicated VPS hosting, multi-entity management, and 2 free notarizations per year.', price_diff: '$350/yr' },
    };

    for (const c of clients) {
      const tier = c.custom_fields?.crop_plan || 'compliance';
      const daysSince = c.custom_fields?.crop_since ? Math.floor((new Date() - new Date(c.custom_fields.crop_since)) / 86400000) : 0;
      const upgrade = UPGRADE_MAP[tier];
      
      if (!upgrade) continue; // Already on Empire
      if (daysSince < 30) continue; // Too early to upsell
      
      results.total_checked++;
      
      // Check signals
      let score = 0;
      if (daysSince > 90) score += 1; // Established client
      if (tier === 'compliance' && daysSince > 180) score += 2; // Long time on basic
      
      if (score >= 2) {
        results.opportunities.push({
          email: c.email,
          name: c.first_name || c.name,
          current_tier: tier,
          suggested_tier: upgrade.next,
          price_diff: upgrade.price_diff,
          reason: upgrade.reason,
          days_as_client: daysSince
        });
      }
    }

    // Send upsell emails for top opportunities
    const emailitKey = process.env.EMAILIT_API_KEY;
    const sendEmails = req.query?.send === 'true' || req.body?.send === true;
    
    if (sendEmails && emailitKey) {
      for (const opp of results.opportunities.slice(0, 10)) {
        await fetch('https://api.emailit.com/v1/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'hello@pacropservices.com', to: opp.email,
            subject: `Unlock more for your PA entity — ${opp.price_diff} upgrade`,
            html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#0C1220">PA CROP Services</strong></div>
              <p>Hi ${opp.name || 'there'},</p>
              <p>${opp.reason}</p>
              <p><a href="https://pacropservices.com/#pricing" style="background:#C9982A;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">See upgrade options →</a></p>
              <p style="font-size:13px;color:#7A7A7A">Call us at 814-228-2822 to upgrade — we'll handle the switch immediately.</p>
            </div>`
          })
        }).catch(e => console.error('Silent failure:', e.message));
      }
      results.emails_sent = Math.min(results.opportunities.length, 10);
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  return res.status(200).json({ success: true, ...results });
}
