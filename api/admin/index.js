// PA CROP Services — /api/admin
// Secure admin API — reads Neon Postgres + SuiteDash + 20i + Stripe
// POST { action, payload, adminKey }

import * as db from '../services/db.js';
import { fetchWithTimeout } from '../_fetch.js';
import { createLogger } from '../_log.js';

const log = createLogger('admin');

import { timingSafeEqual } from 'crypto';
import { setCors } from '../services/auth.js';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;
if (!ADMIN_KEY && process.env.NODE_ENV !== 'test') {
  throw new Error('FATAL: ADMIN_SECRET_KEY is required');
}
const ADMIN_KEY_VALUE = ADMIN_KEY || '';
const SD_BASE = 'https://app.suitedash.com/secure-api';
const TWENTY_I_BASE = 'https://api.20i.com';
const ACUMBA_TOKEN = process.env.ACUMBAMAIL_API_KEY;
const DOCUMENTERO_KEY = process.env.DOCUMENTERO_API_KEY;

async function sdFetch(path, opts = {}) {
  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  try {
    const res = await fetchWithTimeout(`${SD_BASE}${path}`, {
      ...opts,
      headers: {
        'X-Public-ID': SD_PUBLIC,
        'X-Secret-Key': SD_SECRET,
        'Content-Type': 'application/json',
        ...(opts.headers || {})
      }
    });
    return res.json();
  } catch (e) {
    throw Object.assign(e, { context: `sdFetch ${path}` });
  }
}

async function twentyiFetch(path, opts = {}) {
  // 20i requires Bearer token to be base64-encoded general API key
  const GENERAL_KEY = process.env.TWENTY_I_GENERAL || process.env.TWENTY_I_TOKEN?.split('+')[0];
  if (!GENERAL_KEY) return { error: '20i token not configured' };

  // base64-encode the general key as required by 20i API docs
  const BEARER_B64 = Buffer.from(GENERAL_KEY).toString('base64');

  try {
    const res = await fetchWithTimeout(`${TWENTY_I_BASE}${path}`, {
      ...opts,
      headers: {
        'Authorization': `Bearer ${BEARER_B64}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(opts.headers || {})
      }
    });
    return res.json().catch(() => ({ error: 'Invalid JSON from 20i', status: res.status }));
  } catch (e) {
    throw Object.assign(e, { context: `twentyiFetch ${path}` });
  }
}

async function stripeFetch(path) {
  const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
  try {
    const res = await fetchWithTimeout(`https://api.stripe.com/v1${path}`, {
      headers: { 'Authorization': `Bearer ${STRIPE_KEY}` }
    });
    return res.json();
  } catch (e) {
    throw Object.assign(e, { context: `stripeFetch ${path}` });
  }
}

// ── Emailit Fallback Notifier ──
async function _notifyIke(subject, body) {
  const key = process.env.EMAILIT_API_KEY;
  if (!key) { log.warn('emailit_not_configured', { subject }); return; }
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
  } catch (e) { log.error('emailit_fallback_failed', {}, e); }
}

