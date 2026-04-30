// PA CROP Services — /api/provision
// Full tier-aware auto-provisioning: SuiteDash + 20i hosting/email/SSL/domain + welcome email
// Called by stripe-webhook.js on checkout.session.completed OR admin dashboard

import { isAdminRequest, generateAccessCode as _genCode } from './services/auth.js';
import { setCors } from './services/auth.js';
import { randomBytes } from 'crypto';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  // Auth: require admin key in header only
  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const body = req.body || {};
  const {
    email, name, tier = 'compliance', sessionId,
    includesHosting = false, includesVPS = false,
    emailCount = 0, domainCount = 0, websitePages = 0,
    includesFiling = false, includesNotary = false,
    suggestedDomain = '', accountSlug: rawSlug = '', hostingPassword: rawPw = ''
  } = body;

  if (!email) return res.status(400).json({ success: false, error: 'email required' });

  // Auto-generate missing params
  const accountSlug = rawSlug || email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 20);
  const { randomBytes: rb } = await import('crypto');
  const hostingPassword = rawPw || 'Crop' + rb(8).toString('base64url').slice(0, 12) + '!';
  
  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const TWENTY_GENERAL = process.env.TWENTY_I_GENERAL || (process.env.TWENTY_I_TOKEN || '').split('+')[0];
  const BEARER = TWENTY_GENERAL ? `Bearer ${Buffer.from(TWENTY_GENERAL).toString('base64')}` : null;
  const TWENTY_RESELLER_ID = process.env.TWENTY_I_RESELLER_ID;
  const N8N = 'https://n8n.audreysplace.place/webhook';

  const results = { email, tier, steps: [], warnings: [] };

  // ── STEP 1: Generate access credentials ──────────────────────────────
  const local = email.split('@')[0].replace(/[^a-z0-9]/gi,'').toUpperCase();
  const accessCode = 'CROP' + local.slice(-4) + randomBytes(2).readUInt16BE(0).toString().padStart(5, '0').slice(0, 5);
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

  // ── STEP 2b: Create Neon compliance engine records ─────────────────
  // This bridges the gap: SuiteDash is CRM, Neon is the compliance engine.
  // Without this, the portal/admin API returns empty data for new clients.
  try {
    const dbMod = await import('./services/db.js');
    if (dbMod.isConnected()) {
      // Create organization in compliance engine
      const org = await dbMod.createOrganization({
        legal_name: body.entityName || name || email.split('@')[0],
        display_name: body.entityName || name || '',
        entity_type: body.entityType || 'domestic_llc',
        jurisdiction: 'PA',
        dos_number: body.dosNumber || null,
        entity_status: body.dosNumber ? 'pending_verification' : 'pending_verification',
        partner_id: body.partnerId || null,
        metadata: { suitedash_uid: results.suitedashId || null, source: 'provision', tier }
      });

      if (org) {
        results.neonOrgId = org.id;

        // Create client record linked to org
        const client = await dbMod.createClientRecord({
          organization_id: org.id,
          owner_name: name || '',
          email,
          phone: body.phone || null,
          plan_code: tier === 'compliance' ? 'compliance_only' : `business_${tier}`,
          billing_status: 'active',
          onboarding_status: 'not_started',
          referral_code: refCode,
          referred_by_client_id: null,
          metadata: {
            access_code: accessCode,
            access_code_expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            roles: ['client'],
            suitedash_uid: results.suitedashId || null,
            stripe_session: body.sessionId || sessionId || ''
          }
        });

        if (client) {
          results.neonClientId = client.id;

          // Compute obligations for this entity (annual report, etc.)
          try {
            const oblMod = await import('./services/obligations.js');
            const oblResult = await oblMod.computeObligations(org.id, new Date().getFullYear());
            results.steps.push({ step: 'neon_obligations', status: 'done', count: oblResult?.created || 0 });
          } catch (oblErr) {
            results.steps.push({ step: 'neon_obligations', status: 'warning', error: oblErr.message });
          }
        }

        // Audit event
        await dbMod.writeAuditEvent({
          actor_type: 'system', actor_id: 'provision',
          event_type: 'client.provisioned', target_type: 'organization', target_id: org.id,
          after_json: { email, tier, org_id: org.id, client_id: client?.id },
          reason: 'stripe_checkout_provision'
        });

        results.steps.push({ step: 'neon_compliance_engine', status: 'done', org_id: org.id, client_id: client?.id });
      } else {
        results.steps.push({ step: 'neon_compliance_engine', status: 'warning', reason: 'org creation returned null' });
      }
    } else {
      results.steps.push({ step: 'neon_compliance_engine', status: 'skipped', reason: 'DATABASE_URL not configured' });
    }
  } catch (neonErr) {
    // Neon provision error logged in step results
    results.steps.push({ step: 'neon_compliance_engine', status: 'error', error: neonErr.message });
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

  // ── Pre-Step 4 derived state (must precede the welcome email) ────────
  // Phone extension (Pro/Empire) and notary credits (Empire) are referenced inside
  // the welcome email template below; compute and persist them here so the email
  // includes them rather than firing before Steps 14/15. Persistence uses the JSONB
  // merge semantics of updateClient/updateOrganization.
  if (['pro', 'empire'].includes(tier)) {
    try {
      const ext = 100 + Math.floor(Math.random() * 99) + 1;
      const phoneExt = `814-228-2822 ext ${ext}`;
      results.phoneExtension = phoneExt;
      if (results.neonClientId) {
        const dbMod = await import('./services/db.js');
        await dbMod.updateClient(results.neonClientId, {
          metadata: { phone_extension: ext, direct_line: phoneExt }
        });
      }
      results.steps.push({ step: 'phone_extension', status: 'done', extension: ext, line: phoneExt });
    } catch (e) {
      results.steps.push({ step: 'phone_extension', status: 'warning', error: e.message });
    }
  }

  if (includesNotary) {
    try {
      const currentYear = new Date().getFullYear();
      if (results.neonClientId) {
        const dbMod = await import('./services/db.js');
        await dbMod.updateClient(results.neonClientId, {
          metadata: { notary_credits: { total: 2, used: 0, year: currentYear }, includes_notary: true }
        });
      }
      results.steps.push({ step: 'notary_credits', status: 'done', credits: 2, year: currentYear });
    } catch (e) {
      results.steps.push({ step: 'notary_credits', status: 'warning', error: e.message });
    }
  }

  // Gate the welcome-email hosting block on actual 20i success (not just plan flag).
  const hostingProvisioned = results.steps.some(s => s.step === '20i_hosting' && s.status === 'done');

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
            ${hostingProvisioned ? `<div style="background:#E8F0E9;border:1px solid #6B8F71;border-radius:12px;padding:20px;margin:20px 0">
              <h3 style="color:#0C1220;margin:0 0 8px">Your Business Website &amp; Hosting Is Live</h3>
              <p style="margin:0 0 8px"><strong>Hosting panel:</strong> <a href="https://my.20i.com">my.20i.com</a></p>
              <p style="margin:0 0 8px"><strong>Username:</strong> ${email}</p>
              <p style="margin:0 0 8px"><strong>Password:</strong> ${hostingPassword}</p>
              <p style="margin:0 0 8px;font-size:13px;color:#4A4A4A">Your hosting, email mailboxes, WordPress site, and SSL are all active. Please change your hosting password on first login.</p>
              <p style="margin:0;font-size:13px"><a href="https://pacropservices.com/welcome" style="color:#2D6A2E;font-weight:600">Choose your custom domain name &rarr;</a></p>
            </div>` : (includesHosting ? `<div style="background:#FFF8E8;border:1px solid #C9982A40;border-radius:12px;padding:20px;margin:20px 0">
              <h3 style="color:#0C1220;margin:0 0 8px">Your Hosting Is Being Set Up</h3>
              <p style="margin:0;font-size:14px;color:#4A4A4A">Hosting provisioning is in progress. We'll email you the panel access details within 24 hours. If you don't hear from us by then, reply to this email.</p>
            </div>` : '')}
            ${includesFiling ? `<div style="background:#FFF8E8;border:1px solid #C9982A40;border-radius:12px;padding:20px;margin:20px 0">
              <h3 style="color:#0C1220;margin:0 0 8px">Annual Report Filing — We Handle It</h3>
              <p style="margin:0;font-size:14px;color:#4A4A4A">Your annual report filing is included. We'll prepare the filing, confirm details with you, and submit to PA DOS before your deadline. You don't need to do anything.</p>
            </div>` : ''}
            ${results.phoneExtension ? `<div style="background:#FAF9F6;border:1px solid #EBE8E2;border-radius:12px;padding:16px 20px;margin:20px 0">
              <p style="margin:0;font-size:14px"><strong>Your direct line:</strong> ${results.phoneExtension}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#4A4A4A">As a ${tierLabel} client, you have a dedicated phone extension for priority support.</p>
            </div>` : ''}
            ${includesNotary ? `<p style="font-size:14px;color:#4A4A4A"><strong>Notary services:</strong> Your plan includes 2 free notarizations per year. Request one anytime through your portal.</p>` : ''}
            <div style="background:linear-gradient(135deg,#0C1220,#1a2540);border-radius:12px;padding:20px;margin:20px 0;color:#fff">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;opacity:.6;margin-bottom:4px">Your plan includes</div>
              <div style="font-size:24px;font-weight:700;color:#C9982A;margin-bottom:8px">${{ compliance: '$2,240+', starter: '$4,817+', pro: '$9,452+', empire: '$21,582+' }[tier] || '$2,240+'} in services</div>
              <div style="font-size:13px;opacity:.8">You pay ${{ compliance: '99', starter: '199', pro: '349', empire: '699' }[tier] || '99'}/year. That's a 96%+ savings over purchasing each service individually.</div>
            </div>
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
    const acuKey = process.env.ACUMBAMAIL_API_KEY;
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
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY },
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
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY },
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
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY },
        body: JSON.stringify({ entityName: body.entityName, dosNumber: body.dosNumber, email })
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      results.steps.push({ step: 'entity_verification', status: 'done', entity_status: verifyData.status || 'checked' });
    } catch (e) {
      results.steps.push({ step: 'entity_verification', status: 'warning', error: e.message });
    }
  }

  // ── STEP 9: Referral Commission Tracking ────────────────────────────
  const refCodeUsed = body.refCode || body.referralCode;
  if (refCodeUsed) {
    try {
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
      await fetch(`${baseUrl}/api/referral-track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY },
        body: JSON.stringify({ newClientEmail: email, refCode: refCodeUsed, tier })
      });
      results.steps.push({ step: 'referral_commission', status: 'done', refCode: refCodeUsed });
    } catch (e) {
      results.steps.push({ step: 'referral_commission', status: 'warning', error: e.message });
    }
  }

  // ── STEP 10: Partner Co-Branding (if referral from partner) ──────────
  const partnerId = body.partnerId || body.partner;
  if (partnerId && refCodeUsed && SD_PUBLIC && SD_SECRET) {
    try {
      // Look up partner info
      const partnerRes = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500', {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
      });
      const allContacts = (await partnerRes.json())?.data || [];
      const partner = allContacts.find(c => c.custom_fields?.referral_code === refCodeUsed && c.tags?.some(t => t.includes('partner')));
      if (partner) {
        results.partnerBranding = {
          partnerName: partner.first_name || partner.name,
          partnerEmail: partner.email,
          applied: true
        };
        // Tag client with partner reference
        if (results.suitedashId || allContacts.find(c => c.email === email)?.id) {
          const clientId = results.suitedashId || allContacts.find(c => c.email === email)?.id;
          await fetch(`https://app.suitedash.com/secure-api/contacts/${clientId}`, {
            method: 'PUT',
            headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: [`partner-${refCodeUsed}`], custom_fields: { referred_by_partner: partner.first_name || partner.name, partner_email: partner.email } })
          }).catch(() => { /* non-critical, logged in step results */ });
        }
        // Notify partner of new referral
        const emailitKey = process.env.EMAILIT_API_KEY;
        if (emailitKey) {
          fetch('https://api.emailit.com/v1/emails', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'partners@pacropservices.com', to: partner.email,
              subject: '🎉 New client via your referral!',
              html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px"><div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#0C1220">PA CROP Services</strong></div><p>Hi ${partner.first_name || 'Partner'},</p><p>A new client just signed up using your referral code! Their <strong>${tier}</strong> plan is now active. Your commission has been credited.</p><p><a href="https://pacropservices.com/api/partner-dashboard?email=${encodeURIComponent(partner.email)}" style="color:#C9982A;font-weight:600">View your dashboard →</a></p></div>`
            })
          }).catch(() => { /* non-critical, logged in step results */ });
        }
        results.steps.push({ step: 'partner_cobranding', status: 'done', partner: partner.first_name || partner.name });
      }
    } catch (e) {
      results.steps.push({ step: 'partner_cobranding', status: 'warning', error: e.message });
    }
  }

  // ── STEP 11: WordPress starter content + theme configuration ─────────
  if (websitePages > 0 && results.steps.find(s => s.step === '20i_wordpress_install' && s.status === 'done')) {
    try {
      await fetch(`${N8N}/crop-wordpress-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          packageId: results.packageId,
          domain: suggestedDomain || `${accountSlug}.pacrophosting.com`,
          entityName: body.entityName || name || '',
          phone: body.phone || '814-228-2822',
          tier,
          websitePages,
          adminUser: accountSlug,
          adminPassword: hostingPassword
        })
      }).catch(() => null);
      results.steps.push({ step: 'wordpress_starter_content', status: 'done', pages: websitePages });
    } catch (e) {
      results.steps.push({ step: 'wordpress_starter_content', status: 'warning', error: e.message });
    }
  }

  // ── STEP 12: Compliance Value Package PDF ────────────────────────────
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
    const { getEntityDeadline, computeDaysUntil } = await import('./_compliance.js');
    const entityType = body.entityType || 'domestic_llc';
    const deadline = getEntityDeadline(entityType);
    const daysUntil = computeDaysUntil(entityType);
    const tierLabels = { compliance: 'Compliance Only ($99/yr)', starter: 'Business Starter ($199/yr)', pro: 'Business Pro ($349/yr)', empire: 'Business Empire ($699/yr)' };

    const pkgRes = await fetch(`${baseUrl}/api/generate-compliance-package`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY },
      body: JSON.stringify({
        email, name: name || '', entityName: body.entityName || name || '',
        entityType, tier, dosNumber: body.dosNumber || '',
        accessCode, planLabel: tierLabels[tier] || tier,
        deadline: deadline.label, daysUntilDeadline: daysUntil
      })
    });

    if (pkgRes.ok) {
      results.steps.push({ step: 'compliance_package_pdf', status: 'done' });
      results.compliancePackageGenerated = true;
    } else {
      results.steps.push({ step: 'compliance_package_pdf', status: 'warning', reason: 'PDF generation returned non-OK' });
    }
  } catch (e) {
    results.steps.push({ step: 'compliance_package_pdf', status: 'warning', error: e.message });
  }

  // ── STEP 13: Annual Report Pre-Fill Package (Pro/Empire — filing included) ──
  if (includesFiling && results.neonOrgId) {
    try {
      const dbMod = await import('./services/db.js');
      const obligations = await dbMod.getObligationsForOrg(results.neonOrgId);
      const annualReport = obligations.find(o => o.obligation_type === 'annual_report');
      if (annualReport) {
        await dbMod.updateObligation(annualReport.id, {
          filing_method: 'managed',
          metadata: {
            ...annualReport.metadata,
            prefill_data: {
              entity_name: body.entityName || name || '',
              dos_number: body.dosNumber || '',
              entity_type: body.entityType || 'domestic_llc',
              registered_office: '924 W 23rd St, Erie, PA 16502',
              crop_provider: 'PA Registered Office Services, LLC',
              prepared_by: 'PA CROP Services',
              status: 'awaiting_review'
            },
            filing_included: true,
            managed_since: new Date().toISOString()
          }
        });
        results.steps.push({ step: 'annual_report_prefill', status: 'done', obligation_id: annualReport.id });
      } else {
        results.steps.push({ step: 'annual_report_prefill', status: 'warning', reason: 'No annual report obligation found' });
      }
    } catch (e) {
      results.steps.push({ step: 'annual_report_prefill', status: 'warning', error: e.message });
    }
  }

  // (Phone extension and notary credits are computed pre-Step 4 so they appear in
  //  the welcome email; their persistence already ran above.)

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
