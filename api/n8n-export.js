// PA CROP Services — n8n Workflow JSON Export
// GET /api/n8n-export?key=ADMIN&workflow=all|ops-digest|entity-monitor|...
// Returns importable n8n workflow JSON for each cron job

const BASE = 'https://pacropservices.com/api';
const KEY = 'CROP-ADMIN-2026-IKE';

function makeWorkflow(name, cron, url, notes) {
  return {
    name: `PA CROP — ${name}`,
    nodes: [
      { id: 'trigger', type: 'n8n-nodes-base.cron', position: [250, 300], parameters: { rule: { interval: [{ field: 'cronExpression', expression: cron }] } }, typeVersion: 1 },
      { id: 'http', type: 'n8n-nodes-base.httpRequest', position: [500, 300], parameters: { method: 'GET', url, options: {} }, typeVersion: 4 },
    ],
    connections: { trigger: { main: [[{ node: 'http', type: 'main', index: 0 }]] } },
    settings: { executionOrder: 'v1' },
    meta: { notes, generatedBy: 'PA CROP Services /api/n8n-export' },
  };
}

const WORKFLOWS = {
  'ops-digest': makeWorkflow('Daily Ops Digest', '0 8 * * *', `${BASE}/ops-digest?key=${KEY}&send=true`, 'Sends daily ops summary to Ike at 8am ET'),
  'entity-monitor': makeWorkflow('Weekly Entity Monitor', '0 6 * * 1', `${BASE}/monitor-all?key=${KEY}`, 'Checks all client entities on PA DOS every Monday 6am'),
  'hosting-health': makeWorkflow('Weekly Hosting Health', '0 7 * * 1', `${BASE}/hosting-health?key=${KEY}`, 'Checks 20i hosting SSL/health every Monday 7am'),
  'churn-check': makeWorkflow('Monthly Churn Check', '0 9 1 * *', `${BASE}/churn-check?key=${KEY}`, 'Identifies at-risk clients on 1st of each month'),
  'upsell': makeWorkflow('Monthly Upsell Engine', '0 10 5 * *', `${BASE}/upsell?key=${KEY}&send=true`, 'Sends upgrade emails on 5th of each month'),
  'review-request': makeWorkflow('Monthly Review Request', '0 11 15 * *', `${BASE}/review-request?key=${KEY}`, 'Sends Google review requests on 15th of month'),
  'winback': makeWorkflow('Daily Win-Back Check', '0 9 * * *', `${BASE}/winback?key=${KEY}`, 'Escalating win-back for expired clients daily at 9am'),
  'newsletter': makeWorkflow('Monthly Newsletter', '0 10 1 * *', `${BASE}/newsletter-generate?key=${KEY}&send=true`, 'Auto-generates + sends monthly compliance newsletter'),
  'auto-article': makeWorkflow('Weekly Article Pipeline', '0 6 * * 3', `${BASE}/auto-article?key=${KEY}`, 'Generates SEO article every Wednesday 6am'),
  'client-health': makeWorkflow('Monthly Client Health Reports', '0 8 1 * *', `${BASE}/client-health-report?key=${KEY}&send=true`, 'Sends personalized health reports on 1st'),
  'backup': makeWorkflow('Daily Database Backup', '0 3 * * *', `${BASE}/backup-export?key=${KEY}&email=true`, 'Exports + emails backup at 3am daily'),
  'uptime': makeWorkflow('Uptime Monitor (5min)', '*/5 * * * *', `${BASE}/uptime-monitor?key=${KEY}`, 'Pings all endpoints every 5 minutes'),
  'analytics': makeWorkflow('Weekly Analytics Digest', '0 8 * * 5', `${BASE}/analytics-digest?key=${KEY}`, 'Content intelligence digest every Friday'),
  'chatbot-analytics': makeWorkflow('Weekly Chatbot Analysis', '0 9 * * 5', `${BASE}/chatbot-analytics?key=${KEY}`, 'Chatbot conversation insights every Friday'),
  'faq-expand': makeWorkflow('Monthly FAQ Expansion', '0 11 10 * *', `${BASE}/faq-expand?key=${KEY}`, 'Generates new FAQ entries on 10th of month'),
  'partner-reports': makeWorkflow('Monthly Partner Reports', '0 10 1 * *', `${BASE}/partner-report?key=${KEY}&send=true`, 'Sends partner performance reports on 1st'),
  'legislative': makeWorkflow('Weekly Legislative Monitor', '0 7 * * 2', `${BASE}/legislative-monitor?key=${KEY}`, 'Scans PA legislation every Tuesday 7am'),
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) return res.status(401).json({ error: 'Unauthorized' });

  const workflow = req.query?.workflow || 'list';

  if (workflow === 'list') {
    return res.status(200).json({
      success: true,
      workflows: Object.entries(WORKFLOWS).map(([id, wf]) => ({
        id, name: wf.name, cron: wf.nodes[0].parameters.rule.interval[0].expression,
        url: wf.nodes[1].parameters.url, notes: wf.meta.notes
      })),
      total: Object.keys(WORKFLOWS).length,
      importInstructions: 'GET /api/n8n-export?key=ADMIN&workflow=<id> to get importable JSON. In n8n: Workflows → Import from URL or paste JSON.',
    });
  }

  if (workflow === 'all') {
    return res.status(200).json({ success: true, workflows: WORKFLOWS, total: Object.keys(WORKFLOWS).length });
  }

  const wf = WORKFLOWS[workflow];
  if (!wf) return res.status(400).json({ error: `Unknown workflow: ${workflow}`, available: Object.keys(WORKFLOWS) });

  // Return as importable n8n JSON
  return res.status(200).json(wf);
}
