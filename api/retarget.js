// PA CROP Services — Lead Retargeting Drip Trigger
// POST /api/retarget { email, name, riskScore, source }
// Adds lead to Acumbamail retargeting sequence (4-email drip)
// Called by /api/intake and /api/qualify-lead for unconverted leads

const _rl = new Map();
function _rateLimit(req, res, max, win) {
  const ip = (req.headers['x-forwarded-for']||'').split(',')[0].trim()||'unknown';
  const k = ip+':'+(req.url||'').split('?')[0]; const now = Date.now();
  let d = _rl.get(k); if (!d||now-d.s>win){_rl.set(k,{c:1,s:now});return false;}
  d.c++; if(d.c>max){res.setHeader('Retry-After',String(Math.ceil((d.s+win-now)/1000)));res.status(429).json({error:'Too many requests'});return true;} return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (_rateLimit(req, res, 10, 60000)) return;

  const { email, name, riskScore, source } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  const acuKey = process.env.ACUMBAMAIL_API_KEY;
  const RETARGET_LIST = '1267325'; // Acumbamail retargeting list

  try {
    // Add to retargeting list with merge fields for personalization
    await fetch('https://acumbamail.com/api/1/addSubscriber/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: acuKey,
        list_id: RETARGET_LIST,
        email,
        merge_fields: {
          NAME: name || '',
          RISK: riskScore || '',
          SOURCE: source || 'website',
          SIGNUP_DATE: new Date().toISOString().split('T')[0]
        },
        response_type: 'json'
      })
    });

    // Also trigger n8n for immediate Day-1 email
    await fetch('https://n8n.audreysplace.place/webhook/crop-retarget-start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, riskScore, source, day: 1 })
    }).catch(() => {});

    return res.status(200).json({ success: true, message: 'Added to retargeting sequence', email });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
