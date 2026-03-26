// PA CROP Services — Client Self-Service Tier Upgrade
// POST /api/client-upgrade { email, currentTier, targetTier }
// Generates Stripe upgrade checkout link, provisions additional features

const TIER_PRICES = { compliance: 9900, starter: 19900, pro: 34900, empire: 69900 };
const STRIPE_LINKS = {
  compliance: 'https://buy.stripe.com/6oU9AUcheaD173I2Ys6sw0c',
  starter: 'https://buy.stripe.com/28E7sM80YdPdewa42w6sw09',
  pro: 'https://buy.stripe.com/7sY4gAepm12rbjYaqU6sw0a',
  empire: 'https://buy.stripe.com/cNi4gAgxueTh9bQaqU6sw0b',
};

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
  if (_rateLimit(req, res, 5, 60000)) return;

  try {
  const { email, currentTier, targetTier } = req.body || {};
  if (!email || !targetTier) return res.status(400).json({ error: 'email and targetTier required' });

  const currentPrice = TIER_PRICES[currentTier] || 0;
  const targetPrice = TIER_PRICES[targetTier];
  if (!targetPrice) return res.status(400).json({ error: 'Invalid target tier' });
  if (targetPrice <= currentPrice) return res.status(400).json({ error: 'Can only upgrade to a higher tier' });

  const checkoutUrl = STRIPE_LINKS[targetTier];
  const priceDiff = (targetPrice - currentPrice) / 100;
  const tierLabels = { compliance: 'Compliance Only', starter: 'Business Starter', pro: 'Business Pro', empire: 'Business Empire' };

  // Notify admin of upgrade intent
  const emailitKey = process.env.EMAILIT_API_KEY;
  if (emailitKey) {
    await fetch('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'alerts@pacropservices.com', to: 'hello@pacropservices.com',
        subject: `⬆️ Upgrade Intent: ${email} → ${tierLabels[targetTier]}`,
        html: `<div style="font-family:sans-serif"><h2>Client Upgrade Intent</h2><p><strong>Client:</strong> ${email}<br><strong>Current:</strong> ${tierLabels[currentTier] || currentTier}<br><strong>Target:</strong> ${tierLabels[targetTier]}<br><strong>Diff:</strong> +$${priceDiff}/yr</p></div>`
      })
    }).catch(e => console.error('Silent failure:', e.message));
  }

  return res.status(200).json({
    success: true,
    checkoutUrl,
    currentTier: tierLabels[currentTier] || currentTier,
    targetTier: tierLabels[targetTier],
    priceDifference: `+$${priceDiff}/yr`,
    message: `Complete your upgrade to ${tierLabels[targetTier]} at the checkout link.`
  });
  } catch(e) { return res.status(500).json({ error: 'Something went wrong with the upgrade. Please call 814-228-2822.' }); }
}
