import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';

const log = createLogger('client-upgrade');

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

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });
  const blocked = await checkRateLimit(getClientIp(req), 'client-upgrade', 5, '60s');
  if (blocked) { res.setHeader('Retry-After', String(blocked.retryAfter)); return res.status(429).json({ success: false, error: 'Too many requests' }); }

  try {
  const { email, currentTier, targetTier } = req.body || {};
  if (!email || !targetTier) return res.status(400).json({ success: false, error: 'email and targetTier required' });

  const currentPrice = TIER_PRICES[currentTier] || 0;
  const targetPrice = TIER_PRICES[targetTier];
  if (!targetPrice) return res.status(400).json({ success: false, error: 'Invalid target tier' });
  if (targetPrice <= currentPrice) return res.status(400).json({ success: false, error: 'Can only upgrade to a higher tier' });

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
    }).catch(e => log.warn('external_call_failed', { error: e.message }));
  }

  return res.status(200).json({
    success: true,
    checkoutUrl,
    currentTier: tierLabels[currentTier] || currentTier,
    targetTier: tierLabels[targetTier],
    priceDifference: `+$${priceDiff}/yr`,
    message: `Complete your upgrade to ${tierLabels[targetTier]} at the checkout link.`
  });
  } catch(e) { return res.status(500).json({ success: false, error: 'Something went wrong with the upgrade. Please call 814-228-2822.' }); }
}
