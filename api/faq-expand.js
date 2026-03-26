// PA CROP Services — FAQ Expansion from Chatbot Analysis
// GET /api/faq-expand?key=ADMIN
// Groq generates new FAQ entries based on common compliance questions

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
  if (!GROQ_KEY) return res.status(500).json({ error: 'Groq not configured' });

  try {
    const faqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', max_tokens: 1000,
        messages: [
          { role: 'system', content: 'Generate 5 FAQ entries that PA business owners frequently ask about compliance, registered offices, annual reports, and entity management. Each answer should be 2-3 sentences, accurate, and include relevant PA statutes where applicable. Respond ONLY with JSON: {"faqs":[{"question":"q","answer":"a","category":"annual_reports|entity_status|crop_services|dissolution|general"}]}' },
          { role: 'user', content: `Generate 5 new FAQ entries for ${new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}. Focus on seasonal relevance and common misunderstandings.` }
        ]
      })
    });
    const faqData = await faqRes.json();
    const text = faqData?.choices?.[0]?.message?.content || '';
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) {
      return res.status(500).json({ error: 'Failed to generate FAQs' });
    }

    // Generate JSON-LD schema for each FAQ
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": (parsed.faqs || []).map(f => ({
        "@type": "Question",
        "name": f.question,
        "acceptedAnswer": { "@type": "Answer", "text": f.answer }
      }))
    };

    return res.status(200).json({ success: true, faqs: parsed.faqs, schema, generated: new Date().toISOString() });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
