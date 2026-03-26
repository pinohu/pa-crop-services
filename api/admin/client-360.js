// PA CROP Services — Admin Client 360
// Unified client record: everything Ike needs to know about a client in one view.

import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';
import { logError } from '../_log.js';
import { computeRisk } from '../services/obligations.js';
import { computeEntityHealth } from '../portal/value.js';
import { getPlanEntitlements } from '../services/entitlements.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  const clientId = req.query.id || req.query.clientId;
  const email = req.query.email;

  try {
    let client = null;
    if (clientId) client = await db.getClientById(clientId);
    else if (email) client = await db.getClientByEmail(email);

    if (!client) return res.status(404).json({ success: false, error: 'client_not_found' });

    const orgId = client.organization_id;

    // Fetch all independent data in parallel
    const [org, obligations, documents, notifications, referrals, billing, auditEvents, orgEvents] = await Promise.all([
      orgId ? db.getOrganization(orgId) : Promise.resolve(null),
      orgId ? db.getObligationsForOrg(orgId) : Promise.resolve([]),
      orgId ? db.getDocumentsForOrg(orgId) : Promise.resolve([]),
      orgId ? db.getNotificationsForOrg(orgId) : Promise.resolve([]),
      db.getReferrals(client.id),
      db.getBillingAccount(client.id),
      db.getAuditEvents({ targetId: client.id, limit: 30 }),
      orgId ? db.getAuditEvents({ targetId: orgId, limit: 30 }) : Promise.resolve([])
    ]);

    // AI conversations
    let aiConversations = [];
    if (db.isConnected() && orgId) {
      try {
        const sql = db.getSql();
        aiConversations = await sql.query(
          'SELECT * FROM ai_conversations WHERE organization_id = $1 OR client_id = $2 ORDER BY created_at DESC LIMIT 20',
          [orgId, client.id]
        );
      } catch (e) { /* Neon not connected */ }
    }

    const risk = computeRisk(obligations);
    const health = computeEntityHealth(org, obligations, documents, notifications, client);
    const entitlements = getPlanEntitlements(client.plan_code);

    // Churn risk indicators
    const churnSignals = [];
    if (obligations.some(o => ['overdue', 'escalated'].includes(o.obligation_status))) churnSignals.push('Has overdue obligations');
    if (client.billing_status === 'past_due') churnSignals.push('Payment past due');
    if (client.billing_status === 'cancelled') churnSignals.push('Already cancelled');
    if (!notifications.some(n => n.sent_at && new Date(n.sent_at) > new Date(Date.now() - 90 * 86400000))) churnSignals.push('No notifications sent in 90 days');

    // Upsell signals
    const upsellSignals = [];
    if (client.plan_code === 'compliance_only' && obligations.length > 0) upsellSignals.push('Active compliance user on lowest tier → Starter');
    if (client.plan_code === 'business_starter' && obligations.some(o => o.filing_method === 'self')) upsellSignals.push('Self-filing on Starter → Pro (managed filing)');
    if (client.plan_code === 'business_pro' && org?.metadata?.additional_entities) upsellSignals.push('Has multiple entities → Empire');

    return res.status(200).json({
      success: true,
      client: {
        id: client.id,
        email: client.email,
        name: client.owner_name,
        phone: client.phone,
        plan_code: client.plan_code,
        billing_status: client.billing_status,
        onboarding_status: client.onboarding_status,
        referral_code: client.referral_code,
        created_at: client.created_at,
        metadata: client.metadata
      },
      organization: org ? {
        id: org.id,
        legal_name: org.legal_name,
        entity_type: org.entity_type,
        jurisdiction: org.jurisdiction,
        dos_number: org.dos_number,
        entity_status: org.entity_status,
        formation_date: org.formation_date
      } : null,
      compliance: {
        risk_level: risk,
        health,
        obligations: obligations.map(o => ({
          id: o.id, type: o.obligation_type, due_date: o.due_date,
          status: o.obligation_status, escalation: o.escalation_level,
          filing_method: o.filing_method, fee: o.fee_usd,
          days_until: Math.ceil((new Date(o.due_date) - new Date()) / 86400000)
        }))
      },
      documents: documents.map(d => ({
        id: d.id, type: d.document_type, filename: d.filename,
        urgency: d.urgency, review_status: d.review_status,
        received_at: d.received_at
      })),
      notifications: {
        sent: notifications.filter(n => n.sent_at).length,
        pending: notifications.filter(n => n.delivery_status === 'scheduled').length,
        failed: notifications.filter(n => n.delivery_status === 'failed').length,
        recent: notifications.slice(0, 10).map(n => ({
          type: n.template_id, channel: n.channel, status: n.delivery_status,
          sent_at: n.sent_at, scheduled_for: n.scheduled_for
        }))
      },
      billing: billing ? {
        status: billing.billing_status,
        plan: billing.plan_code,
        stripe_customer_id: billing.stripe_customer_id,
        current_period_end: billing.current_period_end,
        entitlements
      } : { status: client.billing_status, plan: client.plan_code, entitlements },
      referrals: {
        code: client.referral_code,
        total: referrals.length,
        converted: referrals.filter(r => r.referral_status === 'converted').length,
        items: referrals.slice(0, 10)
      },
      ai_conversations: aiConversations.map(c => ({
        question: c.user_message, answer: (c.assistant_answer || '').slice(0, 200),
        confidence: c.confidence_score, escalated: c.escalation_flag,
        created_at: c.created_at
      })),
      audit_trail: [...auditEvents, ...orgEvents]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 30)
        .map(e => ({
          event: e.event_type, actor: `${e.actor_type}:${e.actor_id}`,
          reason: e.reason, timestamp: e.created_at
        })),
      signals: {
        churn_risk: churnSignals,
        upsell_opportunities: upsellSignals
      }
    });
  } catch (err) {
    logError('client_360_error', {}, err);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
