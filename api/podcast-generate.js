// PA CROP Services — Podcast Episode Generator
// POST /api/podcast-generate { articleTitle, articleContent }
// Generates podcast script (2-host conversational format) from article

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('podcast-generate');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { articleTitle, articleContent } = req.body || {};
  if (!articleTitle) return res.status(400).json({ success: false, error: 'articleTitle required' });
  const GROQ_KEY = process.env.GROQ_API_KEY;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', max_tokens: 1500,
        messages: [
          { role: 'system', content: 'Create a 5-minute podcast script in conversational 2-host format for a PA compliance podcast. Host A is knowledgeable, Host B asks good questions. Respond in JSON: {"episode_title":"title","episode_number":"auto","duration_minutes":5,"intro":"podcast intro (10 sec)","segments":[{"speaker":"A|B","text":"what they say"}],"outro":"closing + CTA","show_notes":"2-3 bullet points","castmagic_ready":true}' },
          { role: 'user', content: `Convert this article into a podcast episode:\n\nTitle: ${articleTitle}\nContent: ${(articleContent || '').slice(0, 2000)}` }
        ]
      })
    });
    const text = (await groqRes.json())?.choices?.[0]?.message?.content || '';
    let episode;
    try { episode = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) {
      return res.status(500).json({ success: false, error: 'Podcast generation failed' });
    }
    return res.status(200).json({ success: true, ...episode, tool_instructions: { castmagic: 'Import script to Castmagic for AI voice generation', manual: 'Record using segments as script' } });
  } catch(e) { log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' }); }
}
