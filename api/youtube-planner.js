// PA CROP Services — YouTube Channel Content Planner
// GET /api/youtube-planner?key=ADMIN&weeks=4
// Generates a content calendar for a faceless compliance YouTube channel

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) return res.status(401).json({ error: 'Unauthorized' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  const weeks = parseInt(req.query?.weeks || '4');

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', max_tokens: 1200,
        messages: [
          { role: 'system', content: `Plan ${weeks} weeks of YouTube content for a PA compliance faceless channel. 2 videos/week. Mix short-form (60s) and long-form (5-10min). Respond ONLY with JSON: {"channel_name":"suggested name","schedule":[{"week":1,"day":"Monday|Thursday","title":"title","format":"short|long","topic":"topic","hook":"first 5 seconds","keywords":["kw1","kw2"],"estimated_views":"range"}],"strategy_notes":"brief strategy"}` },
          { role: 'user', content: `Plan ${weeks} weeks of YouTube content starting ${new Date().toLocaleDateString()}. Focus on PA compliance, annual reports, CROP services, dissolution prevention. Consider seasonal relevance.` }
        ]
      })
    });
    const text = (await groqRes.json())?.choices?.[0]?.message?.content || '';
    let plan;
    try { plan = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) {
      return res.status(500).json({ error: 'Plan generation failed' });
    }
    return res.status(200).json({ success: true, weeks, ...plan });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}
