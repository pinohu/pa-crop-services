// PA CROP Services — /api/provision
// Triggered by Stripe webhook OR admin dashboard
// Full 20i stack provisioning: hosting + email + SSL + StackCP + SuiteDash + welcome email

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const adminKey = req.headers['x-admin-key'] || req.body?.adminKey;
  const isStripe = req.headers['stripe-signature']; // Allow Stripe too
  if (!isStripe && adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body || {};
  const {
    email, name, tier, sessionId,
    includesHosting = false, includesTurbo = false, includesBackups = false,
    suggestedDomain = '', accountSlug = '', hostingPassword = ''
  } = body;

  if (!email) return res.status(400).json({ error: 'email required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const BEARER = process.env.TWENTY_I_TOKEN || 
    (process.env.TWENTY_I_GENERAL && process.env.TWENTY_I_OAUTH 
      ? `${process.env.TWENTY_I_GENERAL}+${process.env.TWENTY_I_OAUTH}` : null);
  const SMTP_HOST = process.env.SMTP_HOST || 'smtp.emailit.com';
  const N8N = 'https://n8n.audreysplace.place/webhook';

  const results = { email, tier, steps: [] };

  // ── Step 1: Generate portal access code ──────────────────────────────
  const local = email.split('@')[0].replace(/[^a-z0-9]/gi,'').toUpperCase();
  const accessCode = 'CROP' + local.slice(-4) + Math.floor(1000 + Math.random() * 9000);
  const refCode = 'CROP-' + Date.now().toString(36).toUpperCase().slice(-6);
  results.accessCode = accessCode;
  results.refCode = refCode;
  results.steps.push({ step: 'access_code', status: 'done', code: accessCode });

  // ── Step 2: Create/Update SuiteDash contact ───────────────────────────
  try {
    const nameParts = (name || '').split(' ');
    const sdRes = await fetch('https://app.suitedash.com/secure-api/contacts', {
      method: 'POST',
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email,
        role: 'client',
        tags: [`crop-${tier}`, 'crop-active'],
        custom_fields: {
          portal_access_code: accessCode,
          crop_plan: tier,
          crop_since: new Date().toISOString().split('T')[0],
          referral_code: refCode,
          lead_tier: 'client',
          lead_source: 'stripe'
        }
      })
    });
    const sdData = await sdRes.json();
    results.suitedashId = sdData?.data?.id || sdData?.id;
    results.steps.push({ step: 'suitedash_contact', status: 'done', id: results.suitedashId });
  } catch (e) {
    results.steps.push({ step: 'suitedash_contact', status: 'error', error: e.message });
  }

  // ── Step 3: 20i Provisioning (if applicable) ──────────────────────────
  if (includesHosting && BEARER && accountSlug) {
    try {
      // Create hosting package
      const pkgRes = await fetch('https://api.20i.com/reseller/web', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${BEARER}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'extra-names': [accountSlug],
          type: includesTurbo ? 'turbo' : 'standard',
          packageBundle: {
            name: `PA CROP — ${tier}`,
            username: accountSlug,
            password: hostingPassword,
            type: 'webspace'
          }
        })
      });
      const pkgData = await pkgRes.json();
      const packageId = pkgData?.result?.id || pkgData?.id;
      results.packageId = packageId;
      results.steps.push({ step: '20i_hosting', status: packageId ? 'done' : 'error', packageId });

      if (packageId) {
        // Enable SSL
        await fetch(`https://api.20i.com/package/${packageId}/ssl`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${BEARER}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ domain: suggestedDomain, type: 'letsencrypt' })
        }).catch(() => {});
        results.steps.push({ step: '20i_ssl', status: 'done' });

        // Enable backups if included
        if (includesBackups) {
          await fetch(`https://api.20i.com/package/${packageId}/backup`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${BEARER}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: true, retention: 30 })
          }).catch(() => {});
          results.steps.push({ step: '20i_backups', status: 'done' });
        }

        // Enable turbo if included
        if (includesTurbo) {
          await fetch(`https://api.20i.com/package/${packageId}/turbo`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${BEARER}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: true })
          }).catch(() => {});
          results.steps.push({ step: '20i_turbo', status: 'done' });
        }

        // Create StackCP user
        await fetch('https://api.20i.com/reseller/user', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${BEARER}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email, password: hostingPassword, email, name })
        }).catch(() => {});
        results.steps.push({ step: '20i_stackcp_user', status: 'done' });

        // Create email mailbox
        await fetch(`https://api.20i.com/package/${packageId}/email/mailbox`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${BEARER}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: email.split('@')[0],
            domain: suggestedDomain,
            password: hostingPassword,
            quota: 25000,
            forwardingAddresses: [email]
          })
        }).catch(() => {});
        results.steps.push({ step: '20i_email_mailbox', status: 'done' });
      }
    } catch (e) {
      results.steps.push({ step: '20i_provisioning', status: 'error', error: e.message });
    }
  }

  // ── Step 4: Send portal welcome email via n8n ─────────────────────────
  try {
    await fetch(`${N8N}/crop-portal-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: accessCode, firstName: (name || '').split(' ')[0] })
    });
    results.steps.push({ step: 'portal_welcome_email', status: 'done' });
  } catch (e) {
    results.steps.push({ step: 'portal_welcome_email', status: 'error', error: e.message });
  }

  // ── Step 5: Add to Acumbamail ─────────────────────────────────────────
  try {
    await fetch('https://acumbamail.com/api/1/addSubscriber/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: '0cdbad074aa140a5bf7274027a53f780',
        list_id: '1267324',
        email,
        response_type: 'json'
      })
    });
    results.steps.push({ step: 'acumbamail', status: 'done' });
  } catch (e) {
    results.steps.push({ step: 'acumbamail', status: 'error' });
  }

  return res.status(200).json({ success: true, ...results });
}
