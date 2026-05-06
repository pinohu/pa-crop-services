// PA CROP Services — Portal Notifications
// GET /api/portal/notifications
// Returns the authenticated client's recent notifications (welcome, reminders,
// filing confirmations, document alerts) sourced from the notifications table
// scoped to their organization.
// Requires: Authorization: Bearer <token>

import { setCors, authenticateRequest } from '../services/auth.js';
import { checkRateLimit, getClientIp } from '../_ratelimit.js';
import { createLogger } from '../_log.js';
import * as db from '../services/db.js';

const log = createLogger('portal-notifications');

const TEMPLATE_LABELS = {
  welcome: 'Welcome to PA CROP Services',
  welcome_email: 'Welcome to PA CROP Services',
  reminder_90: 'Annual report due in 90 days',
  reminder_60: 'Annual report due in 60 days',
  reminder_30: 'Annual report due in 30 days',
  reminder_14: 'Annual report due in 14 days',
  reminder_7: 'Annual report due in 7 days',
  filing_confirmed: 'Annual report filed',
  filing_submitted: 'Annual report submitted to PA DOS',
  document_received: 'New document received',
  document_urgent: 'Urgent document — action required',
  payment_failed: 'Payment failed',
  payment_succeeded: 'Payment received',
  service_of_process: 'Service of process received'
};

function classify(template) {
  const t = (template || '').toLowerCase();
  if (t.includes('urgent') || t === 'service_of_process') return 'urgent';
  if (t.includes('payment_failed')) return 'urgent';
  if (t.startsWith('reminder_7') || t.startsWith('reminder_14')) return 'warning';
  if (t.startsWith('reminder')) return 'info';
  if (t.includes('confirmed') || t.includes('succeeded')) return 'success';
  return 'info';
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthorized' });

  const rl = await checkRateLimit(getClientIp(req), 'portal-notifications', 60, '60s');
  if (rl) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ success: false, error: 'too_many_requests' });
  }

  try {
    const orgId = session.orgId || session.organization_id;
    const items = orgId ? await db.getNotificationsForOrg(orgId) : [];
    const formatted = items.slice(0, 50).map(n => {
      const tpl = n.template_id || n.notification_type || 'unknown';
      return {
        id: n.id,
        title: TEMPLATE_LABELS[tpl] || tpl.replace(/_/g, ' '),
        template_id: tpl,
        channel: n.channel || 'email',
        status: n.delivery_status || 'unknown',
        severity: classify(tpl),
        sent_at: n.sent_at || null,
        scheduled_for: n.scheduled_for || null,
        read: !!n.read_at
      };
    });
    return res.status(200).json({
      success: true,
      data: {
        items: formatted,
        unread: formatted.filter(n => !n.read && n.status === 'sent').length,
        total: formatted.length
      }
    });
  } catch (err) {
    log.error('portal_notifications_error', { orgId: session.orgId }, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
