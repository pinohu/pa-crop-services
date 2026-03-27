// PA CROP Services — Portal Obligations
// GET /api/portal/obligations
// Returns all obligations for the authenticated client with status classification.
// Fields: id, title, type, due_date, status (upcoming/overdue/complete), description
// Uses _obligations.js state machine logic for status labeling.
// Requires: Authorization: Bearer <token>

import { setCors, authenticateRequest } from '../services/auth.js';
import { checkRateLimit, getClientIp } from '../_ratelimit.js';
import { createLogger } from '../_log.js';
import * as db from '../services/db.js';
import { obligations } from '../_obligations.js';

const log = createLogger('portal-obligations');

const OBLIGATION_TYPE_LABELS = {
  ANNUAL_REPORT: 'Annual Report',
  annual_report: 'Annual Report',
  REGISTERED_OFFICE: 'Registered Office Renewal',
  FOREIGN_REGISTRATION: 'Foreign Registration',
  REINSTATEMENT: 'Reinstatement Filing'
};

const STATUS_MAP = {
  DETECTED: 'upcoming',
  UPCOMING: 'upcoming',
  REMINDER_SENT: 'upcoming',
  AWAITING_CLIENT: 'upcoming',
  READY_TO_FILE: 'upcoming',
  FILED: 'complete',
  CONFIRMED: 'complete',
  RESOLVED: 'complete',
  OVERDUE: 'overdue',
  ESCALATED: 'overdue',
  // Neon DB statuses
  created: 'upcoming',
  reminder_sent: 'upcoming',
  awaiting_client: 'upcoming',
  ready_to_file: 'upcoming',
  filed: 'complete',
  filed_confirmed: 'complete',
  closed: 'complete',
  overdue: 'overdue',
  escalated: 'overdue'
};

const STATUS_DESCRIPTIONS = {
  upcoming: 'This obligation is due soon. File on time to stay compliant.',
  overdue: 'This obligation is past due. File immediately to avoid penalties.',
  complete: 'This obligation has been filed and confirmed.'
};

function classifyStatus(obligation) {
  const now = new Date();
  const due = new Date(obligation.due_date);

  // DB-stored status takes precedence for terminal states
  const rawStatus = obligation.obligation_status || obligation.status || 'created';
  if (['filed_confirmed', 'closed', 'CONFIRMED', 'RESOLVED', 'FILED'].includes(rawStatus)) {
    return 'complete';
  }
  if (['OVERDUE', 'ESCALATED', 'overdue', 'escalated'].includes(rawStatus)) {
    return 'overdue';
  }

  // Fall back to date-based classification
  if (due < now) return 'overdue';
  return STATUS_MAP[rawStatus] || 'upcoming';
}

function buildDescription(obligation, portalStatus) {
  const typeLabel = OBLIGATION_TYPE_LABELS[obligation.obligation_type] || 'Compliance Filing';
  const due = new Date(obligation.due_date);
  const now = new Date();
  const daysUntil = Math.ceil((due - now) / 86400000);

  if (portalStatus === 'complete') {
    return `${typeLabel} has been successfully filed.`;
  }
  if (portalStatus === 'overdue') {
    const daysOver = Math.abs(daysUntil);
    return `${typeLabel} was due ${daysOver} day${daysOver === 1 ? '' : 's'} ago. File immediately at file.dos.pa.gov to avoid dissolution.`;
  }
  if (daysUntil <= 30) {
    return `${typeLabel} is due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}. ${obligation.filing_method === 'managed' ? 'We will file this for you.' : 'File at file.dos.pa.gov.'}`;
  }
  return `${typeLabel} is due on ${due.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. ${obligation.filing_method === 'managed' ? 'Managed filing included in your plan.' : 'File online at file.dos.pa.gov.'}`;
}

