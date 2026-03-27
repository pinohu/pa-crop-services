// PA CROP Services — Stripe Webhook Handler
// POST /api/stripe-webhook
// Detects tier from Stripe product, auto-provisions everything

import { log, logError, logWarn } from './_log.js';
import { fetchWithTimeout } from './_fetch.js';

async function _notifyIke(subject, body) {
  const key = process.env.EMAILIT_API_KEY;
  if (!key) { logWarn('emailit_key_missing', { subject }); return; }
  try {
    await fetchWithTimeout('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'alerts@pacropservices.com',
        to: 'hello@pacropservices.com',
        subject: '[PA CROP] ' + subject,
        html: '<div style="font-family:sans-serif;max-width:600px">' + body + '</div>'
      })
    });
  } catch (e) { logError('emailit_notify_failed', { subject }, e); }
}

// 4-tier pricing: $99 / $199 / $349 / $699
const TIER_CONFIGS = {
  business_empire:  { tier: 'empire',     planCode: 'business_empire',  includesHosting: true,  includesVPS: true,  emailCount: 99, domainCount: 10, websitePages: 3, includesFiling: true,  includesNotary: true  },
  business_pro:     { tier: 'pro',        planCode: 'business_pro',     includesHosting: true,  includesVPS: false, emailCount: 99, domainCount: 3,  websitePages: 5, includesFiling: true,  includesNotary: false },
  business_starter: { tier: 'starter',    planCode: 'business_starter', includesHosting: true,  includesVPS: false, emailCount: 5,  domainCount: 1,  websitePages: 1, includesFiling: false, includesNotary: false },
  compliance_only:  { tier: 'compliance', planCode: 'compliance_only',  includesHosting: false, includesVPS: false, emailCount: 0,  domainCount: 0,  websitePages: 0, includesFiling: false, includesNotary: false }
};

// Map Stripe product metadata or price amounts to tiers.
// Primary: Stripe product metadata.plan_code or price nickname.
// Fallback: amount brackets matching $99/$199/$349/$699 pricing.
function detectTier(event) {
  const session = event?.data?.object;

  // Check product metadata from line items (most reliable)
  const lineItems = session?.line_items?.data || [];
  for (const item of lineItems) {
    const planCode = item?.price?.product?.metadata?.plan_code
      || item?.price?.metadata?.plan_code
      || item?.price?.nickname?.toLowerCase()?.replace(/\s+/g, '_');
    if (planCode && TIER_CONFIGS[planCode]) return TIER_CONFIGS[planCode];
  }

  // Check session metadata
  const sessionPlanCode = session?.metadata?.plan_code;
  if (sessionPlanCode && TIER_CONFIGS[sessionPlanCode]) return TIER_CONFIGS[sessionPlanCode];

  // Fallback: amount-based detection using actual PA CROP pricing
  const amount = session?.amount_total || session?.amount_due || 0;
  const amountDollars = amount / 100;

  // Use midpoints between tiers to handle rounding/tax/discount
  if (amountDollars >= 524) return TIER_CONFIGS.business_empire;   // $699 tier ($524 midpoint between $349 and $699)
  if (amountDollars >= 274) return TIER_CONFIGS.business_pro;       // $349 tier ($274 midpoint between $199 and $349)
  if (amountDollars >= 149) return TIER_CONFIGS.business_starter;   // $199 tier ($149 midpoint between $99 and $199)
  if (amountDollars >= 50)  return TIER_CONFIGS.compliance_only;    // $99 tier

  // Unknown amount — default to compliance tier and log for manual review
  logWarn('unknown_stripe_amount', { amountDollars, eventId: event?.id });
  return TIER_CONFIGS.compliance_only;
}

