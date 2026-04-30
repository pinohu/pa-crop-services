// PA CROP Services — Stripe Webhook Handler
// POST /api/stripe-webhook
// Detects tier from Stripe product, auto-provisions everything.
//
// Body parsing is disabled so we can verify the Stripe signature against the
// exact bytes Stripe signed. JSON-parsing the body before HMAC would change
// whitespace / key order / Unicode escapes and break (or silently mis-verify)
// the signature.

import { log, logError, logWarn } from './_log.js';
import { fetchWithTimeout } from './_fetch.js';
import { Redis } from '@upstash/redis';
import { notifyOps } from './services/email.js';

export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Backwards-compat alias — existing call sites use _notifyIke.
const _notifyIke = (subject, body) => notifyOps(subject, body);

let _redis = null;
function getRedis() {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
    return _redis;
  }
  return null;
}

// Returns true if this is the first time we've seen the event id; false if
// a previous delivery already claimed it. TTL = 7 days (Stripe's replay window).
async function claimEventId(eventId) {
  if (!eventId) return true;
  const redis = getRedis();
  if (!redis) return true; // Redis unavailable → don't block delivery
  try {
    const result = await redis.set(`stripe:event:${eventId}`, '1', { nx: true, ex: 60 * 60 * 24 * 7 });
    return result === 'OK';
  } catch (e) {
    logWarn('stripe_idempotency_redis_failed', { eventId, error: e.message });
    return true; // Fail-open — better to occasionally double-process than to drop events
  }
}

// (notifyOps from services/email.js + the _notifyIke alias above replace the
//  10-line duplicated helper that used to live here.)

