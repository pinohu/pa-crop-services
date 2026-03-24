import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    // Try SuiteDash first for client data if Neon not available
    if (!db.isConnected() && db.isSuiteDashConnected()) {
      const { suitedash } = db;
      const clients = await suitedash.getAllClientsWithCompliance();
      const planPricing = { compliance_only: 99/12, business_starter: 199/12, business_pro: 349/12, business_empire: 699/12 };
      const plans = {};
      for (const c of clients) { plans[c.plan_code] = (plans[c.plan_code] || 0) + 1; }
      let mrr = 0;
      for (const [plan, count] of Object.entries(plans)) mrr += (planPricing[plan] || 0) * count;
      return res.status(200).json({
        success: true, mode: 'suitedash_only',
        revenue: { mrr: Math.round(mrr * 100) / 100, arr: Math.round(mrr * 12 * 100) / 100, total_clients: clients.length },
        plans: Object.entries(plans).map(([code, count]) => ({ code, count, mrr_contribution: Math.round((planPricing[code] || 0) * count * 100) / 100 })),
        generated_at: new Date().toISOString()
      });
    }

    if (!db.isConnected()) return res.status(200).json({ success: true, mode: 'no_db' });

    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL);

    const clients = await sql("SELECT plan_code, billing_status, created_at FROM clients");
    const planPricing = { compliance_only: 99/12, business_starter: 199/12, business_pro: 349/12, business_empire: 699/12 };
    const plans = {};
    let active = 0, churned = 0;
    for (const c of clients) {
      plans[c.plan_code] = (plans[c.plan_code] || 0) + 1;
      if (c.billing_status === "active") active++;
      else if (c.billing_status === "cancelled") churned++;
    }
    let mrr = 0;
    for (const [plan, count] of Object.entries(plans)) mrr += (planPricing[plan] || 0) * count;

    const obligations = await sql("SELECT organization_id, obligation_status FROM obligations");
    const orgsOverdue = new Set(obligations.filter(o => ["overdue","escalated"].includes(o.obligation_status)).map(o => o.organization_id));
    const upgradeCandidate = clients.filter(c => c.plan_code === "compliance_only" && c.billing_status === "active").length;
    const cohorts = {};
    for (const c of clients) { const m = (c.created_at || "").slice(0, 7); cohorts[m] = (cohorts[m] || 0) + 1; }

    return res.status(200).json({
      success: true,
      revenue: { mrr: Math.round(mrr * 100) / 100, arr: Math.round(mrr * 12 * 100) / 100, total_clients: clients.length, active, churned, churn_rate: active + churned > 0 ? Math.round(churned / (active + churned) * 100) : 0 },
      plans: Object.entries(plans).map(([code, count]) => ({ code, count, mrr_contribution: Math.round((planPricing[code] || 0) * count * 100) / 100 })),
      compliance_risk: { entities_overdue: orgsOverdue.size },
      opportunities: { upgrade_candidates: upgradeCandidate, potential_mrr_uplift: Math.round(upgradeCandidate * (planPricing.business_pro - planPricing.compliance_only) * 100) / 100 },
      cohorts: Object.entries(cohorts).sort().map(([month, count]) => ({ month, count })),
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error("Revenue analytics error:", err.message);
    return res.status(500).json({ success: false, error: "internal_error" });
  }
}
