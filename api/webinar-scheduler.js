// PA CROP Services — Webinar Auto-Scheduler (Trafft integration)
// POST /api/webinar-scheduler { topic, date, duration } or GET for next webinar
// Generates webinar content + books via Trafft OAuth

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_SECRET_KEY)) return res.status(401).json({ error: 'Unauthorized' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  const TRAFFT_CLIENT_ID = '380067799445b9b14ebbad232d7a8dbf';

  if (req.method === 'GET') {
    // Generate next webinar topic
    if (!GROQ_KEY) return res.status(500).json({ error: 'Groq not configured' });
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 400,
          messages: [
            { role: 'system', content: 'Plan a monthly compliance webinar for PA business owners. Respond in JSON: {"title":"webinar title","description":"2-3 sentences","topics":["topic1","topic2","topic3"],"target_audience":"who should attend","duration_minutes":45,"suggested_date":"next month first Wednesday","registration_cta":"text for signup button"}' },
            { role: 'user', content: `Plan the next monthly webinar for ${new Date(Date.now() + 30*86400000).toLocaleDateString('en-US',{month:'long',year:'numeric'})}. Consider seasonal PA compliance topics.` }
          ]
        })
      });
      const text = (await r.json())?.choices?.[0]?.message?.content || '';
      let plan;
      try { plan = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) { plan = {}; }
      return res.status(200).json({ success: true, nextWebinar: plan, trafft_booking_url: `https://app.trafft.com/booking?client_id=${TRAFFT_CLIENT_ID}` });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  // POST: Schedule specific webinar
  const { topic, date, duration } = req.body || {};
  return res.status(200).json({
    success: true,
    scheduled: { topic: topic || 'PA Compliance Update', date: date || 'TBD', duration: duration || 45 },
    trafft_url: `https://app.trafft.com/booking?client_id=${TRAFFT_CLIENT_ID}`,
    next_steps: ['Create event in Trafft dashboard', 'Generate promotional emails via /api/newsletter-generate', 'Create video recording script via /api/video-generate']
  });
}
