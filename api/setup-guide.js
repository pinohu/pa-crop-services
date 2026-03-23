// PA CROP Services — Complete Setup Guide for Dashboard Configs
// GET /api/setup-guide?key=ADMIN&section=all|suitedash|stripe|n8n|thoughtly|callscaler
// Returns step-by-step configuration instructions for all external tools

const GUIDES = {
  stripe: {
    title: 'Stripe — Convert to Subscriptions',
    priority: 'CRITICAL — #1 revenue automation gap',
    estimatedTime: '30 minutes',
    steps: [
      { step: 1, action: 'Go to Stripe Dashboard → Products', url: 'https://dashboard.stripe.com/products' },
      { step: 2, action: 'For each product (Compliance $99, Starter $199, Pro $349, Empire $699): Click product → Pricing → Add price → Select "Recurring" → "Yearly" → Enter amount → Save' },
      { step: 3, action: 'Create new Payment Links from the recurring prices: Products → Select product → Create payment link → Copy new URL' },
      { step: 4, action: 'Update index.html pricing section with new Stripe checkout URLs (replace buy.stripe.com links)' },
      { step: 5, action: 'Add webhook endpoint: Developers → Webhooks → Add endpoint → URL: https://pacropservices.com/api/stripe-webhook → Select events: checkout.session.completed, invoice.payment_failed, customer.subscription.deleted' },
      { step: 6, action: 'Copy webhook signing secret → Add as STRIPE_WEBHOOK_SECRET in Vercel env vars' },
    ],
    currentLinks: {
      compliance: 'buy.stripe.com/6oU9AUcheaD173I2Ys6sw0c',
      starter: 'buy.stripe.com/28E7sM80YdPdewa42w6sw09',
      pro: 'buy.stripe.com/7sY4gAepm12rbjYaqU6sw0a',
      empire: 'buy.stripe.com/cNi4gAgxueTh9bQaqU6sw0b',
    }
  },
  n8n: {
    title: 'n8n — Create 17 Cron Workflows',
    priority: 'HIGH — activates all scheduled automations',
    estimatedTime: '45 minutes',
    url: 'https://n8n.audreysplace.place',
    quickMethod: 'Import JSON from /api/n8n-export?key=CROP-ADMIN-2026-IKE&workflow=<id>',
    steps: [
      { step: 1, action: 'Go to n8n dashboard: https://n8n.audreysplace.place' },
      { step: 2, action: 'For each workflow: Click + New Workflow → Import from JSON → Paste JSON from /api/n8n-export' },
      { step: 3, action: 'Activate each workflow (toggle ON)' },
      { step: 4, action: 'Test each by clicking "Execute Workflow" manually once' },
    ],
    workflows: '17 total — see /api/n8n-export?key=CROP-ADMIN-2026-IKE&workflow=list for full list',
  },
  suitedash: {
    title: 'SuiteDash — 10 Native Automations',
    priority: 'MEDIUM — enhances CRM without new code',
    estimatedTime: '2-3 hours',
    url: 'https://app.suitedash.com',
    configurations: [
      { name: 'Drip Campaign — Client Onboarding', section: 'Marketing → Drip Campaigns', steps: ['Create campaign "New Client Onboarding"', 'Email 1 (Day 0): Welcome + portal access', 'Email 2 (Day 3): Complete your profile', 'Email 3 (Day 7): Your first compliance check', 'Email 4 (Day 14): Tips for staying compliant', 'Trigger: Contact tag = crop-active'] },
      { name: 'Drip Campaign — Lead Nurture', section: 'Marketing → Drip Campaigns', steps: ['Create campaign "Lead Nurture"', 'Email 1 (Day 0): Your compliance report', 'Email 2 (Day 3): Case study', 'Email 3 (Day 7): Urgency — dissolution risk', 'Email 4 (Day 14): Last chance offer', 'Trigger: Contact tag = lead AND NOT crop-active'] },
      { name: 'Onboarding Workflow', section: 'Workflows → Create Workflow', steps: ['Trigger: New contact with tag crop-active', 'Task 1: Verify entity on PA DOS', 'Task 2: Set up compliance calendar', 'Task 3: Send welcome packet', 'Task 4: First 30-day check-in'] },
      { name: 'Recurring Invoicing', section: 'Invoicing → Settings', steps: ['Enable recurring invoices', 'Create invoice template for each tier', 'Set annual recurrence on client creation', 'Enable auto-send'] },
      { name: 'Proposal Template', section: 'Proposals → Templates', steps: ['Create "PA CROP Service Agreement" template', 'Add: service scope, pricing, terms', 'Enable e-signature', 'Auto-convert to project on signature'] },
      { name: 'Project Templates (4)', section: 'Projects → Templates', steps: ['Create template for each tier: Compliance, Starter, Pro, Empire', 'Add tier-specific tasks and milestones', 'Set auto-create on contact tier tag'] },
      { name: 'Internal Task Assignment', section: 'Workflows → Tasks', steps: ['On new client: auto-create task "Verify entity"', 'Assign to default team member', 'Set due date: 1 business day', 'Add follow-up task at 30 days'] },
      { name: 'NPS Survey', section: 'Surveys → Create Survey', steps: ['Create "Client Satisfaction" survey (1-10 scale)', 'Schedule: 90 days after signup + quarterly', 'Auto-send via email', 'Track results in contact record'] },
      { name: 'Appointment Scheduling', section: 'Calendar → Settings', steps: ['Enable booking page', 'Set availability hours', 'Create service: "Compliance Review (30 min)"', 'Auto-create SuiteDash activity on booking'] },
      { name: 'White-Label Portal (per partner)', section: 'Settings → Company', steps: ['For each partner: duplicate portal config', 'Update: company name, logo, colors', 'Set custom domain (e.g. partner.pacropservices.com)', 'Import templates and workflows'] },
    ]
  },
  thoughtly: {
    title: 'Thoughtly — AI Voice Agent',
    priority: 'LOW — nice to have for hot lead calls',
    estimatedTime: '1 hour',
    apiKey: '0dy3971e2bgvrk3y6j1cs9l',
    steps: [
      { step: 1, action: 'Login to Thoughtly dashboard' },
      { step: 2, action: 'Create new agent: "PA CROP Hot Lead Caller"' },
      { step: 3, action: 'Script: "Hi, this is the PA CROP Services compliance team. You recently checked your compliance status and we noticed some areas that may need attention. Do you have a moment to discuss how we can help protect your business entity?"' },
      { step: 4, action: 'Set trigger: n8n webhook calls Thoughtly API when lead score > 7' },
      { step: 5, action: 'Test with your own phone number first' },
    ]
  },
  callscaler: {
    title: 'CallScaler — Inbound Call Logging',
    priority: 'LOW — call tracking and CRM integration',
    apiKey: '120|ZPLZosyaRbCmkwTs01wRtYxtfJt1m9SUUTcBzz7K',
    steps: [
      { step: 1, action: 'Login to CallScaler dashboard' },
      { step: 2, action: 'Set up tracking number forwarding to 814-228-2822' },
      { step: 3, action: 'Configure webhook: POST to https://n8n.audreysplace.place/webhook/crop-call-log on call complete' },
      { step: 4, action: 'n8n workflow: receive call data → match caller to SuiteDash contact → log activity' },
    ]
  },
  appsumo_tools: {
    title: 'AppSumo Tool Connections (11 tools)',
    priority: 'MEDIUM — unlocks video, content, and automation features',
    estimatedTime: '30 min per tool',
    steps: [
      { step: 1, action: 'For each tool, find the API key in your AppSumo/tool dashboard' },
      { step: 2, action: 'Add as Vercel env var using the key name from /api/tool-connector' },
      { step: 3, action: 'Test via: POST /api/tool-connector { "tool":"vadoo", "action":"list_videos" }' },
    ],
    envVars: {
      VADOO_API_KEY: 'Vadoo AI — video generation',
      FLIKI_API_KEY: 'Fliki — text-to-video',
      CASTMAGIC_API_KEY: 'Castmagic — podcast generation',
      SUBSCRIBR_API_KEY: 'Subscribr — YouTube strategy',
      TAJA_API_KEY: 'Taja — YouTube SEO',
      VILOUD_API_KEY: 'Viloud — 24/7 streaming',
      SCRIBEBUILDER_API_KEY: 'ScribeBuilder — social media',
      KONNECTZIT_API_KEY: 'KonnectzIT — automation backup',
      ACTIVEPIECES_API_KEY: 'Activepieces — automation redundancy',
      BRIZY_API_KEY: 'Brizy Cloud — landing pages',
      USPS_API_KEY: 'USPS Informed Delivery',
    }
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) return res.status(401).json({ error: 'Unauthorized' });

  const section = req.query?.section || 'all';

  if (section === 'all') {
    return res.status(200).json({ success: true, guides: GUIDES, sections: Object.keys(GUIDES), totalConfigItems: 25 });
  }

  const guide = GUIDES[section];
  if (!guide) return res.status(400).json({ error: `Unknown section. Available: ${Object.keys(GUIDES).join(', ')}` });

  return res.status(200).json({ success: true, ...guide });
}
