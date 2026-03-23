// PA CROP Services — Co-Branded Partner Landing Page Generator
// POST /api/partner-landing { partnerName, partnerLogo, partnerEmail, partnerPhone, refCode }
// Generates unique landing page URL for partner referrals

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) return res.status(401).json({ error: 'Unauthorized' });

  const { partnerName, partnerEmail, partnerPhone, refCode, specialization } = req.body || {};
  if (!partnerName || !refCode) return res.status(400).json({ error: 'partnerName and refCode required' });

  const slug = partnerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const landingUrl = `https://pacropservices.com?ref=${refCode}&partner=${slug}`;

  // Generate co-branded page content
  const GROQ_KEY = process.env.GROQ_API_KEY;
  let customIntro = '';
  if (GROQ_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 200,
          messages: [
            { role: 'system', content: 'Write a 2-sentence intro for a co-branded landing page between a PA CROP service and a referring partner. Professional and warm.' },
            { role: 'user', content: `PA CROP Services is partnered with ${partnerName}${specialization ? ` (${specialization})` : ''} to offer compliance services to their clients.` }
          ]
        })
      });
      customIntro = (await groqRes.json())?.choices?.[0]?.message?.content || '';
    } catch(e) {}
  }

  return res.status(200).json({
    success: true,
    landingUrl,
    partnerSlug: slug,
    refCode,
    customIntro,
    embedCode: `<a href="${landingUrl}" style="background:#0C1220;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Get PA CROP Services →</a>`,
    trackingParams: `?ref=${refCode}&partner=${slug}&utm_source=partner&utm_medium=referral&utm_campaign=${slug}`
  });
}
