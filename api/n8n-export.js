// PA CROP Services — n8n Workflow JSON Export
// GET /api/n8n-export&workflow=all|ops-digest|entity-monitor|...
// Returns importable n8n workflow JSON for each cron job
//
// SECURITY: Admin key is passed via X-Admin-Key header in n8n HTTP Request node,
// never embedded in URLs (which appear in server logs and n8n execution history).
// In n8n: use a Credential of type "Header Auth" with name "X-Admin-Key" and your key value.

const BASE = 'https://pacropservices.com/api';

// n8n HTTP Request node: auth via header credential reference.
// The actual key is stored in n8n Credentials, not in the workflow JSON.
const HEADER_AUTH = {
  headerParameters: {
    parameters: [{ name: 'X-Admin-Key', value: '={{ $credentials.paAdminKey }}' }]
  }
};

function makeWorkflow(name, cron, url, notes) {
  return {
    name: `PA CROP — ${name}`,
    nodes: [
      { id: 'trigger', type: 'n8n-nodes-base.cron', position: [250, 300], parameters: { rule: { interval: [{ field: 'cronExpression', expression: cron }] } }, typeVersion: 1 },
      { id: 'http', type: 'n8n-nodes-base.httpRequest', position: [500, 300], parameters: { method: 'GET', url, options: HEADER_AUTH }, typeVersion: 4 },
    ],
    connections: { trigger: { main: [[{ node: 'http', type: 'main', index: 0 }]] } },
    settings: { executionOrder: 'v1' },
    meta: { notes, generatedBy: 'PA CROP Services /api/n8n-export', authNote: 'Add PA Admin Key as n8n Header Auth credential named paAdminKey' },
  };
}

const WORKFLOWS = {
  'ops-digest': makeWorkflow('Daily Ops Digest', '0 8 * * *', `${BASE}/ops-digest?send=true`, 'Sends daily ops summary to Ike at 8am ET'),
  'entity-monitor': makeWorkflow('Weekly Entity Monitor', '0 6 * * 1', `${BASE}/monitor-all`, 'Checks all client entities on PA DOS every Monday 6am'),
  'hosting-health': makeWorkflow('Weekly Hosting Health', '0 7 * * 1', `${BASE}/hosting-health`, 'Checks 20i hosting SSL/health every Monday 7am'),
  'churn-check': makeWorkflow('Monthly Churn Check', '0 9 1 * *', `${BASE}/churn-check`, 'Identifies at-risk clients on 1st of each month'),
  'upsell': makeWorkflow('Monthly Upsell Engine', '0 10 5 * *', `${BASE}/upsell?send=true`, 'Sends upgrade emails on 5th of each month'),
  'review-request': makeWorkflow('Monthly Review Request', '0 11 15 * *', `${BASE}/review-request`, 'Sends Google review requests on 15th of month'),
  'winback': makeWorkflow('Daily Win-Back Check', '0 9 * * *', `${BASE}/winback`, 'Escalating win-back for expired clients daily at 9am'),
  'newsletter': makeWorkflow('Monthly Newsletter', '0 10 1 * *', `${BASE}/newsletter-generate?send=true`, 'Auto-generates + sends monthly compliance newsletter'),
  'auto-article': makeWorkflow('Weekly Article Pipeline', '0 6 * * 3', `${BASE}/auto-article`, 'Generates SEO article every Wednesday 6am'),
  'client-health': makeWorkflow('Monthly Client Health Reports', '0 8 1 * *', `${BASE}/client-health-report?send=true`, 'Sends personalized health reports on 1st'),
  'backup': makeWorkflow('Daily Database Backup', '0 3 * * *', `${BASE}/backup-export?email=true`, 'Exports + emails backup at 3am daily'),
  'uptime': makeWorkflow('Uptime Monitor (5min)', '*/5 * * * *', `${BASE}/uptime-monitor`, 'Pings all endpoints every 5 minutes'),
  'analytics': makeWorkflow('Weekly Analytics Digest', '0 8 * * 5', `${BASE}/analytics-digest`, 'Content intelligence digest every Friday'),
  'chatbot-analytics': makeWorkflow('Weekly Chatbot Analysis', '0 9 * * 5', `${BASE}/chatbot-analytics`, 'Chatbot conversation insights every Friday'),
  'faq-expand': makeWorkflow('Monthly FAQ Expansion', '0 11 10 * *', `${BASE}/faq-expand`, 'Generates new FAQ entries on 10th of month'),
  'partner-reports': makeWorkflow('Monthly Partner Reports', '0 10 1 * *', `${BASE}/partner-report?send=true`, 'Sends partner performance reports on 1st'),
  'legislative': makeWorkflow('Weekly Legislative Monitor', '0 7 * * 2', `${BASE}/legislative-monitor`, 'Scans PA legislation every Tuesday 7am'),
};

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('n8n-export');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

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
  if (!wf) return res.status(400).json({ success: false, error: `Unknown workflow: ${workflow}`, available: Object.keys(WORKFLOWS) });

  // Return as importable n8n JSON
  return res.status(200).json(wf);
  } catch (err) {
    log.error('n8n_export_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
}
