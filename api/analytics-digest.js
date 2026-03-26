// PA CROP Services — Website Analytics + Chatbot Analysis Digest
// GET /api/analytics-digest?key=ADMIN
// Analyzes chatbot conversations for insights, generates content recommendations

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

  const GROQ_KEY = process.env.GROQ_API_KEY;
  const results = { insights: [], recommendations: [], faq_candidates: [] };

  try {
    // Use Groq to analyze what topics PA business owners are searching for
    if (GROQ_KEY) {
      const analysisRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 800,
          messages: [
            { role: 'system', content: 'You analyze PA business compliance trends and generate content recommendations. Respond ONLY with JSON: {"trending_topics":["topic1","topic2"],"faq_candidates":[{"q":"question","a":"short answer"}],"content_gaps":["gap1","gap2"],"seasonal_recommendation":"text"}' },
            { role: 'user', content: `Today is ${new Date().toLocaleDateString()}. Current month: ${new Date().toLocaleDateString('en-US',{month:'long'})}. Analyze what PA business owners are likely searching for right now regarding: annual report filing, CROP services, entity compliance, dissolution risks, registered office requirements. Consider seasonal factors (tax season, year-end, new filings).` }
          ]
        })
      });
      const analysisData = await analysisRes.json();
      const text = analysisData?.choices?.[0]?.message?.content || '';
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        results.trending_topics = parsed.trending_topics || [];
        results.faq_candidates = parsed.faq_candidates || [];
        results.content_gaps = parsed.content_gaps || [];
        results.seasonal_recommendation = parsed.seasonal_recommendation || '';
      } catch (e) { results.parse_error = 'Could not parse Groq response'; }
    }

    // Generate article topic recommendations based on analysis
    results.recommended_articles = (results.trending_topics || []).slice(0, 3).map(topic => ({
      topic,
      action: `Call /api/auto-article with topic="${topic}"`,
    }));

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  return res.status(200).json({ success: true, generated: new Date().toISOString(), ...results });
}
