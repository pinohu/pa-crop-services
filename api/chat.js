// PA CROP Services — AI Compliance Chatbot
// POST /api/chat { message, sessionId?, clientTier? }
// RAG-powered assistant using Groq for PA compliance questions

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, sessionId, clientTier, entityName, history = [] } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });

  const GROQ_KEY = process.env.GROQ_API_KEY || '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';

  const systemPrompt = `You are the PA CROP Services AI Compliance Assistant. You help Pennsylvania business owners understand their registered office obligations, annual report requirements, and entity compliance.

CRITICAL KNOWLEDGE BASE:
- Every PA LLC, corporation, and LP must maintain a registered office address under 15 Pa. C.S. § 108
- A Commercial Registered Office Provider (CROP) is licensed under 15 Pa. C.S. § 109
- PA annual reports are due September 30 each year (decennial reports for LPs/LLPs)
- Filing fee: $7 online at file.dos.pa.gov, $70 on paper
- Late/missed annual reports → administrative dissolution after Dec 31, 2027
- Foreign entities dissolved in PA CANNOT reinstate — must re-register as new entity
- To change registered office: file DSCB:15-108 ($5 fee)
- PA CROP Services address: 924 W 23rd St, Erie, PA 16502
- Plans: Compliance Only ($99/yr), Business Starter ($199/yr), Business Pro ($349/yr), Business Empire ($699/yr)
- Business Pro and Empire include annual report filing
- All plans include same-day document scanning, portal access, annual report reminders

RESPONSE RULES:
- Be concise and direct — 2-3 paragraphs max
- Cite specific PA statutes when relevant (15 Pa. C.S. §)
- If the question is outside PA compliance (tax, legal advice, litigation), say you can't advise on that and suggest consulting a CPA or attorney
- Always mention relevant PA CROP Services features when naturally appropriate
- If the client has an entity name, personalize responses
- Suggest upgrading when the question relates to a service in a higher tier
${entityName ? `\nThe client's entity is: ${entityName}` : ''}
${clientTier ? `\nTheir current plan: ${clientTier}` : ''}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.3,
        max_tokens: 800,
        stream: false
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq error:', groqRes.status, errText);
      return res.status(502).json({ error: 'AI service temporarily unavailable' });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || 'I apologize, I was unable to process that question. Please try again.';

    return res.status(200).json({
      success: true,
      reply,
      model: data.model,
      usage: data.usage
    });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
