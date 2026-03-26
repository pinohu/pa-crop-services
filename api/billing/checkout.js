import { setCors } from '../services/auth.js';
import { isValidEmail, isValidPlanCode } from '../_validate.js';
import { logError } from '../_log.js';
import { fetchWithTimeout } from '../_fetch.js';

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const PLAN_PRICES = {
  compliance_only: process.env.STRIPE_PRICE_COMPLIANCE || 'price_compliance',
  business_starter: process.env.STRIPE_PRICE_STARTER || 'price_starter',
  business_pro: process.env.STRIPE_PRICE_PRO || 'price_pro',
  business_empire: process.env.STRIPE_PRICE_EMPIRE || 'price_empire'
};

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const { plan_code, email } = req.body || {};
  if (!plan_code || !email) return res.status(400).json({ success: false, error: 'missing_fields' });
  if (!isValidPlanCode(plan_code)) return res.status(400).json({ success: false, error: 'invalid_plan_code' });
  if (!isValidEmail(email)) return res.status(400).json({ success: false, error: 'invalid_email' });
  if (!STRIPE_KEY) return res.status(500).json({ success: false, error: 'stripe_not_configured' });

  try {
    const resp = await fetchWithTimeout('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        'mode': 'subscription',
        'customer_email': email,
        'line_items[0][price]': PLAN_PRICES[plan_code] || PLAN_PRICES.compliance_only,
        'line_items[0][quantity]': '1',
        'success_url': 'https://pacropservices.com/portal?checkout=success',
        'cancel_url': 'https://pacropservices.com/?checkout=cancelled',
        'metadata[plan_code]': plan_code
      })
    });
    const session = await resp.json();
    return res.status(200).json({ success: true, checkout_url: session.url });
  } catch (err) {
    logError('checkout_failed', {}, err);
    return res.status(500).json({ success: false, error: 'checkout_failed' });
  }
}