function formatObligation(obligation) {
  const portalStatus = classifyStatus(obligation);
  const now = new Date();
  const due = new Date(obligation.due_date);
  const daysUntil = Math.ceil((due - now) / 86400000);

  return {
    id: obligation.id,
    title: OBLIGATION_TYPE_LABELS[obligation.obligation_type] || 'Compliance Filing',
    type: obligation.obligation_type || 'annual_report',
    due_date: obligation.due_date,
    days_until: daysUntil,
    status: portalStatus,
    raw_status: obligation.obligation_status || obligation.status,
    description: buildDescription(obligation, portalStatus),
    filing_method: obligation.filing_method || 'self',
    fee_usd: obligation.fee_usd || 7,
    jurisdiction: obligation.jurisdiction || 'PA',
    entity_name: obligation.legal_name || null,
    entity_type: obligation.entity_type || null,
    escalation_level: obligation.escalation_level || 'none',
    filing_url: 'https://file.dos.pa.gov',
    form: 'DSCB:15-146'
  };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({
      data: null,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'GET only' },
      meta: {}
    });
  }

  // Rate limit: 60 requests/min
  const rlResult = await checkRateLimit(getClientIp(req), 'portal-obligations', 60, '60s');
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
  if (!orgId) {
    return res.status(200).json({
      data: { obligations: [], total: 0, counts: { upcoming: 0, overdue: 0, complete: 0 } },
      error: null,
      meta: {}
    });
  }

  // Optional status filter: ?status=upcoming|overdue|complete
  const statusFilter = req.query.status || null;

  try {
    const rawObligations = await db.getObligationsForOrg(orgId);

    if (!rawObligations || rawObligations.length === 0) {
      // If no DB obligations, try computing from entity record using _obligations.js
      const org = await db.getOrganization(orgId);
      if (org?.entity_type) {
        const computed = obligations.computeForEntity({
          id: orgId,
          entityType: org.entity_type,
          plan: session.plan
        });
        const formatted = formatObligation({
          ...computed,
          id: `computed_${orgId}`,
          obligation_type: computed.obligationType,
          obligation_status: computed.status,
          due_date: computed.dueDate,
          fee_usd: computed.fee,
          filing_method: computed.filingMethod?.toLowerCase() || 'self',
          legal_name: org.legal_name,
          entity_type: org.entity_type
        });

        return res.status(200).json({
          data: {
            obligations: [formatted],
            total: 1,
            counts: {
              upcoming: formatted.status === 'upcoming' ? 1 : 0,
              overdue: formatted.status === 'overdue' ? 1 : 0,
              complete: formatted.status === 'complete' ? 1 : 0
            }
          },
          error: null,
          meta: {
            requestId: `obls_${Date.now()}`,
            source: 'computed',
            orgId
          }
        });
      }

      return res.status(200).json({
        data: { obligations: [], total: 0, counts: { upcoming: 0, overdue: 0, complete: 0 } },
        error: null,
        meta: { requestId: `obls_${Date.now()}` }
      });
    }

    let formatted = rawObligations.map(formatObligation);

    // Apply status filter
    if (statusFilter && ['upcoming', 'overdue', 'complete'].includes(statusFilter)) {
      formatted = formatted.filter(o => o.status === statusFilter);
    }

    // Sort: overdue first, then by days_until ascending, then complete last
    formatted.sort((a, b) => {
      const order = { overdue: 0, upcoming: 1, complete: 2 };
      const orderDiff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
      if (orderDiff !== 0) return orderDiff;
      return a.days_until - b.days_until;
    });

    const counts = formatted.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, { upcoming: 0, overdue: 0, complete: 0 });

    return res.status(200).json({
      data: {
        obligations: formatted,
        total: formatted.length,
        counts
      },
      error: null,
      meta: {
        requestId: `obls_${Date.now()}`,
        orgId,
        filtered_by: statusFilter || null
      }
    });
  } catch (err) {
    log.error('obligations_error', { clientId: session.clientId, orgId }, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load obligations' },
      meta: { requestId: `obls_${Date.now()}` }
    });
  }
}
