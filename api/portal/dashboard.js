// PA CROP Services — Portal Dashboard
// GET /api/portal/dashboard
// Returns compliance score, upcoming deadlines (next 3), recent activity (last 10), quick stats.
// Requires: Authorization: Bearer <token>

import { setCors, authenticateRequest } from '../services/auth.js';
import { checkRateLimit, getClientIp } from '../_ratelimit.js';
import { createLogger } from '../_log.js';
import * as db from '../services/db.js';
import { computeEntityHealth } from './value.js';

const log = createLogger('portal-dashboard');

const PLAN_LABELS = {
  compliance_only: 'Compliance Only',
  business_starter: 'Business Starter',
  business_pro: 'Business Pro',
  business_empire: 'Business Empire'
};

const PLAN_PRICES = {
  compliance_only: '$99/yr',
  business_starter: '$199/yr',
  business_pro: '$349/yr',
  business_empire: '$699/yr'
};

function formatDeadline(obligation) {
  const now = new Date();
  const due = new Date(obligation.due_date);
  const daysUntil = Math.ceil((due - now) / 86400000);
  let urgency = 'normal';
  if (daysUntil < 0) urgency = 'overdue';
  else if (daysUntil <= 14) urgency = 'critical';
  else if (daysUntil <= 30) urgency = 'high';
  else if (daysUntil <= 90) urgency = 'medium';

  return {
    id: obligation.id,
    type: obligation.obligation_type || 'Annual Report',
    due_date: obligation.due_date,
    days_until: daysUntil,
    status: obligation.obligation_status,
    urgency,
    entity_name: obligation.legal_name || null,
    filing_method: obligation.filing_method || 'self',
    fee_usd: obligation.fee_usd
  };
}

function buildActivityFeed(events, notifications) {
  const EVENT_LABELS = {
    'obligation.status_changed': 'Obligation status updated',
    'obligation.created': 'New obligation tracked',
    'entity.updated': 'Entity information updated',
    'entity.verified': 'Entity verified',
    'document.received': 'Document received',
    'document.escalated': 'Document escalated — action required',
    'client.login': 'Portal accessed',
    'billing.cancellation_requested': 'Cancellation requested',
    'ai.answer_escalated': 'AI answer escalated to support'
  };

  const activities = [];

  for (const e of events || []) {
    activities.push({
      id: e.id,
      type: 'event',
      text: EVENT_LABELS[e.event_type] || e.event_type.replace(/\./g, ' '),
      detail: e.reason || null,
      timestamp: e.created_at
    });
  }

  for (const n of (notifications || []).filter(n => n.sent_at).slice(0, 5)) {
    activities.push({
      id: n.id,
      type: 'notification',
      text: `Reminder sent: ${(n.template_id || '').replace(/_/g, ' ')}`,
      detail: `via ${n.channel}`,
      timestamp: n.sent_at
    });
  }

  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ data: null, error: { code: 'METHOD_NOT_ALLOWED', message: 'GET only' }, meta: {} });
  }

  // Rate limit: 60 requests/min for authenticated portal endpoints
  const rlResult = await checkRateLimit(getClientIp(req), 'portal-dashboard', 60, '60s');
  if (rlResult) {
    res.setHeader('Retry-After', String(rlResult.retryAfter));
    return res.status(429).json({
      data: null,
      error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      meta: { retryAfter: rlResult.retryAfter }
    });
  }

  const session = await authenticateRequest(req);
  if (!session?.valid) {
    return res.status(401).json({
      data: null,
      error: { code: 'UNAUTHENTICATED', message: 'Valid Authorization: Bearer <token> required' },
      meta: {}
    });
  }

  const orgId = session.orgId;

  try {
    // Fetch all data in parallel
    const [client, org, obligations, documents, notifications, recentEvents] = await Promise.all([
      db.getClientById(session.clientId),
      orgId ? db.getOrganization(orgId) : Promise.resolve(null),
      orgId ? db.getObligationsForOrg(orgId) : Promise.resolve([]),
      orgId ? db.getDocumentsForOrg(orgId) : Promise.resolve([]),
      orgId ? db.getNotificationsForOrg(orgId) : Promise.resolve([]),
      orgId
        ? db.getAuditEvents({ targetId: orgId, limit: 20 })
        : Promise.resolve([])
    ]);

    // Compliance score
    const health = computeEntityHealth(org, obligations, documents, notifications, client);

    // Upcoming deadlines — next 3 non-terminal obligations sorted by due_date
    const now = new Date();
    const upcomingDeadlines = (obligations || [])
      .filter(o => !['filed_confirmed', 'closed'].includes(o.obligation_status))
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 3)
      .map(formatDeadline);

    // Recent activity feed — last 10 items
    const recentActivity = buildActivityFeed(recentEvents, notifications);

    // Quick stats
    const totalObligations = (obligations || []).length;
    const overdueCount = (obligations || []).filter(o => {
      return new Date(o.due_date) < now && !['filed_confirmed', 'closed'].includes(o.obligation_status);
    }).length;
    const completedCount = (obligations || []).filter(o =>
      ['filed_confirmed', 'closed'].includes(o.obligation_status)
    ).length;
    const criticalDocCount = (documents || []).filter(d =>
      d.urgency === 'critical' && d.review_status === 'pending'
    ).length;

    const planCode = session.plan || client?.plan_code || 'compliance_only';

    return res.status(200).json({
      data: {
        compliance_score: health.overall,
        compliance_grade: health.grade,
        risk_level: health.risk_level,
        upcoming_deadlines: upcomingDeadlines,
        recent_activity: recentActivity,
        quick_stats: {
          total_obligations: totalObligations,
          overdue: overdueCount,
          completed: completedCount,
          critical_documents: criticalDocCount
        },
        plan: {
          code: planCode,
          label: PLAN_LABELS[planCode] || 'Compliance Only',
          price: PLAN_PRICES[planCode] || '$99/yr'
        },
        entity: org ? {
          id: org.id,
          legal_name: org.legal_name,
          entity_type: org.entity_type,
          dos_number: org.dos_number,
          entity_status: org.entity_status
        } : null,
        health_drivers: health.drivers,
        recommended_fixes: health.recommended_fixes
      },
      error: null,
      meta: {
        requestId: `dash_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        clientId: session.clientId,
        orgId: orgId || null
      }
    });
  } catch (err) {
    log.error('dashboard_error', { clientId: session.clientId, orgId }, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load dashboard data' },
      meta: { requestId: `dash_${Date.now()}` }
    });
  }
}
