// PA CROP Services — /api/subscribe
// Newsletter / lead magnet email capture
// POST { email, source, tag }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, source, tag } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  const cleanEmail = email.toLowerCase().trim();

  // Acumbamail list 1267324 (All Clients / Leads)
  const ACUMBAMAIL_KEY = process.env.ACUMBAMAIL_API_KEY;
  const LIST_ID = '1267324';

  try {
    if (ACUMBAMAIL_KEY) {
      await fetch(`https://acumbamail.com/api/1/addSubscriber/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: ACUMBAMAIL_KEY,
          list_id: LIST_ID,
          email: cleanEmail,
          extra_fields: {
            SOURCE: source || 'website',
            TAG: tag || 'newsletter'
          }
        })
      }).catch(() => {});
    }

    // Fire n8n nurture sequence webhook
    await fetch('https://n8n.audreysplace.place/webhook/crop-lead-nurture-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, source: source || 'newsletter', tag, leadTier: 'warm' })
    }).catch(() => {});

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
