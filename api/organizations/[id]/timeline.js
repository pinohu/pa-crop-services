import { setCors, authenticateRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';
import { computeRisk } from '../../services/obligations.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    const id = req.query.id;
    const org = await db.getOrganization(id);
    if (!org) return res.status(404).json({ success: false, error: 'not_found' });

    const [obligations, notifications] = await Promise.all([
      db.getObligationsForOrg(id),
      db.getNotificationsForOrg(id)
    ]);
    // Note: audit events are not used in the timeline output — removed unused fetch

    // Build timeline entries from obligations + notifications + audit events
    const timeline = [];

    for (const obl of obligations) {
      const dueDate = new Date(obl.due_date);
      const now = new Date();
      const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

      timeline.push({
        type: 'obligation',
        id: obl.id,
        obligation_type: obl.obligation_type,
        due_date: obl.due_date,
        status: obl.obligation_status,
        escalation_level: obl.escalation_level,
        fee_usd: obl.fee_usd,
        days_until: daysUntil,
        filing_method: obl.filing_method,
        created_at: obl.created_at
      });
    }

    // Add sent notifications
    for (const notif of notifications.filter(n => n.sent_at)) {
      timeline.push({
        type: 'notification',
        id: notif.id,
        template_id: notif.template_id,
        channel: notif.channel,
        delivery_status: notif.delivery_status,
        sent_at: notif.sent_at,
        scheduled_for: notif.scheduled_for
      });
    }

    // Add upcoming notifications
    for (const notif of notifications.filter(n => n.delivery_status === 'scheduled')) {
      timeline.push({
        type: 'scheduled_notification',
        id: notif.id,
        template_id: notif.template_id,
        scheduled_for: notif.scheduled_for
      });
    }

    // Sort by date
    timeline.sort((a, b) => {
      const da = a.sent_at || a.due_date || a.scheduled_for || a.created_at;
      const db2 = b.sent_at || b.due_date || b.scheduled_for || b.created_at;
      return new Date(da) - new Date(db2);
    });

    // Risk scorecard
    const risk = computeRisk(obligations);

    // Next actions
    const actions = [];
    for (const obl of obligations) {
      if (['overdue', 'escalated'].includes(obl.obligation_status)) {
        actions.push({ priority: 'critical', action: 'file_now', label: 'File your annual report immediately', url: 'https://file.dos.pa.gov', obligation_id: obl.id });
      } else if (obl.obligation_status === 'awaiting_client_input') {
        actions.push({ priority: 'high', action: 'provide_info', label: 'Confirm your entity details', obligation_id: obl.id });
      } else if (obl.obligation_status === 'filed_pending_confirmation') {
        actions.push({ priority: 'medium', action: 'confirm_filing', label: 'Confirm your filing was processed', obligation_id: obl.id });
      } else if (['upcoming', 'reminder_sent', 'reminder_scheduled'].includes(obl.obligation_status)) {
        const days = Math.ceil((new Date(obl.due_date) - new Date()) / (1000*60*60*24));
        if (obl.filing_method === 'managed' || obl.filing_method === 'auto') {
          actions.push({ priority: 'info', action: 'no_action', label: `We\'re handling your filing — due in ${days} days`, obligation_id: obl.id });
        } else if (days <= 30) {
          actions.push({ priority: 'warning', action: 'file_soon', label: `File your annual report — ${days} days remaining`, url: 'https://file.dos.pa.gov', obligation_id: obl.id });
        }
      }
    }
    if (actions.length === 0) {
      actions.push({ priority: 'success', action: 'all_clear', label: 'You\'re all current — no action needed' });
    }

    return res.status(200).json({
      success: true,
      organization: { id: org.id, legal_name: org.legal_name, entity_type: org.entity_type, entity_status: org.entity_status },
      risk: { level: risk, label: risk === 'low' ? 'On Track' : risk === 'medium' ? 'Attention Needed' : risk === 'high' ? 'At Risk' : 'Critical' },
      actions,
      obligations: obligations.map(o => ({
        id: o.id, type: o.obligation_type, due_date: o.due_date, status: o.obligation_status,
        escalation: o.escalation_level, fee: o.fee_usd, filing_method: o.filing_method,
        days_until: Math.ceil((new Date(o.due_date) - new Date()) / (1000*60*60*24))
      })),
      timeline,
      notifications_pending: notifications.filter(n => n.delivery_status === 'scheduled').length,
      notifications_sent: notifications.filter(n => n.sent_at).length
    });
  } catch (err) {
    console.error('Timeline error:', err.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
