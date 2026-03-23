// PA CROP Services — Win-Back Sequence for Churned Clients
// GET /api/winback?key=ADMIN
// Finds expired clients, sends escalating win-back: email → SMS → flag for AI call

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const emailitKey = process.env.EMAILIT_API_KEY;
  if (!SD_PUBLIC || !SD_SECRET) return res.status(500).json({ error: 'SuiteDash not configured' });

  const results = { day1_emails: 0, day7_sms: 0, day14_call_flags: 0, day30_removed: 0 };
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';

  try {
    const sdRes = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500&role=client', {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const clients = (await sdRes.json())?.data || [];

    for (const c of clients) {
      const since = c.custom_fields?.crop_since ? new Date(c.custom_fields.crop_since) : null;
      if (!since) continue;
      const expiryDate = new Date(since.getTime() + 365 * 86400000);
      const daysPastExpiry = Math.floor((new Date() - expiryDate) / 86400000);
      const isExpired = daysPastExpiry > 0;
      const winbackStage = c.custom_fields?.winback_stage || '0';

      if (!isExpired) continue;

      // Day 1: "We miss you" email
      if (daysPastExpiry >= 1 && daysPastExpiry < 7 && winbackStage === '0') {
        if (emailitKey) {
          await fetch('https://api.emailit.com/v1/emails', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'hello@pacropservices.com', to: c.email,
              subject: 'Your PA CROP Services plan has expired',
              html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                <div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#0C1220">PA CROP Services</strong></div>
                <p>Hi ${c.first_name || 'there'},</p>
                <p>Your compliance plan expired. Your entity monitoring, deadline reminders, and portal access are paused.</p>
                <p><strong>What this means:</strong> If your annual report deadline approaches, you won't get our 5-tier reminder sequence. If documents arrive at your registered office, scanning is paused.</p>
                <p><a href="https://pacropservices.com/#pricing" style="background:#C9982A;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Renew your plan →</a></p>
                <p style="font-size:13px;color:#7A7A7A">Or call 814-228-2822 — we'll get you back online in minutes.</p>
              </div>`
            })
          }).catch(() => {});
        }
        await updateWinback(c.id, '1', SD_PUBLIC, SD_SECRET);
        results.day1_emails++;
      }

      // Day 7: SMS with urgency
      else if (daysPastExpiry >= 7 && daysPastExpiry < 14 && winbackStage === '1') {
        const phone = c.phone || c.custom_fields?.phone;
        if (phone) {
          await fetch(`${baseUrl}/api/sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE' },
            body: JSON.stringify({ to: phone, message: `PA CROP Services: Your plan expired 7 days ago. Your entity compliance monitoring is paused. Renew now: pacropservices.com/#pricing or call 814-228-2822` })
          }).catch(() => {});
        }
        await updateWinback(c.id, '2', SD_PUBLIC, SD_SECRET);
        results.day7_sms++;
      }

      // Day 14: Flag for AI voice call
      else if (daysPastExpiry >= 14 && daysPastExpiry < 30 && winbackStage === '2') {
        await updateWinback(c.id, '3-call-needed', SD_PUBLIC, SD_SECRET);
        results.day14_call_flags++;
      }

      // Day 30: Remove from active
      else if (daysPastExpiry >= 30 && winbackStage !== 'removed') {
        await fetch(`https://app.suitedash.com/secure-api/contacts/${c.id}`, {
          method: 'PUT',
          headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: ['crop-expired', 'crop-churned'] })
        }).catch(() => {});
        await updateWinback(c.id, 'removed', SD_PUBLIC, SD_SECRET);
        results.day30_removed++;
      }
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  return res.status(200).json({ success: true, ...results });
}

async function updateWinback(contactId, stage, pub, sec) {
  try {
    await fetch(`https://app.suitedash.com/secure-api/contacts/${contactId}`, {
      method: 'PUT',
      headers: { 'X-Public-ID': pub, 'X-Secret-Key': sec, 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_fields: { winback_stage: stage, winback_updated: new Date().toISOString() } })
    });
  } catch (e) { /* continue */ }
}
