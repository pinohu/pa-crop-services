// PA CROP Services — Real-Time Compliance Score Calculator
// POST /api/compliance-score { email } or { entityName, dosNumber }
// Calculates comprehensive compliance health score (0-100)

const _rl = new Map();
function _rateLimit(req, res, max, win) {
  const ip = (req.headers['x-forwarded-for']||'').split(',')[0].trim()||'unknown';
  const k = ip+':'+(req.url||'').split('?')[0]; const now = Date.now();
  let d = _rl.get(k); if(!d||now-d.s>win){_rl.set(k,{c:1,s:now});return false;}
  d.c++; if(d.c>max){res.setHeader('Retry-After',String(Math.ceil((d.s+win-now)/1000)));res.status(429).json({error:'Too many requests'});return true;} return false;
}

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (_rateLimit(req, res, 15, 60000)) return;

  const { email, entityName, dosNumber } = req.body || {};
  if (!email && !entityName) return res.status(400).json({ error: 'email or entityName required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;

  let score = 50; // Base score
  const factors = [];

  try {
    // Get client data from SuiteDash
    let clientData = null;
    if (email && SD_PUBLIC && SD_SECRET) {
      const sdRes = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
      });
      const contacts = (await sdRes.json())?.data || [];
      clientData = contacts[0] || null;
    }

    if (clientData) {
      const cf = clientData.custom_fields || {};
      
      // Factor: Has active CROP service
      if (cf.crop_plan) { score += 15; factors.push({ factor: 'Active CROP service', impact: +15, detail: `${cf.crop_plan} plan` }); }
      
      // Factor: Entity status known
      if (cf.entity_status === 'active') { score += 10; factors.push({ factor: 'Entity status: active', impact: +10 }); }
      else if (cf.entity_status) { score -= 10; factors.push({ factor: `Entity status: ${cf.entity_status}`, impact: -10 }); }
      
      // Factor: Onboarding complete
      if (cf.entity_name && cf.crop_plan) { score += 5; factors.push({ factor: 'Onboarding complete', impact: +5 }); }
      else { score -= 5; factors.push({ factor: 'Onboarding incomplete', impact: -5 }); }
      
      // Factor: Filing included
      if (cf.includes_filing === 'yes') { score += 10; factors.push({ factor: 'Annual report filing included', impact: +10 }); }
      
      // Factor: Last status check recency
      if (cf.last_status_check) {
        const daysSince = Math.floor((Date.now() - new Date(cf.last_status_check).getTime()) / 86400000);
        if (daysSince < 7) { score += 5; factors.push({ factor: 'Status checked within 7 days', impact: +5 }); }
        else if (daysSince > 30) { score -= 5; factors.push({ factor: `Status not checked in ${daysSince} days`, impact: -5 }); }
      }
      
      // Factor: Portal activity
      if (cf.last_portal_login) {
        const daysSince = Math.floor((Date.now() - new Date(cf.last_portal_login).getTime()) / 86400000);
        if (daysSince < 14) { score += 5; factors.push({ factor: 'Active portal user', impact: +5 }); }
        else if (daysSince > 60) { score -= 10; factors.push({ factor: `No portal login in ${daysSince} days`, impact: -10 }); }
      }
    } else {
      // No client record — lower base score
      score = 30;
      factors.push({ factor: 'No active CROP service', impact: -20 });
      factors.push({ factor: 'Entity not monitored', impact: -10 });
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));
    
    const level = score >= 80 ? 'good' : score >= 50 ? 'moderate' : 'at_risk';
    const recommendation = score >= 80 ? 'Your compliance posture is strong. Keep monitoring active.'
      : score >= 50 ? 'Some areas need attention. Log into your portal to review action items.'
      : 'Your entity may be at risk. Contact us at 814-228-2822 or get started at pacropservices.com/#pricing';

    return res.status(200).json({
      success: true,
      score, level, recommendation,
      factors,
      entity: entityName || clientData?.custom_fields?.entity_name || 'Unknown',
      calculated: new Date().toISOString()
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
