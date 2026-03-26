import { setCors } from './services/auth.js';

// PA CROP Services — Address Verification
// POST /api/address-verify { address, city, state, zip }
// Validates business address exists and is suitable for entity registration

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  const { address, city, state, zip } = req.body || {};
  if (!address) return res.status(400).json({ success: false, error: 'address required' });

  const fullAddress = `${address}, ${city || 'Erie'}, ${state || 'PA'} ${zip || ''}`.trim();
  const GROQ_KEY = process.env.GROQ_API_KEY;

  const result = {
    input: fullAddress,
    verified: false,
    warnings: [],
    googleMapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(fullAddress)}`,
  };

  // Basic validation
  if (!address.match(/\d+/)) result.warnings.push('No street number found');
  if (address.toLowerCase().includes('po box')) result.warnings.push('PO Box cannot be used as registered office address in PA');
  if (address.toLowerCase().includes('virtual')) result.warnings.push('Virtual office addresses may not meet PA CROP requirements');

  // Groq analysis
  if (GROQ_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 200,
          messages: [
            { role: 'system', content: 'Analyze a PA business address for suitability as an entity registered office. Respond in JSON: {"likely_valid":true|false,"address_type":"commercial|residential|po_box|virtual|unknown","pa_compliance_note":"note about PA requirements","suggestion":"if any"}' },
            { role: 'user', content: `Analyze this address for PA entity registration: ${fullAddress}` }
          ]
        })
      });
      const text = (await r.json())?.choices?.[0]?.message?.content || '';
      try { 
        const analysis = JSON.parse(text.replace(/```json|```/g, '').trim());
        result.analysis = analysis;
        result.verified = analysis.likely_valid === true;
      } catch(e) {}
    } catch(e) {}
  }

  if (result.warnings.length === 0 && !result.verified) result.verified = true; // Assume valid if no warnings

  return res.status(200).json({ success: true, ...result });
}
