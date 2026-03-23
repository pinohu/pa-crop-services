// PA CROP Services — /api/provision
// Full tier-aware auto-provisioning: SuiteDash + 20i hosting/email/SSL/domain + welcome email
// Called by stripe-webhook.js on checkout.session.completed OR admin dashboard

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const adminKey = req.headers['x-admin-key'] || req.body?.adminKey;
  const isStripe = req.headers['stripe-signature'];
  if (!isStripe && adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body || {};
  const {
    email, name, tier = 'compliance', sessionId,
    includesHosting = false, includesVPS = false,
    emailCount = 0, domainCount = 0, websitePages = 0,
    includesFiling = false, includesNotary = false,
    suggestedDomain = '', accountSlug: rawSlug = '', hostingPassword: rawPw = ''
  } = body;

  if (!email) return res.status(400).json({ error: 'email required' });

  // Auto-generate missing params
  const accountSlug = rawSlug || email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 20);
  const hostingPassword = rawPw || 'Crop' + Math.random().toString(36).slice(2, 10) + '!';
  
  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const TWENTY_GENERAL = process.env.TWENTY_I_GENERAL || (process.env.TWENTY_I_TOKEN || '').split('+')[0];
  const BEARER = TWENTY_GENERAL ? `Bearer ${Buffer.from(TWENTY_GENERAL).toString('base64')}` : null;
  const TWENTY_RESELLER_ID = process.env.TWENTY_I_RESELLER_ID || '10455';
  const N8N = 'https://n8n.audreysplace.place/webhook';

  const results = { email, tier, steps: [], warnings: [] };

  // ── STEP 1: Generate access credentials ──────────────────────────────
  const local = email.split('@')[0].replace(/[^a-z0-9]/gi,'').toUpperCase();
  const accessCode = 'CROP' + local.slice(-4) + Math.floor(1000 + Math.random() * 9000);
  const refCode = 'CROP-' + Date.now().toString(36).toUpperCase().slice(-6);
  results.accessCode = accessCode;
  results.refCode = refCode;
  results.hostingPassword = hostingPassword;
  results.steps.push({ step: 'credentials', status: 'done', accessCode, refCode });

  // ── STEP 2: Create SuiteDash contact ─────────────────────────────────
  if (SD_PUBLIC && SD_SECRET) {
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
          tags: [`crop-${tier}`, 'crop-active', ...(includesFiling ? ['filing-included'] : []), ...(includesNotary ? ['notary-included'] : [])],
          custom_fields: {
            portal_access_code: accessCode,
            crop_plan: tier,
            crop_since: new Date().toISOString().split('T')[0],
            referral_code: refCode,
            hosting_password: includesHosting ? hostingPassword : '',
            hosting_slug: includesHosting ? accountSlug : '',
            domain_count: domainCount,
            email_count: emailCount,
            website_pages: websitePages,
            includes_filing: includesFiling ? 'yes' : 'no',
            includes_notary: includesNotary ? 'yes' : 'no',
            stripe_session: sessionId || '',
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
  } else {
    results.steps.push({ step: 'suitedash_contact', status: 'skipped', reason: 'SuiteDash keys not configured' });
  }

  // ── STEP 3: 20i Hosting provisioning (Starter, Pro, Empire) ──────────
  if (includesHosting && BEARER) {
    try {
      // Determine hosting type
      const hostingType = includesVPS ? 'vps' : 'linux';
      const tempDomain = suggestedDomain || `${accountSlug}.pacrophosting.com`;
      
      // Create hosting package
      const pkgRes = await fetch(`https://api.20i.com/reseller/${TWENTY_RESELLER_ID}/addWeb`, {
        method: 'POST',
        headers: { 'Authorization': BEARER, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: hostingType,
          domain_name: tempDomain,
          extra_domain_names: [],
          label: `PA CROP — ${tier} — ${email}`
        })
      });
      const pkgData = await pkgRes.json();
      const packageId = pkgData?.result || pkgData?.id || pkgData;
      results.packageId = packageId;
      results.steps.push({ step: '20i_hosting', status: packageId ? 'done' : 'warning', packageId, type: hostingType });

      if (packageId) {
        // Enable SSL
        try {
          await fetch(`https://api.20i.com/package/${packageId}/web/addSsl`, {
            method: 'POST',
            headers: { 'Authorization': BEARER, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: tempDomain })
          });
          results.steps.push({ step: '20i_ssl', status: 'done' });
        } catch (e) {
          results.steps.push({ step: '20i_ssl', status: 'warning', error: e.message });
        }

        // Create email mailboxes (tier-aware count)
        const mailboxCount = Math.min(emailCount || 1, 5); // Create up to 5 initially
        for (let i = 0; i < mailboxCount; i++) {
          const mbName = i === 0 ? 'info' : (i === 1 ? 'hello' : (i === 2 ? 'admin' : (i === 3 ? 'support' : 'billing')));
          try {
            await fetch(`https://api.20i.com/package/${packageId}/email/${tempDomain}`, {
              method: 'POST',
              headers: { 'Authorization': BEARER, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: { address: mbName, quota: 25000, password: hostingPassword }
              })
            });
          } catch (e) { /* continue with remaining mailboxes */ }
        }
        results.steps.push({ step: '20i_email', status: 'done', count: mailboxCount, domain: tempDomain });

        // Create StackCP user (client can manage their own hosting)
        try {
          await fetch(`https://api.20i.com/reseller/${TWENTY_RESELLER_ID}/addStackUser`, {
            method: 'POST',
            headers: { 'Authorization': BEARER, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              person_name: name || email.split('@')[0],
              email: email,
              password: hostingPassword,
              send_welcome_email: true,
              grant_all_packages: false,
              package_ids: [packageId]
            })
          });
          results.steps.push({ step: '20i_stackcp_user', status: 'done' });
        } catch (e) {
          results.steps.push({ step: '20i_stackcp_user', status: 'warning', error: e.message });
        }

        // Install WordPress (for website creation)
        if (websitePages > 0) {
          try {
            await fetch(`https://api.20i.com/package/${packageId}/web/oneclick`, {
              method: 'POST',
              headers: { 'Authorization': BEARER, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                domain: tempDomain,
                app: 'wordpress',
                directory: '/',
                admin_email: email,
                admin_user: accountSlug,
                admin_password: hostingPassword,
                site_name: name || `${accountSlug}'s Business`
              })
            });
            results.steps.push({ step: '20i_wordpress_install', status: 'done', pages: websitePages });
          } catch (e) {
            results.steps.push({ step: '20i_wordpress_install', status: 'warning', error: e.message });
            results.warnings.push('WordPress auto-install may need manual setup');
          }
        }
      }

      // Domain registration (if suggestedDomain provided and is a real domain)
      if (suggestedDomain && suggestedDomain.includes('.') && !suggestedDomain.includes('pacrophosting')) {
        try {
          const domainRes = await fetch(`https://api.20i.com/reseller/${TWENTY_RESELLER_ID}/addDomain`, {
            method: 'POST',
            headers: { 'Authorization': BEARER, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: suggestedDomain,
              years: 1,
              contact: { name: name || accountSlug, email, address: '924 W 23rd St', city: 'Erie', state: 'PA', zip: '16502', country: 'US' }
            })
          });
          results.steps.push({ step: '20i_domain_registration', status: 'done', domain: suggestedDomain });
        } catch (e) {
          results.steps.push({ step: '20i_domain_registration', status: 'deferred', reason: 'Client needs to provide desired domain via welcome page' });
        }
      } else if (domainCount > 0) {
        results.steps.push({ step: '20i_domain_registration', status: 'pending', reason: 'Awaiting client domain choice via welcome page' });
        results.warnings.push('Domain registration pending — client needs to submit their preferred domain');
      }

    } catch (e) {
      results.steps.push({ step: '20i_provisioning', status: 'error', error: e.message });
    }
  } else if (includesHosting && !BEARER) {
    results.steps.push({ step: '20i_provisioning', status: 'skipped', reason: '20i API key not configured' });
  }

  // ── STEP 4: Welcome email ────────────────────────────────────────────
  const emailitKey = process.env.EMAILIT_API_KEY;
  try {
    // Try n8n first
    const n8nRes = await fetch(`${N8N}/crop-new-client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, accessCode, tier, refCode, includesHosting, hostingPassword: includesHosting ? hostingPassword : undefined })
    }).catch(() => null);

    if (n8nRes && n8nRes.ok) {
      results.steps.push({ step: 'welcome_email', status: 'done', via: 'n8n' });
    } else if (emailitKey) {
      // Fallback: send welcome email directly
      const tierLabel = { compliance: 'Compliance Only', starter: 'Business Starter', pro: 'Business Pro', empire: 'Business Empire' }[tier] || tier;
      await fetch('https://api.emailit.com/v1/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'hello@pacropservices.com',
          to: email,
          subject: `Welcome to PA CROP Services — ${tierLabel}`,
          html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <div style="border-bottom:3px solid #C9982A;padding-bottom:16px;margin-bottom:24px">
              <strong style="font-size:18px;color:#0C1220">PA CROP Services</strong>
            </div>
            <h2 style="color:#0C1220">Welcome, ${(name||'').split(' ')[0] || 'there'}!</h2>
            <p>Your <strong>${tierLabel}</strong> plan is now active. Here's how to get started:</p>
            <div style="background:#FAF9F6;border:1px solid #EBE8E2;border-radius:12px;padding:20px;margin:20px 0">
              <p style="margin:0 0 8px"><strong>Portal login:</strong> <a href="https://pacropservices.com/portal">pacropservices.com/portal</a></p>
              <p style="margin:0 0 8px"><strong>Email:</strong> ${email}</p>
              <p style="margin:0"><strong>Access code:</strong> ${accessCode}</p>
            </div>
            ${includesHosting ? `<div style="background:#E8F0E9;border:1px solid #6B8F71;border-radius:12px;padding:20px;margin:20px 0">
              <h3 style="color:#0C1220;margin:0 0 8px">🌐 Your Hosting Is Ready</h3>
              <p style="margin:0 0 8px"><strong>Hosting panel:</strong> <a href="https://my.20i.com">my.20i.com</a></p>
              <p style="margin:0 0 8px"><strong>Username:</strong> ${email}</p>
              <p style="margin:0 0 8px"><strong>Password:</strong> ${hostingPassword}</p>
              <p style="margin:0;font-size:13px;color:#4A4A4A">Your hosting, email, and SSL are active. Visit our <a href="https://pacropservices.com/welcome">welcome page</a> to choose your domain name.</p>
            </div>` : ''}
            <p>Questions? Reply to this email or call <a href="tel:8142282822">814-228-2822</a>.</p>
            <div style="margin-top:32px;padding-top:16px;border-top:1px solid #EBE8E2;font-size:12px;color:#7A7A7A">
              PA Registered Office Services, LLC · 924 W 23rd St, Erie, PA 16502
            </div>
          </div>`
        })
      });
      results.steps.push({ step: 'welcome_email', status: 'done', via: 'emailit_direct' });
    } else {
      results.steps.push({ step: 'welcome_email', status: 'skipped', reason: 'No email service available' });
    }
  } catch (e) {
    results.steps.push({ step: 'welcome_email', status: 'error', error: e.message });
  }

  // ── STEP 5: Acumbamail ────────────────────────────────────────────────
  try {
    const acuKey = process.env.ACUMBAMAIL_API_KEY || '0cdbad074aa140a5bf7274027a53f780';
    await fetch('https://acumbamail.com/api/1/addSubscriber/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auth_token: acuKey, list_id: '1267324', email, merge_fields: { TIER: tier, NAME: name }, response_type: 'json' })
    });
    results.steps.push({ step: 'acumbamail', status: 'done' });
  } catch (e) {
    results.steps.push({ step: 'acumbamail', status: 'warning', error: e.message });
  }

  // ── STEP 6: Welcome SMS ─────────────────────────────────────────────
  const phone = body.phone;
  if (phone) {
    try {
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
      await fetch(`${baseUrl}/api/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE' },
        body: JSON.stringify({ to: phone, type: 'welcome', data: { code: accessCode } })
      });
      results.steps.push({ step: 'welcome_sms', status: 'done', to: phone });
    } catch (e) {
      results.steps.push({ step: 'welcome_sms', status: 'warning', error: e.message });
    }
  } else {
    results.steps.push({ step: 'welcome_sms', status: 'skipped', reason: 'No phone number provided' });
  }

  // ── STEP 7: Service Agreement Generation ────────────────────────────
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
    const agreeRes = await fetch(`${baseUrl}/api/generate-agreement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE' },
      body: JSON.stringify({ email, name, entityName: body.entityName || '', entityType: body.entityType || '', tier, dosNumber: body.dosNumber || '' })
    });
    const agreeData = await agreeRes.json().catch(() => ({}));
    results.steps.push({ step: 'service_agreement', status: agreeData.success ? 'done' : 'warning', pdf_url: agreeData.pdf_url || null });
  } catch (e) {
    results.steps.push({ step: 'service_agreement', status: 'warning', error: e.message });
  }

  // ── STEP 8: Entity Verification (if entity info provided) ──────────
  if (body.entityName || body.dosNumber) {
    try {
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
      const verifyRes = await fetch(`${baseUrl}/api/entity-monitor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE' },
        body: JSON.stringify({ entityName: body.entityName, dosNumber: body.dosNumber, email })
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      results.steps.push({ step: 'entity_verification', status: 'done', entity_status: verifyData.status || 'checked' });
    } catch (e) {
      results.steps.push({ step: 'entity_verification', status: 'warning', error: e.message });
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────
  const errors = results.steps.filter(s => s.status === 'error');
  const warnings = results.steps.filter(s => s.status === 'warning' || s.status === 'pending' || s.status === 'deferred');
  results.summary = {
    total_steps: results.steps.length,
    completed: results.steps.filter(s => s.status === 'done').length,
    errors: errors.length,
    warnings: warnings.length,
    needs_attention: [...results.warnings, ...warnings.map(w => w.reason || w.error)].filter(Boolean)
  };

  return res.status(errors.length > 2 ? 500 : 200).json({ success: errors.length < 3, ...results });
}
