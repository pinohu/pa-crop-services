// PA CROP Services — PA Legislative Monitoring
// GET /api/legislative-monitor?key=ADMIN
// Groq scans for PA legislation affecting business compliance

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('legislative-monitor');

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
        model: 'llama-3.3-70b-versatile', max_tokens: 800,
        messages: [
          { role: 'system', content: 'You monitor PA legislation affecting business entity compliance. Focus on: 15 Pa. C.S. (Associations Code), annual report requirements, CROP regulations, dissolution procedures, filing fees, entity formation rules. Respond in JSON: {"alerts":[{"bill":"bill number or topic","status":"introduced|committee|passed|signed","impact":"high|medium|low","summary":"1-2 sentences","action_for_clients":"what this means for PA business owners"}],"regulatory_updates":[{"agency":"PA DOS or other","update":"description","effective_date":"if known"}],"no_changes":true|false}' },
          { role: 'user', content: `Scan for PA legislation and regulatory changes affecting business entity compliance as of ${new Date().toLocaleDateString()}. Include any known upcoming changes to annual report requirements, CROP regulations, filing fees, or dissolution procedures.` }
        ]
      })
    });
    const text = (await groqRes.json())?.choices?.[0]?.message?.content || '';
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) { parsed = { no_changes: true, alerts: [] }; }

    return res.status(200).json({ success: true, generated: new Date().toISOString(), ...parsed, source: 'groq_analysis', note: 'For authoritative legislative info, check legis.state.pa.us' });
  } catch(e) { log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' }); }
}
