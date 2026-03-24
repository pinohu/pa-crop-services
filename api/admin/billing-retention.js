// PA CROP Services — Admin Billing & Retention Console
// Churn risk scoring, upsell detection, renewal forecast, save offers.

import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';

const PLAN_PRICING = { compliance_only: 99, business_starter: 199, business_pro: 349, business_empire: 699 };
const PLAN_LABELS = { compliance_only: 'Compliance Only', business_starter: 'Business Starter', business_pro: 'Business Pro', business_empire: 'Business Empire' };

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    // Try SuiteDash if Neon not connected
    if (!db.isConnected() && db.isSuiteDashConnected()) {
      const { suitedash } = db;
      const clients = await suitedash.getAllClientsWithCompliance();

      const planDist = {};
      for (const c of clients) { planDist[c.plan_code] = (planDist[c.plan_code] || 0) + 1; }

      let mrr = 0;
      for (const [plan, count] of Object.entries(planDist)) mrr += ((PLAN_PRICING[plan] || 99) / 12) * count;

      // Churn signals from SuiteDash data
      const churnRisk = clients.filter(c =>
        c.risk_level === 'high' || c.risk_level === 'critical' ||
        c.compliance_status === 'overdue' || c.compliance_status === 'inactive'
      ).map(c => ({
        name: c.company_name || c.name,
        email: c.email,
        plan: c.plan_code,
        signals: [
          c.risk_level === 'high' || c.risk_level === 'critical' ? 'High compliance risk' : null,
          c.compliance_status === 'overdue' ? 'Overdue obligations' : null
        ].filter(Boolean),
        recommended_action: 'Schedule a check-in call'
      }));

      // Upsell candidates
      const upsell = clients.filter(c => c.plan_code === 'compliance_only').map(c => ({
        name: c.company_name || c.name,
        email: c.email,
        current_plan: 'Compliance Only',
        recommended_plan: 'Business Starter',
        reason: 'Active user on lowest tier',
        potential_uplift: (PLAN_PRICING.business_starter - PLAN_PRICING.compliance_only) / 12
      }));

      return res.status(200).json({
        success: true,
        mode: 'suitedash_only',
        revenue: { mrr: Math.round(mrr * 100) / 100, arr: Math.round(mrr * 12 * 100) / 100, total_clients: clients.length },
        plan_distribution: Object.entries(planDist).map(([code, count]) => ({ code, label: PLAN_LABELS[code] || code, count, mrr: Math.round((PLAN_PRICING[code] || 99) / 12 * count * 100) / 100 })),
        churn_risk: churnRisk.slice(0, 10),
        upsell_candidates: upsell.slice(0, 10),
        generated_at: new Date().toISOString()
      });
    }

    if (!db.isConnected()) return res.status(200).json({ success: true, mode: 'no_db' });

    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);

    // Full analysis from Postgres
    const clients = await sql('SELECT * FROM clients ORDER BY created_at DESC');
    const obligations = await sql('SELECT organization_id, obligation_status, due_date FROM obligations');
    const billing = await sql('SELECT * FROM billing_accounts');

    const now = new Date();
    const planDist = {};
    let mrr = 0, active = 0, churned = 0, pastDue = 0;

    for (const c of (clients || [])) {
      planDist[c.plan_code] = (planDist[c.plan_code] || 0) + 1;
      if (c.billing_status === 'active') { active++; mrr += (PLAN_PRICING[c.plan_code] || 99) / 12; }
      else if (c.billing_status === 'cancelled') churned++;
      else if (c.billing_status === 'past_due') pastDue++;
    }

    // Churn scoring
    const orgOverdue = new Set();
    for (const o of (obligations || [])) {
      if (['overdue', 'escalated'].includes(o.obligation_status)) orgOverdue.add(o.organization_id);
    }

    const churnRisk = (clients || []).filter(c => {
      return c.billing_status === 'past_due' ||
        orgOverdue.has(c.organization_id) ||
        c.billing_status === 'cancelled';
    }).map(c => {
      const signals = [];
      if (c.billing_status === 'past_due') signals.push('Payment past due');
      if (c.billing_status === 'cancelled') signals.push('Cancelled');
      if (orgOverdue.has(c.organization_id)) signals.push('Overdue obligations');
      return {
        id: c.id, name: c.owner_name, email: c.email, plan: c.plan_code,
        billing_status: c.billing_status, signals,
        recommended_action: c.billing_status === 'past_due' ? 'Send payment reminder' :
          c.billing_status === 'cancelled' ? 'Send win-back offer' : 'Schedule check-in'
      };
    }).slice(0, 15);

    // Upsell detection
    const upsell = (clients || []).filter(c =>
      c.billing_status === 'active' && c.plan_code === 'compliance_only'
    ).map(c => ({
      id: c.id, name: c.owner_name, email: c.email,
      current_plan: c.plan_code, recommended: 'business_starter',
      reason: 'Active on lowest tier',
      monthly_uplift: Math.round((PLAN_PRICING.business_starter - PLAN_PRICING.compliance_only) / 12 * 100) / 100
    })).slice(0, 10);

    // Renewal forecast (next 90 days)
    const renewals = (billing || []).filter(b => {
      if (!b.current_period_end) return false;
      const end = new Date(b.current_period_end);
      return end > now && end < new Date(now.getTime() + 90 * 86400000);
    }).map(b => {
      const client = (clients || []).find(c => c.id === b.client_id);
      return {
        client_name: client?.owner_name, email: client?.email,
        plan: b.plan_code, renews: b.current_period_end,
        amount: PLAN_PRICING[b.plan_code] || 99
      };
    });

    return res.status(200).json({
      success: true,
      revenue: {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        total_clients: (clients || []).length,
        active, churned, past_due: pastDue,
        churn_rate: active + churned > 0 ? Math.round(churned / (active + churned) * 100) : 0
      },
      plan_distribution: Object.entries(planDist).map(([code, count]) => ({
        code, label: PLAN_LABELS[code] || code, count,
        mrr: Math.round((PLAN_PRICING[code] || 99) / 12 * count * 100) / 100
      })),
      churn_risk: churnRisk,
      upsell_candidates: upsell,
      renewal_forecast: renewals,
      generated_at: now.toISOString()
    });
  } catch (err) {
    console.error('Billing retention error:', err.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