export default async function handler(req, res) {
  setCors(req, res);
  // Restrict CORS to admin dashboard origins
  const origin = req.headers.origin || '';
  const allowedOrigins = ['https://pacropservices.com', 'https://www.pacropservices.com', 'https://pa-crop-services.vercel.app'];
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.VERCEL_ENV === 'preview') {
    res.setHeader('Access-Control-Allow-Origin', origin || allowedOrigins[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Auth check — only from header, timing-safe comparison
  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || typeof adminKey !== 'string') {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  // Hash both values to prevent length-based timing leaks
  const ha = (await import('crypto')).createHmac('sha256', 'crop-admin').update(adminKey).digest();
  const hb = (await import('crypto')).createHmac('sha256', 'crop-admin').update(ADMIN_KEY_VALUE).digest();
  if (!timingSafeEqual(ha, hb)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { action, payload = {} } = req.body || {};

  try {
    switch (action) {

      // ── Dashboard Overview ────────────────────────────────────────────
      case 'dashboard': {
        // Try Neon Postgres first for clean data
        let neonClients = null;
        try {
          if (db.isConnected()) {
            const sql = db.getSql();
            neonClients = await sql`SELECT id, owner_name, email, plan_code, billing_status, created_at, referral_code FROM clients ORDER BY created_at DESC LIMIT 500`;
          }
        } catch(e) { log.warn('admin_query_error', { error: e.message }); }

        if (neonClients && neonClients.length > 0) {
          const planPricing = { compliance_only: 99, business_starter: 199, business_pro: 349, business_empire: 699 };
          const planLabels = { compliance_only: 'Compliance Only', business_starter: 'Business Starter', business_pro: 'Business Pro', business_empire: 'Business Empire' };
          const planCounts = {};
          let mrr = 0, activeSubs = 0;
          neonClients.forEach(c => {
            const plan = c.plan_code || 'compliance_only';
            planCounts[plan] = (planCounts[plan] || 0) + 1;
            if (c.billing_status === 'active') { activeSubs++; mrr += (planPricing[plan] || 99) / 12; }
          });
          // Get 20i hosting count
          let hostingCount = 0;
          try { const hp = await twentyiFetch('/reseller/web'); hostingCount = Object.keys(hp || {}).length; } catch(e) { log.warn('admin_query_error', { error: e.message }); }
          return res.status(200).json({
            stats: { totalClients: neonClients.length, activeSubscriptions: activeSubs, mrr: Math.round(mrr * 100) / 100, arr: Math.round(mrr * 12 * 100) / 100, hostingPackages: hostingCount },
            planBreakdown: Object.fromEntries(Object.entries(planCounts).map(([k,v]) => [planLabels[k] || k, v])),
            recentClients: neonClients.slice(0, 10).map(c => ({
              id: c.id, name: c.owner_name || '(unnamed)', email: c.email,
              plan: c.plan_code || 'compliance_only', since: c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'New',
              score: c.billing_status === 'active' ? 85 : 40
            }))
          });
        }

        // Fall back to SuiteDash + Stripe
        const [contacts, subscriptions, packages] = await Promise.allSettled([
          sdFetch('/contacts?limit=100&role=client'),
          stripeFetch('/subscriptions?limit=100&status=active'),
          twentyiFetch('/reseller/web'),
        ]);

        const clients = contacts.status === 'fulfilled' ? (contacts.value?.data || []) : [];
        const subs = subscriptions.status === 'fulfilled' ? (subscriptions.value?.data || []) : [];
        const hosting = packages.status === 'fulfilled' ? (packages.value || {}) : {};

        const mrr = subs.reduce((sum, s) => {
          const amt = s.plan?.amount || 0;
          const interval = s.plan?.interval || 'year';
          return sum + (interval === 'year' ? amt / 12 : amt);
        }, 0) / 100;

        const arr = mrr * 12;

        const planCounts = {};
        clients.forEach(c => {
          const plan = c.custom_fields?.crop_plan || 'unknown';
          planCounts[plan] = (planCounts[plan] || 0) + 1;
        });

        return res.status(200).json({
          stats: {
            totalClients: clients.length,
            activeSubscriptions: subs.length,
            mrr: Math.round(mrr * 100) / 100,
            arr: Math.round(arr * 100) / 100,
            hostingPackages: Object.keys(hosting).length,
          },
          planBreakdown: planCounts,
          recentClients: clients.slice(0, 10).map(c => ({
            id: c.id,
            name: `${c.first_name} ${c.last_name}`.trim(),
            email: c.email,
            plan: c.custom_fields?.crop_plan || 'unknown',
            since: c.custom_fields?.crop_since || c.created_at,
            score: c.custom_fields?.lead_score || 0,
          }))
        });
      }

      // ── All Clients ───────────────────────────────────────────────────
      case 'clients': {
        const { page = 1, search = '', plan = '' } = payload;
        // Try Neon first
        try {
          if (db.isConnected()) {
            const sql = db.getSql();
            const allRows = await sql`SELECT c.id, c.owner_name, c.email, c.phone, c.plan_code, c.billing_status, c.onboarding_status, c.referral_code, c.created_at, c.metadata, o.legal_name, o.entity_type, o.dos_number FROM clients c LEFT JOIN organizations o ON c.organization_id = o.id ORDER BY c.created_at DESC LIMIT 100`;
            let rows = allRows || [];
            if (search) { const s = search.toLowerCase(); rows = rows.filter(c => (c.owner_name||'').toLowerCase().includes(s) || (c.email||'').toLowerCase().includes(s)); }
            if (plan) rows = rows.filter(c => c.plan_code === plan);
            return res.status(200).json({
              clients: rows.map(c => ({
                id: c.id, name: c.owner_name || c.legal_name || '(unnamed)', email: c.email, phone: c.phone || '',
                company: c.legal_name || '', plan: c.plan_code || 'compliance_only',
                since: c.created_at ? new Date(c.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'}) : 'New',
                hasAccessCode: !!c.metadata?.access_code, leadScore: c.billing_status === 'active' ? 85 : 30,
                referralCode: c.referral_code || '', entityType: c.entity_type || '', tags: [], createdAt: c.created_at
              })),
              total: rows.length
            });
          }
        } catch(e) { log.warn('admin_query_error', { error: e.message }); }
        // Fallback: SuiteDash
        let url = `/contacts?limit=50&offset=${(page-1)*50}&role=client`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        const data = await sdFetch(url);
        let clients = (data?.data || []).map(c => ({
          id: c.id, name: `${c.first_name} ${c.last_name}`.trim(), email: c.email, phone: c.phone,
          company: c.company, plan: c.custom_fields?.crop_plan || 'compliance_only',
          since: c.custom_fields?.crop_since, hasAccessCode: !!c.custom_fields?.portal_access_code,
          leadScore: c.custom_fields?.lead_score || 0, referralCode: c.custom_fields?.referral_code,
          entityType: c.custom_fields?.entity_type, tags: c.tags || [], createdAt: c.created_at,
        }));
        if (plan) clients = clients.filter(c => c.plan === plan);
        return res.status(200).json({ clients, total: data?.total || clients.length });
      }

      // ── Single Client Detail ──────────────────────────────────────────
      case 'client_detail': {
        const { clientId } = payload;
        const [contact, projects] = await Promise.allSettled([
          sdFetch(`/contacts/${clientId}`),
          sdFetch(`/projects?contact_id=${clientId}&limit=10`),
        ]);
        return res.status(200).json({
          contact: contact.status === 'fulfilled' ? contact.value : null,
          projects: projects.status === 'fulfilled' ? (projects.value?.data || []) : [],
        });
      }

      // ── Update Client Custom Fields ───────────────────────────────────
      case 'update_client': {
        const { clientId, fields } = payload;
        const data = await sdFetch(`/contacts/${clientId}`, {
          method: 'PUT',
          body: JSON.stringify({ custom_fields: fields })
        });
        return res.status(200).json({ success: true, data });
      }

      // ── Hosting Packages (20i) ────────────────────────────────────────
      case 'hosting': {
        const packages = await twentyiFetch('/package');
        const list = [];
        const pkgArray = Array.isArray(packages) ? packages : Object.values(packages || {});
        for (const pkg of pkgArray) {
          const id = pkg.id;
          list.push({
            id,
            name: pkg.name || id,
            domain: pkg.domain || '',
            status: pkg.active ? 'active' : 'suspended',
            diskUsed: pkg.diskUsage || 0,
            diskLimit: pkg.diskLimit || 0,
            emails: pkg.emailCount || 0,
            turbo: pkg.turbo || false,
            ssl: pkg.ssl || false,
            created: pkg.created || '',
          });
        }
        return res.status(200).json({ packages: list, total: list.length });
      }

      // ── Provision 20i Hosting ─────────────────────────────────────────
      case 'provision_hosting': {
        const { email, tierName, accountSlug, hostingPassword, suggestedDomain } = payload;
        
        // Create hosting package
        const pkg = await twentyiFetch('/reseller/' + process.env.TWENTY_I_RESELLER_ID + '/addWeb', {
          method: 'POST',
          body: JSON.stringify({
            'domain_name': suggestedDomain || accountSlug + '.com',
            type: 'standard',
            packageBundle: {
              name: `PA CROP — ${tierName}`,
              username: accountSlug,
              password: hostingPassword,
              type: 'webspace'
            }
          })
        });

        const packageId = pkg?.result?.id || pkg?.id;
        if (!packageId) return res.status(500).json({ success: false, error: 'Provisioning failed', pkg });

        // Enable SSL
        await twentyiFetch(`/package/${packageId}/ssl`, {
          method: 'POST',
          body: JSON.stringify({ domain: suggestedDomain, type: 'letsencrypt' })
        }).catch(e => log.warn('silent_failure', { error: e.message }));

        // Create StackCP user
        await twentyiFetch('/reseller/user', {
          method: 'POST',
          body: JSON.stringify({ username: email, password: hostingPassword, email })
        }).catch(e => log.warn('silent_failure', { error: e.message }));

        return res.status(200).json({ success: true, packageId, accountSlug, suggestedDomain });
      }

      // ── Stripe Revenue ────────────────────────────────────────────────
      case 'revenue': {
        const [subs, invoices] = await Promise.allSettled([
          stripeFetch('/subscriptions?limit=100&status=active&expand[]=data.customer'),
          stripeFetch('/invoices?limit=20&status=paid'),
        ]);

        const subList = subs.status === 'fulfilled' ? (subs.value?.data || []) : [];
        const invList = invoices.status === 'fulfilled' ? (invoices.value?.data || []) : [];

        const mrr = subList.reduce((sum, s) => {
          const amt = s.plan?.amount || 0;
          return sum + (s.plan?.interval === 'year' ? amt/12 : amt);
        }, 0) / 100;

        return res.status(200).json({
          mrr: Math.round(mrr * 100) / 100,
          arr: Math.round(mrr * 12 * 100) / 100,
          activeSubscriptions: subList.length,
          recentInvoices: invList.map(inv => ({
            id: inv.id,
            amount: inv.amount_paid / 100,
            currency: inv.currency,
            customer: inv.customer_email,
            date: new Date(inv.created * 1000).toISOString().split('T')[0],
            status: inv.status,
          }))
        });
      }

      // ── Lead Pipeline ─────────────────────────────────────────────────
      case 'leads': {
        // Try Neon first for lead data
        try {
          if (db.isConnected()) {
            const sql = db.getSql();
            const rows = await sql`SELECT id, owner_name, email, plan_code, billing_status, created_at, metadata FROM clients WHERE billing_status != 'active' ORDER BY created_at DESC LIMIT 50`;
            const leads = (rows||[]).map(c => ({
              id: c.id, name: c.owner_name || '(unnamed)', email: c.email,
              score: c.billing_status === 'trialing' ? 80 : 30,
              tier: c.billing_status === 'trialing' ? 'hot' : 'warm',
              source: c.metadata?.source || 'organic', entityType: c.metadata?.entity_type || '',
              createdAt: c.created_at, tags: []
            }));
            return res.status(200).json({
              leads, hot: leads.filter(l => l.tier === 'hot').length,
              warm: leads.filter(l => l.tier === 'warm').length,
              cold: leads.filter(l => l.tier === 'cold').length,
            });
          }
        } catch(e) { log.warn('admin_query_error', { error: e.message }); }
        // Fall back to SuiteDash
        const data = await sdFetch('/contacts?limit=100&role=lead');
        const leads = (data?.data || []).map(c => ({
          id: c.id, name: `${c.first_name} ${c.last_name}`.trim(), email: c.email,
          score: parseInt(c.custom_fields?.lead_score || 0), tier: c.custom_fields?.lead_tier || 'cold',
          source: c.custom_fields?.lead_source || 'unknown', entityType: c.custom_fields?.entity_type || '',
          createdAt: c.created_at, tags: c.tags || [],
        })).sort((a, b) => b.score - a.score);
        return res.status(200).json({
          leads, hot: leads.filter(l => l.tier === 'hot').length,
          warm: leads.filter(l => l.tier === 'warm').length,
          cold: leads.filter(l => l.tier === 'cold').length,
        });
      }

      // ── Generate Service Agreement (Documentero) ──────────────────────
      case 'generate_agreement': {
        const { clientName, entityName, entityNumber, entityType, clientAddress, clientEmail, tier } = payload;
        const tierFees = { compliance_only: '$99', business_starter: '$199', business_pro: '$349', business_empire: '$699' };
        
        // Native PDF generation — no external service needed
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'pacropservices.com';
        const baseUrl = `${protocol}://${host}`;
        
        const pdfRes = await fetchWithTimeout(`${baseUrl}/api/generate-agreement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': process.env.ADMIN_SECRET_KEY
          },
          body: JSON.stringify({
            client_name: clientName,
            entity_name: entityName,
            entity_number: entityNumber,
            entity_type: entityType || 'LLC',
            client_address: clientAddress,
            client_email: clientEmail,
            service_tier: tier,
            annual_fee: tierFees[tier] || '$99',
            effective_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          })
        });
        const pdfResult = await pdfRes.json();
        return res.status(200).json({ success: true, document: pdfResult });
      }

      // ── Acumbamail Stats ──────────────────────────────────────────────
      case 'email_stats': {
        const [r1, r2] = await Promise.all([
          fetchWithTimeout(`https://acumbamail.com/api/1/getListStats/?auth_token=${ACUMBA_TOKEN}&list_id=1267324&response_type=json`),
          fetchWithTimeout(`https://acumbamail.com/api/1/getListStats/?auth_token=${ACUMBA_TOKEN}&list_id=1267325&response_type=json`)
        ]);
        const [allClients, partners] = await Promise.all([r1.json(), r2.json()]);
        return res.status(200).json({
          allClients: { listId: 1267324, ...allClients },
          partners: { listId: 1267325, ...partners }
        });
      }

      // ── 20i Domain Check ──────────────────────────────────────────────
      case 'check_domain': {
        const { domain } = payload;
        const result = await twentyiFetch(`/reseller/domain-search?domain=${encodeURIComponent(domain)}`);
        return res.status(200).json(result);
      }

      // ── DOS Entity Check (trigger n8n) ────────────────────────────────
      case 'check_entity': {
        const { entityName, entityNumber } = payload;
        try {
          const r = await fetchWithTimeout('https://n8n.audreysplace.place/webhook/crop-dos-entity-checker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entityName, entityNumber })
          });
          if (r.ok) return res.status(200).json(await r.json().catch(() => ({})));
        } catch (e) { /* n8n unreachable */ }
        // Fallback: return manual check instructions
        return res.status(200).json({
          status: 'manual_check_required',
          message: 'Automated entity check unavailable. Check manually at https://www.dos.pa.gov/BusinessCharities/Business/Pages/default.aspx',
          entityName, entityNumber,
          instructions: 'Search for the entity name or DOS file number on the PA DOS website.'
        });
      }

      // ── Send Email via Emailit ─────────────────────────────────────
      case 'send_email': {
        const { to, subject, body: emailBody } = payload;
        if (!to || !subject || !emailBody) return res.status(400).json({ success: false, error: 'to, subject, and body required' });
        
        const emailitKey = process.env.EMAILIT_API_KEY;
        if (!emailitKey) {
          log.warn('emailit_not_configured', { subject });
          return res.status(200).json({ success: true, message: 'Email queued (Emailit key not configured — logged only)', to, subject });
        }
        
        const htmlBody = emailBody.includes('<') ? emailBody : 
          '<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">' +
          '<div style="border-bottom:3px solid #C9982A;padding-bottom:16px;margin-bottom:24px">' +
          '<strong style="font-size:18px;color:#0C1220">PA CROP Services</strong></div>' +
          '<div style="color:#1C1C1C;line-height:1.7;font-size:15px">' + 
          emailBody.replace(/\n/g, '<br>') + '</div>' +
          '<div style="margin-top:32px;padding-top:16px;border-top:1px solid #EBE8E2;font-size:12px;color:#7A7A7A">' +
          'PA Registered Office Services, LLC · 924 W 23rd St, Erie, PA 16502 · 814-228-2822</div></div>';
        
        const emailRes = await fetchWithTimeout('https://api.emailit.com/v1/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: 'hello@pacropservices.com', to, subject, html: htmlBody })
        });
        
        if (emailRes.ok) {
          return res.status(200).json({ success: true, message: 'Email sent to ' + to });
        } else {
          const err = await emailRes.text().catch(() => 'unknown');
          return res.status(502).json({ success: false, error: 'Email delivery failed: ' + err });
        }
      }

      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    log.error('admin_api_error', {}, err);
    return res.status(500).json({ success: false, error: 'Something went wrong. Please try again or contact hello@pacropservices.com.' });
  }
}
