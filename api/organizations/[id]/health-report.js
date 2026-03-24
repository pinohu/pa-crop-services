import { setCors, authenticateRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';
import { computeRisk } from '../../services/obligations.js';
import { getPlanEntitlements } from '../../services/entitlements.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    const id = req.query.id;
    const org = await db.getOrganization(id);
    if (!org) return res.status(404).json({ success: false, error: 'not_found' });

    const obligations = await db.getObligationsForOrg(id);
    const documents = await db.getDocumentsForOrg(id);
    const notifications = await db.getNotificationsForOrg(id);

    const risk = computeRisk(obligations);
    const now = new Date();

    // Compliance grade
    const filed = obligations.filter(o => ['filed_confirmed', 'closed'].includes(o.obligation_status));
    const overdue = obligations.filter(o => ['overdue', 'escalated'].includes(o.obligation_status));
    const total = obligations.length || 1;
    let grade = 'A';
    if (overdue.length > 0) grade = 'F';
    else if (risk === 'high') grade = 'C';
    else if (risk === 'medium') grade = 'B';

    // Verification status
    const verified = org.entity_status === 'active';

    return res.status(200).json({
      success: true,
      report: {
        generated_at: now.toISOString(),
        organization: {
          legal_name: org.legal_name,
          entity_type: org.entity_type,
          jurisdiction: org.jurisdiction,
          dos_number: org.dos_number,
          formation_date: org.formation_date,
          status: org.entity_status,
          verified
        },
        compliance: {
          grade,
          risk_level: risk,
          total_obligations: obligations.length,
          filed: filed.length,
          overdue: overdue.length,
          upcoming: obligations.filter(o => ['upcoming', 'reminder_scheduled', 'reminder_sent'].includes(o.obligation_status)).length
        },
        obligations: obligations.map(o => ({
          type: o.obligation_type,
          due_date: o.due_date,
          status: o.obligation_status,
          fee: o.fee_usd
        })),
        documents: {
          total: documents.length,
          pending_review: documents.filter(d => d.review_status === 'pending').length,
          critical: documents.filter(d => d.urgency === 'critical').length
        },
        notifications: {
          sent: notifications.filter(n => n.sent_at).length,
          pending: notifications.filter(n => n.delivery_status === 'scheduled').length
        },
        verification_badge: verified ? {
          status: 'verified',
          label: 'Compliance Verified by PA CROP Services',
          embed_url: `https://pacropservices.com/api/badge/${id}`
        } : null
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
