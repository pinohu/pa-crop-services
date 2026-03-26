// PA CROP Services — YouTube Channel Content Planner
// GET /api/youtube-planner?key=ADMIN&weeks=4
// Generates a content calendar for a faceless compliance YouTube channel

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('youtube-planner');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

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
      return res.status(500).json({ success: false, error: 'Plan generation failed' });
    }
    return res.status(200).json({ success: true, weeks, ...plan });
  } catch(e) { log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' }); }
}
