// PA CROP Services — Chatbot Conversation Analytics
// GET /api/chatbot-analytics?key=ADMIN
// Groq analyzes chatbot usage patterns and generates insights

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('chatbot-analytics');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ success: false, error: 'Groq not configured' });

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
  } catch(e) { log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' }); }
}
