// PA CROP Services — Partner Performance Report Generator
// GET /api/partner-report?key=ADMIN&send=true
// Monthly: generates reports for all partners, optionally emails them

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_SECRET_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  if (!SD_PUBLIC || !SD_SECRET) return res.status(500).json({ error: 'SuiteDash not configured' });

  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const results = { partners: [], totalReports: 0 };

  try {
    const allContacts = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500', {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const contacts = (await allContacts.json())?.data || [];
    const partners = contacts.filter(c => c.tags?.some(t => t.includes('partner')));

    for (const p of partners) {
      const earnings = parseFloat(p.custom_fields?.referral_earnings || '0');
      const count = parseInt(p.custom_fields?.referral_count || '0');
      
      const report = {
        email: p.email,
        name: p.first_name || p.name || 'Partner',
        totalEarnings: earnings,
        totalReferrals: count,
      };
      results.partners.push(report);

      // Email report if requested
      if (req.query?.send === 'true' && count > 0) {
        const emailitKey = process.env.EMAILIT_API_KEY;
        if (emailitKey) {
          await fetch('https://api.emailit.com/v1/emails', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'partners@pacropservices.com', to: p.email,
              subject: `Partner Report — ${month}`,
              html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                <div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#0C1220">PA CROP Services — Partner Report</strong></div>
                <p>Hi ${report.name},</p>
                <p>Here's your partner performance summary for ${month}:</p>
                <div style="background:#FAF9F6;border:1px solid #EBE8E2;border-radius:12px;padding:20px;margin:16px 0">
                  <p style="margin:0 0 8px"><strong>Total Referrals:</strong> ${count}</p>
                  <p style="margin:0 0 8px"><strong>Total Earnings:</strong> $${earnings.toFixed(2)}</p>
                  <p style="margin:0"><strong>Your Referral Code:</strong> ${p.custom_fields?.referral_code || ''}</p>
                </div>
                <p>Thank you for partnering with us!</p>
              </div>`
            })
          }).catch(e => console.error('Silent failure:', e.message));
          results.totalReports++;
        }
      }
    }
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }

  return res.status(200).json({ success: true, month, ...results });
}
