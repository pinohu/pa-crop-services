import { setCors, authenticateRequest } from '../services/auth.js';
import { createLogger } from '../_log.js';

const log = createLogger('summarize-document');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const { text } = req.body || {};
  if (!text) return res.status(400).json({ success: false, error: 'Provide text to summarize' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(200).json({ success: true, summary: 'AI summarization requires Groq API key. Text received (' + text.length + ' chars).' });

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + GROQ_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a PA business compliance expert. Summarize the following document concisely, highlighting any compliance deadlines, obligations, or action items. Be brief and actionable.' },
          { role: 'user', content: text.slice(0, 4000) }
        ],
        max_tokens: 500, temperature: 0.3
      })
    });
    const d = await r.json();
    const summary = d.choices?.[0]?.message?.content || 'Could not generate summary.';
    return res.status(200).json({ success: true, summary });
  } catch (e) {
    log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
