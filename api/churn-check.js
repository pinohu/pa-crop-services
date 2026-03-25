// PA CROP Services — Churn Prediction & Retention
// GET /api/churn-check (admin-key required)
// Reads Neon Postgres first, falls back to SuiteDash

import { setCors, isAdminRequest } from './services/auth.js';
import * as db from './services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (db.isConnected()) {
      const sql = db.getSql();
      const clients = await sql.query(`
        SELECT c.id, c.owner_name, c.email, c.plan_code, c.billing_status, c.onboarding_status, c.created_at,
               c.metadata, c.organization_id
        FROM clients c ORDER BY c.created_at DESC
      `);
      const obligations = await sql.query("SELECT organization_id, obligation_status FROM obligations");
      const orgOverdue = new Set((obligations||[]).filter(o=>['overdue','escalated'].includes(o.obligation_status)).map(o=>o.organization_id));

      const now = new Date();
      const at_risk = [];
      let healthy = 0;

      for (const c of (clients || [])) {
        const reasons = [];
        const meta = c.metadata || {};
        const daysSinceCreated = Math.floor((now - new Date(c.created_at)) / 86400000);
        const lastLogin = meta.last_portal_login ? Math.floor((now - new Date(meta.last_portal_login)) / 86400000) : 999;

        if (c.billing_status === 'past_due') reasons.push('Payment past due');
        if (c.billing_status === 'cancelled') reasons.push('Cancelled');
        if (c.onboarding_status !== 'completed' && daysSinceCreated > 14) reasons.push('Onboarding incomplete');
        if (orgOverdue.has(c.organization_id)) reasons.push('Overdue obligations');
        if (lastLogin > 60 && daysSinceCreated > 60) reasons.push('No portal login in 60+ days');
        if (daysSinceCreated > 300 && daysSinceCreated < 400) reasons.push('Approaching renewal period');

        if (reasons.length > 0) {
          at_risk.push({
            id: c.id, name: c.owner_name, email: c.email, tier: c.plan_code,
            billing_status: c.billing_status, risk_score: reasons.length,
            days_since_login: lastLogin, days_as_client: daysSinceCreated,
            reasons,
            recommended_action: c.billing_status === 'past_due' ? 'Send payment reminder' :
              c.billing_status === 'cancelled' ? 'Send win-back offer' :
              reasons.includes('Onboarding incomplete') ? 'Send onboarding nudge' : 'Schedule check-in call'
          });
        } else { healthy++; }
      }

      at_risk.sort((a, b) => b.risk_score - a.risk_score);
      return res.status(200).json({
        success: true, source: 'neon', generated: new Date().toISOString(),
        total: (clients||[]).length, healthy, at_risk_count: at_risk.length,
        at_risk: at_risk.slice(0, 20)
      });
    }

    if (db.isSuiteDashConnected()) {
      const clients = await db.suitedash.getAllClientsWithCompliance();
      const at_risk = clients.filter(c => c.compliance_status === 'overdue' || c.risk_level === 'high' || c.risk_level === 'critical')
        .map(c => ({ name: c.name, email: c.email, plan: c.plan_code, reasons: [c.compliance_status === 'overdue' ? 'Overdue' : 'High risk'], risk_score: 1 }));
      return res.status(200).json({
        success: true, source: 'suitedash', generated: new Date().toISOString(),
        total: clients.length, healthy: clients.length - at_risk.length, at_risk_count: at_risk.length,
        at_risk
      });
    }

    return res.status(200).json({ success: true, source: 'none', total: 0, at_risk: [] });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
