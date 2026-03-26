// PA CROP Services — Court Docket Monitoring (PA + Federal)
// POST /api/court-monitor { entityName, email } (check for cases)
// Groq-assisted search + direct links to PACER and PA courts

import { authenticateRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  const adminKey = req.headers['x-admin-key'];
  const isAdmin = adminKey === (process.env.ADMIN_SECRET_KEY);
  const session = !isAdmin ? await authenticateRequest(req) : { valid: true };
  if (!isAdmin && !session.valid) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { entityName, county } = req.body || {};
  if (!entityName) return res.status(400).json({ success: false, error: 'entityName required' });
  const GROQ_KEY = process.env.GROQ_API_KEY;

  const searchLinks = {
    pacer: `https://pacer.uscourts.gov/`, 
    pa_courts: `https://ujsportal.pacourts.us/CaseSearch`,
    pa_western: `https://www.pawd.uscourts.gov/`,
    pa_middle: `https://www.pamd.uscourts.gov/`,
    pa_eastern: `https://www.paed.uscourts.gov/`,
  };

  let analysis = {};
  if (GROQ_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 300,
          messages: [
            { role: 'system', content: 'Provide guidance on checking court dockets for a PA business entity. Include which courts to check and what to look for. Respond in JSON: {"courts_to_check":["court name"],"what_to_look_for":["item"],"service_of_process_note":"how this relates to CROP service","monitoring_recommendation":"recommendation"}' },
            { role: 'user', content: `Guide on monitoring court dockets for: ${entityName}${county ? ' in ' + county + ' County' : ''}, PA` }
          ]
        })
      });
      const text = (await r.json())?.choices?.[0]?.message?.content || '';
      try { analysis = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) {}
    } catch(e) {}
  }

  return res.status(200).json({ success: true, entityName, searchLinks, analysis, note: 'PACER access requires separate account. PA UJS Portal is free for basic searches.' });
}
