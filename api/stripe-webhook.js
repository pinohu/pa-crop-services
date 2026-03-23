// PA CROP Services — Stripe Webhook Handler (with signature verification)
// POST /api/stripe-webhook
// Verifies Stripe webhook signatures and routes events to n8n


// ── Emailit Fallback Notifier ──
async function _notifyIke(subject, body) {
  const key = process.env.EMAILIT_API_KEY;
  if (!key) { console.warn('EMAILIT_API_KEY not set — notification skipped:', subject); return; }
  try {
    await fetch('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'alerts@pacropservices.com',
        to: 'hello@pacropservices.com',
        subject: '[PA CROP] ' + subject,
        html: '<div style="font-family:sans-serif;max-width:600px">' + body + '</div>'
      })
    });
  } catch (e) { console.error('Emailit fallback failed:', e.message); }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const sig = req.headers['stripe-signature'];
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

  // If no webhook secret configured, accept but log warning
  if (!WEBHOOK_SECRET) {
    console.warn('STRIPE_WEBHOOK_SECRET not configured — accepting unverified webhook');
    return await routeEvent(req.body, res);
  }

  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  // Manual signature verification (no Stripe SDK dependency)
  try {
    const payload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const timestamp = sig.split(',').find(s => s.startsWith('t=')).split('=')[1];
    const signatures = sig.split(',').filter(s => s.startsWith('v1=')).map(s => s.split('=')[1]);

    // Check timestamp freshness (reject if older than 5 minutes)
    const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (age > 300) {
      return res.status(400).json({ error: 'Webhook timestamp too old' });
    }

    // Compute expected signature
    const crypto = await import('crypto');
    const signedPayload = `${timestamp}.${payload}`;
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    const valid = signatures.some(s => {
      return crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected));
    });

    if (!valid) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    return await routeEvent(req.body, res);
  } catch (err) {
    console.error('Webhook verification error:', err);
    return res.status(400).json({ error: 'Verification failed' });
  }
}

async function routeEvent(event, res) {
  const type = event?.type;

  try {
    if (type === 'checkout.session.completed') {
      // Route to onboarding workflow
      await fetch('https://n8n.audreysplace.place/webhook/crop-new-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } else if (type === 'invoice.payment_failed') {
      // Route to dunning workflow
      const pfRes = await fetch('https://n8n.audreysplace.place/webhook/crop-payment-failed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(() => null);
      if (!pfRes || !pfRes.ok) {
        await _notifyIke('Payment Failed — Action Required',
          '<h2>⚠️ Payment Failed</h2>' +
          '<p><strong>Event:</strong> ' + (event?.id || 'unknown') + '</p>' +
          '<p><strong>Customer:</strong> ' + JSON.stringify(event?.data?.object?.customer || 'unknown') + '</p>' +
          '<p><strong>Amount:</strong> $' + ((event?.data?.object?.amount_due || 0) / 100).toFixed(2) + '</p>' +
          '<p>n8n workflow unreachable. Handle manually in Stripe dashboard.</p>'
        );
      }
    }
    // Log all events
    console.log(`Stripe webhook: ${type} (${event?.id})`);
  } catch (e) {
    console.error('Webhook routing error:', e);
  }

  return res.status(200).json({ received: true });
}
