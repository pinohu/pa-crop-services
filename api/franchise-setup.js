// PA CROP Services — Franchise/White-Label Setup Automation
// POST /api/franchise-setup { partnerName, partnerEmail, domain, branding }
// Generates complete white-label instance config using SuiteDash + 20i

import { isAdminRequest, setCors } from './services/auth.js';
import * as db from './services/db.js';
import { createLogger } from './_log.js';
import { isValidEmail, isValidString } from './_validate.js';

const log = createLogger('franchise-setup');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  const { partnerName, partnerEmail, domain, branding, specialization } = req.body || {};
  if (!partnerName || !partnerEmail) return res.status(400).json({ success: false, error: 'partnerName and partnerEmail required' });
  if (!isValidEmail(partnerEmail)) return res.status(400).json({ success: false, error: 'invalid_email' });
  if (!isValidString(partnerName, { maxLength: 200 })) return res.status(400).json({ success: false, error: 'partnerName too long' });
  if (domain && !isValidString(domain, { maxLength: 253 })) return res.status(400).json({ success: false, error: 'domain too long' });

  const slug = partnerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20);
  const setup = {
    partner: { name: partnerName, email: partnerEmail, slug },
    suitedash: {
      license: 'Allocate 1 of 135 available SuiteDash licenses',
      config: {
        companyName: partnerName,
        domain: domain || `${slug}.pacropservices.com`,
        branding: branding || { primaryColor: '#0C1220', accentColor: '#C9982A' },
        portalUrl: `https://${domain || slug + '.pacropservices.com'}/portal`,
      },
      steps: [
        'Create new SuiteDash instance from template',
        'Configure company branding (name, logo, colors)',
        'Set up custom domain in SuiteDash',
        'Import service templates and workflows',
        'Create partner admin account',
        'Configure automated onboarding sequence',
      ]
    },
    hosting: {
      provider: '20i (from reseller account)',
      domain: domain || `${slug}.pacropservices.com`,
      includes: ['SSL certificate', 'Email forwarding', 'WordPress template (optional)'],
    },
    revenue: {
      model: '70/30 split (partner keeps 70%, PA CROP keeps 30%)',
      billing: 'PA CROP handles all Stripe billing',
      reporting: 'Monthly partner report via /api/partner-report',
    },
    next_steps: [
      `Provision SuiteDash instance for ${partnerName}`,
      `Set up domain ${domain || slug + '.pacropservices.com'}`,
      `Create 20i hosting package`,
      `Configure partner admin access`,
      `Generate co-branded marketing materials`,
    ]
  };

  // Notify Ike of franchise request
  const emailitKey = process.env.EMAILIT_API_KEY;
  if (emailitKey) {
    await fetch('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'partners@pacropservices.com', to: 'hello@pacropservices.com',
        subject: `🏢 New Franchise Request: ${partnerName}`,
        html: `<pre>${JSON.stringify(setup, null, 2)}</pre>`
      })
    }).catch(e => log.warn('external_call_failed', { error: e.message }));
  }

  // Audit trail for franchise requests
  if (db.isConnected()) {
    db.writeAuditEvent({
      actor_type: 'admin', actor_id: 'admin_key',
      event_type: 'franchise.setup_requested',
      target_type: 'partner', target_id: partnerEmail,
      after_json: { partnerName, domain: setup.suitedash.config.domain, slug },
      reason: 'franchise_setup'
    }).catch(() => {});
  }

  return res.status(200).json({ success: true, ...setup });
  } catch (err) {
    log.error('franchise_setup_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
