// PA CROP Services — Partner Dashboard API
// GET /api/partner-dashboard?email=partner@example.com
// Returns partner's referred clients, commissions, performance

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (_rateLimit(req, res, 10, 60000)) return;

  const email = req.query?.email;
  if (!email) return res.status(400).json({ error: 'email required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  if (!SD_PUBLIC || !SD_SECRET) return res.status(500).json({ error: 'CRM not configured' });

  try {
    // Find partner
    const sdSearch = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const contacts = (await sdSearch.json())?.data || [];
    const partner = contacts[0];
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    const isPartner = partner.tags?.some(t => t.includes('partner'));
    if (!isPartner) return res.status(403).json({ error: 'Not a registered partner' });

    const refCode = partner.custom_fields?.referral_code || '';
    const earnings = parseFloat(partner.custom_fields?.referral_earnings || '0');
    const count = parseInt(partner.custom_fields?.referral_count || '0');

    // Find referred clients
    const allClients = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500&role=client', {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const clients = (await allClients.json())?.data || [];
    const referred = clients.filter(c => c.custom_fields?.lead_source === refCode || c.tags?.some(t => t === `ref-${refCode}`));

    const referredSummary = referred.map(c => ({
      signupDate: c.custom_fields?.crop_since || '',
      tier: c.custom_fields?.crop_plan || 'compliance',
      active: c.tags?.some(t => t.includes('crop-active')) || false,
    }));

    return res.status(200).json({
      success: true,
      partner: { name: partner.first_name || partner.name, email: partner.email },
      referralCode: refCode,
      referralLink: `https://pacropservices.com?ref=${refCode}`,
      earnings: { total: earnings, count, average: count > 0 ? (earnings/count).toFixed(2) : '0' },
      referredClients: referredSummary,
      activeClients: referredSummary.filter(c => c.active).length,
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
