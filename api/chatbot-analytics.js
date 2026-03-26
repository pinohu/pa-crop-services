// PA CROP Services — Chatbot Conversation Analytics
// GET /api/chatbot-analytics?key=ADMIN
// Groq analyzes chatbot usage patterns and generates insights

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_SECRET_KEY)) return res.status(401).json({ error: 'Unauthorized' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'Groq not configured' });

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', max_tokens: 600,
        messages: [
          { role: 'system', content: 'You analyze chatbot usage for a PA compliance service. Generate insights about what PA business owners ask about most. Respond in JSON: {"top_topics":[{"topic":"name","estimated_frequency":"high|medium|low","content_opportunity":"article or FAQ idea"}],"sentiment":"positive|neutral|negative","unanswered_patterns":["questions the chatbot might struggle with"],"recommendations":["actionable recommendation"]}' },
          { role: 'user', content: `Generate chatbot analytics insights for a PA CROP service in ${new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}. Consider seasonal patterns (annual report deadlines, tax season, year-end compliance) and common compliance questions.` }
        ]
      })
    });
    const text = (await groqRes.json())?.choices?.[0]?.message?.content || '';
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) { parsed = { top_topics: [], recommendations: [] }; }

    return res.status(200).json({ success: true, generated: new Date().toISOString(), ...parsed });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}
