import { setCors } from './services/auth.js';

// PA CROP Services — Business License Verification
// POST /api/license-verify { entityName, county, licenseType }
// Checks business license requirements by municipality

const MUNICIPALITY_DATA = {
  'Philadelphia': { url: 'https://www.phila.gov/services/payments-assistance-taxes/business-taxes-702/', licenses: ['Business Income & Receipts Tax', 'Commercial Activity License'], required: true },
  'Pittsburgh': { url: 'https://pittsburghpa.gov/finance/business-privilege-tax', licenses: ['Business Privilege Tax', 'Occupation Tax'], required: true },
  'Erie': { url: 'https://www.erie.pa.us/Departments/Bureau-of-Taxation', licenses: ['Business Privilege Tax', 'Mercantile Tax'], required: true },
  'Allentown': { url: 'https://www.allentownpa.gov/', licenses: ['Business Privilege Tax'], required: true },
  'Harrisburg': { url: 'https://harrisburgpa.gov/', licenses: ['Business Privilege Tax', 'Mercantile License Tax'], required: true },
};

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  const { entityName, county, municipality } = req.body || {};
  const GROQ_KEY = process.env.GROQ_API_KEY;

  const cityData = municipality ? MUNICIPALITY_DATA[municipality] : null;
  let analysis = {};

  if (GROQ_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 300,
          messages: [
            { role: 'system', content: 'You verify PA business license requirements. Respond in JSON: {"state_licenses":["license type"],"local_licenses":["if applicable"],"industry_specific":["if applicable"],"verification_steps":["step1","step2"],"common_mistakes":["mistake1"],"resources":["url or reference"]}' },
            { role: 'user', content: `Business license requirements for: ${entityName || 'a PA business'}${county ? ' in ' + county + ' County' : ''}${municipality ? ', ' + municipality : ''}` }
          ]
        })
      });
      const text = (await r.json())?.choices?.[0]?.message?.content || '';
      try { analysis = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) {}
    } catch(e) {}
  }

  return res.status(200).json({ success: true, entityName, county, municipality, municipalData: cityData, analysis, availableMunicipalities: Object.keys(MUNICIPALITY_DATA) });
}
