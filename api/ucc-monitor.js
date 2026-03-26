// PA CROP Services — UCC Filing/Lien Monitoring
// POST /api/ucc-monitor { entityName, email } (check UCC filings)
// GET /api/ucc-monitor?key=ADMIN&batch=true (check all clients)

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'];
  const GROQ_KEY = process.env.GROQ_API_KEY;

  if (req.method === 'POST') {
    const { entityName, email } = req.body || {};
    if (!entityName) return res.status(400).json({ error: 'entityName required' });

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
      } catch(e) { return res.status(500).json({ error: e.message }); }
    }
    return res.status(200).json({ success: true, entityName, search_url: 'https://www.dos.pa.gov/BusinessCharities/Business/RegistrationForms/Pages/UCC-Forms.aspx' });
  }

  // GET: Batch check (admin)
  if (adminKey !== (process.env.ADMIN_SECRET_KEY)) return res.status(401).json({ error: 'Unauthorized' });
  return res.status(200).json({ success: true, message: 'Batch UCC monitoring runs via /api/monitor-all', pa_ucc_search: 'https://www.dos.pa.gov/BusinessCharities/Business/RegistrationForms/Pages/UCC-Forms.aspx' });
}
