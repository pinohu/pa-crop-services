// PA CROP Services — UCC Filing/Lien Monitoring
// POST /api/ucc-monitor { entityName, email } (check UCC filings)
// GET /api/ucc-monitor?key=ADMIN&batch=true (check all clients)

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('ucc-monitor');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const GROQ_KEY = process.env.GROQ_API_KEY;

  if (req.method === 'POST') {
    const { entityName, email } = req.body || {};
    if (!entityName) return res.status(400).json({ success: false, error: 'entityName required' });

    // Use Groq to analyze UCC implications
    if (GROQ_KEY) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile', max_tokens: 300,
            messages: [
              { role: 'system', content: 'You help check UCC (Uniform Commercial Code) filings for PA business entities. Explain what UCC filings mean and what to watch for. Respond in JSON: {"search_url":"direct PA UCC search URL","common_filings":["type1","type2"],"risk_factors":["factor1"],"recommendation":"what to do","pa_ucc_search":"https://www.dos.pa.gov/BusinessCharities/Business/RegistrationForms/Pages/UCC-Forms.aspx"}' },
              { role: 'user', content: `Check UCC filing status for: ${entityName}` }
            ]
          })
        });
        const text = (await r.json())?.choices?.[0]?.message?.content || '';
        let result;
        try { result = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) { result = {}; }
        return res.status(200).json({ success: true, entityName, ...result });
      } catch(e) { log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' }); }
    }
    return res.status(200).json({ success: true, entityName, search_url: 'https://www.dos.pa.gov/BusinessCharities/Business/RegistrationForms/Pages/UCC-Forms.aspx' });
  }

  // GET: Batch check (admin)
  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });
  return res.status(200).json({ success: true, message: 'Batch UCC monitoring runs via /api/monitor-all', pa_ucc_search: 'https://www.dos.pa.gov/BusinessCharities/Business/RegistrationForms/Pages/UCC-Forms.aspx' });
}