// 4-tier pricing — values come from services/plans.js (single source of truth).
// Re-exposed in this older shape so the existing detectTier() return type doesn't
// need to change; new code should import services/plans.js directly.
import { PLANS as _PLANS } from './services/plans.js';
const TIER_CONFIGS = Object.fromEntries(Object.entries(_PLANS).map(([code, p]) => [code, {
  tier: p.tier,
  planCode: p.plan_code,
  includesHosting: p.includesHosting,
  includesVPS: p.includesVPS,
  emailCount: p.emailCount,
  domainCount: p.domainCount,
  websitePages: p.websitePages,
  includesFiling: p.includesFiling,
  includesNotary: p.includesNotary
}]));

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

  // Read the raw body bytes — required for signature verification.
  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    logError('webhook_body_read_failed', {}, err);
    return res.status(400).json({ success: false, error: 'Body read failed' });
  }

  // Verify signature against the raw bytes (not a re-stringified parse).
  {
    try {
      const timestamp = sig.split(',').find(s => s.startsWith('t='))?.split('=')[1];
      const signatures = sig.split(',').filter(s => s.startsWith('v1=')).map(s => s.split('=')[1]);
      if (!timestamp || signatures.length === 0) return res.status(400).json({ success: false, error: 'Malformed Stripe-Signature' });
      const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
      if (!Number.isFinite(age) || age > 300) return res.status(400).json({ success: false, error: 'Webhook timestamp too old' });
      const crypto = await import('crypto');
      const signedPayload = Buffer.concat([Buffer.from(`${timestamp}.`, 'utf8'), rawBody]);
      const expected = crypto.createHmac('sha256', whSecret).update(signedPayload).digest('hex');
      const expectedBuf = Buffer.from(expected, 'hex');
      const valid = signatures.some(s => {
        const sBuf = Buffer.from(s, 'hex');
        return sBuf.length === expectedBuf.length && crypto.timingSafeEqual(sBuf, expectedBuf);
      });
      if (!valid) return res.status(400).json({ success: false, error: 'Invalid signature' });
    } catch (err) {
      logError('webhook_signature_failed', {}, err);
      return res.status(400).json({ success: false, error: 'Verification failed' });
    }
  }

  // Parse the now-verified payload.
  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    logError('webhook_parse_failed', {}, err);
    return res.status(400).json({ success: false, error: 'Invalid JSON payload' });
  }
  const type = event?.type;

  // Idempotency — short-circuit duplicates so retries don't double-provision.
  const claimed = await claimEventId(event?.id);
  if (!claimed) {
    log('stripe_webhook_duplicate', { type, eventId: event?.id });
    return res.status(200).json({ received: true, deduplicated: true });
  }
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';

  try {
    // ── CHECKOUT COMPLETED — Full auto-provisioning ────────────────────
    if (type === 'checkout.session.completed') {
      const session = event.data.object;
      const email = session.customer_details?.email || session.customer_email || '';
      const name = session.customer_details?.name || '';
      const tierConfig = detectTier(event);

      // Alert when tier detection fell through to amount-bracket fallback —
      // the client may have ended up on the wrong plan in Neon.
      const declaredPlan = (session?.line_items?.data?.[0]?.price?.product?.metadata?.plan_code)
        || (session?.line_items?.data?.[0]?.price?.metadata?.plan_code)
        || session?.metadata?.plan_code;
      if (!declaredPlan) {
        await _notifyIke(`Stripe price metadata missing for ${email || 'unknown'}`,
          `<p>checkout.session.completed for <strong>${email}</strong> had no <code>price.metadata.plan_code</code>. Tier was inferred from amount as <strong>${tierConfig.planCode}</strong> at $${(session.amount_total||0)/100}.</p>
           <p>Verify the Stripe price/Payment Link is configured with the correct plan_code metadata.</p>
           <p>Stripe session: ${session.id}</p>`);
        logWarn('stripe_plan_code_missing', { email, sessionId: session.id, inferredPlan: tierConfig.planCode });
      }

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
          hostingPassword: 'Crop' + (await import('crypto')).randomBytes(6).toString('base64url') + '!',
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

      // Step 3: Notify Ike — celebrate when clean, alert when not.
      const provisionErrors = (provisionData?.steps || []).filter(s => s.status === 'error');
      const provisionWarnings = (provisionData?.steps || []).filter(s => s.status === 'warning' || s.status === 'pending' || s.status === 'deferred');
      const subjectPrefix = provisionErrors.length > 0
        ? `⚠️ Provisioning ERRORS — ${tierConfig.tier.toUpperCase()} Client: `
        : provisionWarnings.length > 0
          ? `⚠️ Provisioning WARNINGS — ${tierConfig.tier.toUpperCase()} Client: `
          : `🎉 New ${tierConfig.tier.toUpperCase()} Client: `;
      await _notifyIke(`${subjectPrefix}${name || email}`,
        `<h2>${provisionErrors.length ? 'Action required' : 'New Client Signed Up!'}</h2>
         <p><strong>Email:</strong> ${email}</p>
         <p><strong>Name:</strong> ${name || 'not provided'}</p>
         <p><strong>Plan:</strong> ${tierConfig.tier} ($${(session.amount_total||0)/100})</p>
         <p><strong>Stripe Session:</strong> ${session.id}</p>
         ${provisionErrors.length ? `<p style="color:#b53333"><strong>${provisionErrors.length} error step(s)</strong> — manual remediation needed.</p>` : ''}
         ${provisionWarnings.length ? `<p style="color:#92400e"><strong>${provisionWarnings.length} warning step(s)</strong> — review.</p>` : ''}
         <h3>Auto-Provisioning Results:</h3>
         <pre>${JSON.stringify(provisionData.steps || [], null, 2)}</pre>
         ${tierConfig.includesHosting ? '<p>📝 Client needs to provide their desired domain name. Check welcome page submission or contact them.</p>' : ''}
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

    // ── SUBSCRIPTION UPDATED / DELETED — keep clients.billing_status in sync ──
    else if (type === 'customer.subscription.updated' || type === 'customer.subscription.deleted') {
      const sub = event?.data?.object;
      const stripeCustomerId = typeof sub?.customer === 'string' ? sub.customer : sub?.customer?.id;
      let newStatus;
      if (type === 'customer.subscription.deleted') {
        newStatus = 'cancelled';
      } else {
        // map Stripe sub.status → our internal billing_status
        newStatus = ({
          active: 'active',
          trialing: 'trialing',
          past_due: 'past_due',
          unpaid: 'past_due',
          canceled: 'cancelled',
          incomplete: 'incomplete',
          incomplete_expired: 'cancelled',
          paused: 'paused'
        })[sub?.status] || sub?.status || 'unknown';
      }

      try {
        const dbMod = await import('./services/db.js');
        if (dbMod.isConnected() && stripeCustomerId) {
          const sql = dbMod.getSql();
          const rows = await sql`SELECT client_id FROM billing_accounts WHERE stripe_customer_id = ${stripeCustomerId} LIMIT 1`;
          const clientId = rows?.[0]?.client_id;
          if (clientId) {
            await dbMod.updateClient(clientId, { billing_status: newStatus });
            await dbMod.upsertBillingAccount({
              client_id: clientId,
              stripe_customer_id: stripeCustomerId,
              billing_status: newStatus,
              current_period_end: sub?.current_period_end ? new Date(sub.current_period_end * 1000) : null
            });
            await dbMod.writeAuditEvent({
              actor_type: 'system', actor_id: 'stripe-webhook',
              event_type: type === 'customer.subscription.deleted' ? 'subscription.cancelled' : 'subscription.updated',
              target_type: 'client', target_id: clientId,
              after_json: { billing_status: newStatus, stripe_status: sub?.status, sub_id: sub?.id },
              reason: 'stripe_webhook'
            });
            log('subscription_status_updated', { clientId, newStatus, stripeSubId: sub?.id });
          } else {
            logWarn('subscription_event_no_client_match', { stripeCustomerId, type });
          }
        }
      } catch (subErr) {
        logError('subscription_sync_failed', { type, stripeCustomerId }, subErr);
      }

      if (type === 'customer.subscription.deleted') {
        await _notifyIke(`Client cancelled: ${stripeCustomerId}`,
          `<p>Subscription cancelled.</p><p>Stripe customer: <code>${stripeCustomerId}</code></p><p>Sub: <code>${sub?.id}</code></p>`);
      }
    }

    log('stripe_webhook_processed', { type, eventId: event?.id });
  } catch (e) {
    logError('stripe_webhook_error', { type, eventId: event?.id }, e);
  }

  return res.status(200).json({ received: true });
}