export default async function handler(req, res) {
  // Stripe webhooks come from Stripe servers, not browsers — no CORS needed
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) {
    logError('webhook_secret_missing', {});
    return res.status(500).json({ success: false, error: 'Webhook secret not configured' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ success: false, error: 'Missing Stripe-Signature header' });
  }

  // Verify signature — always required
  {
    try {
      const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const timestamp = sig.split(',').find(s => s.startsWith('t=')).split('=')[1];
      const signatures = sig.split(',').filter(s => s.startsWith('v1=')).map(s => s.split('=')[1]);
      const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
      if (age > 300) return res.status(400).json({ success: false, error: 'Webhook timestamp too old' });
      const crypto = await import('crypto');
      const expected = crypto.createHmac('sha256', whSecret).update(`${timestamp}.${payload}`).digest('hex');
      const valid = signatures.some(s => crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
      if (!valid) return res.status(400).json({ success: false, error: 'Invalid signature' });
    } catch (err) {
      logError('webhook_signature_failed', {}, err);
      return res.status(400).json({ success: false, error: 'Verification failed' });
    }
  }

  const event = req.body;
  const type = event?.type;
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';

  try {
    // ── CHECKOUT COMPLETED — Full auto-provisioning ────────────────────
    if (type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_details?.email || session.customer_email || '';
      const name = session.customer_details?.name || '';
      const tierConfig = detectTier(event);
      
      log('new_client_checkout', { email, tier: tierConfig.tier, amount: (session.amount_total||0)/100 });

      // Step 1: Call /api/provision directly (no n8n dependency)
      const provisionRes = await fetchWithTimeout(`${baseUrl}/api/provision`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Key': process.env.ADMIN_SECRET_KEY
        },
        body: JSON.stringify({
          email,
          name,
          tier: tierConfig.tier,
          sessionId: session.id,
          includesHosting: tierConfig.includesHosting,
          includesVPS: tierConfig.includesVPS,
          emailCount: tierConfig.emailCount,
          domainCount: tierConfig.domainCount,
          websitePages: tierConfig.websitePages,
          includesFiling: tierConfig.includesFiling,
          // Auto-generate what we can
          accountSlug: email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 20),
          hostingPassword: 'Crop' + Math.random().toString(36).slice(2, 10) + '!',
        })
      }).catch(e => {
        logError('provision_call_failed', { email }, new Error(e.message));
        return null;
      });

      const provisionData = provisionRes ? await provisionRes.json().catch(() => ({})) : {};
      log('provision_result', { email, tier: tierConfig.tier, steps: provisionData.steps?.length || 0 });

      // Step 2: Also notify n8n (for any additional workflow steps)
      await fetchWithTimeout('https://n8n.audreysplace.place/webhook/crop-new-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event, tierConfig, provisionResult: provisionData })
      }).catch(e => logWarn('external_call_failed', { service: 'n8n/invoice', error: e.message }));

      // Step 2: Generate branded invoice
      fetchWithTimeout(`${baseUrl}/api/invoice-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY },
        body: JSON.stringify({ email, name, amount: session.amount_total || 0, tier: tierConfig.tier, stripeSessionId: session.id })
      }).catch(e => logWarn('external_call_failed', { service: 'n8n/invoice', error: e.message })); // Fire and forget

      // Step 3: Notify Ike
      await _notifyIke(`🎉 New ${tierConfig.tier.toUpperCase()} Client: ${name || email}`,
        `<h2>New Client Signed Up!</h2>
         <p><strong>Email:</strong> ${email}</p>
         <p><strong>Name:</strong> ${name || 'not provided'}</p>
         <p><strong>Plan:</strong> ${tierConfig.tier} ($${(session.amount_total||0)/100})</p>
         <p><strong>Stripe Session:</strong> ${session.id}</p>
         <h3>Auto-Provisioning Results:</h3>
         <pre>${JSON.stringify(provisionData.steps || [], null, 2)}</pre>
         ${tierConfig.includesHosting ? '<p>⚠️ <strong>Action needed:</strong> Client needs to provide their desired domain name. Check welcome page submission or contact them.</p>' : ''}
         ${tierConfig.includesFiling ? '<p>📝 Client gets annual report filing — add to filing tracker.</p>' : ''}`
      );
    }

    // ── PAYMENT FAILED — Dunning ─────────────────────────────────────
    else if (type === 'invoice.payment_failed') {
      const invoice = event?.data?.object;
      const custEmail = invoice?.customer_email || '';
      const amount = ((invoice?.amount_due || 0) / 100).toFixed(2);

      // Day 1: Immediate SMS alert
      if (custEmail) {
        fetchWithTimeout(`${baseUrl}/api/sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY },
          body: JSON.stringify({ to: custEmail, message: `PA CROP Services: Your payment of $${amount} failed. Please update your payment method to keep your compliance monitoring active. Questions? 814-228-2822` })
        }).catch(e => logWarn('external_call_failed', { service: 'n8n/invoice', error: e.message }));
      }

      // n8n for full dunning workflow
      const pfRes = await fetchWithTimeout('https://n8n.audreysplace.place/webhook/crop-payment-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(() => null);
      
      if (!pfRes || !pfRes.ok) {
        await _notifyIke('Payment Failed — Action Required',
          '<h2>⚠️ Payment Failed</h2>' +
          '<p><strong>Customer:</strong> ' + (custEmail || JSON.stringify(invoice?.customer || 'unknown')) + '</p>' +
          '<p><strong>Amount:</strong> $' + amount + '</p>' +
          '<p>SMS alert sent. n8n dunning workflow ' + (pfRes ? 'responded' : 'unreachable') + '.</p>'
        );
      }
    }

    log('stripe_webhook_processed', { type, eventId: event?.id });
  } catch (e) {
    logError('stripe_webhook_error', { type, eventId: event?.id }, e);
  }

  return res.status(200).json({ received: true });
}
