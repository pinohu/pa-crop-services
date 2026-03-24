// PA CROP Services — Franchise/White-Label Setup Automation
// POST /api/franchise-setup { partnerName, partnerEmail, domain, branding }
// Generates complete white-label instance config using SuiteDash + 20i

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) return res.status(401).json({ error: 'Unauthorized' });

  const { partnerName, partnerEmail, domain, branding, specialization } = req.body || {};
  if (!partnerName || !partnerEmail) return res.status(400).json({ error: 'partnerName and partnerEmail required' });

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
    }).catch(() => {});
  }

  return res.status(200).json({ success: true, ...setup });
  } catch (err) {
    console.error("franchise-setup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
