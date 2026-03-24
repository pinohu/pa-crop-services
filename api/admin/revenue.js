import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    const supabase = db.getClient();
    if (!supabase) return res.status(200).json({ success: true, mode: 'no_db', message: 'Revenue analytics requires Supabase' });

    // Plan distribution
    const { data: clients } = await supabase.from('clients').select('plan_code, billing_status, created_at');
    const plans = {};
    let active = 0, churned = 0, trial = 0;
    for (const c of (clients || [])) {
      plans[c.plan_code] = (plans[c.plan_code] || 0) + 1;
      if (c.billing_status === 'active') active++;
      else if (c.billing_status === 'cancelled') churned++;
      else if (c.billing_status === 'trial') trial++;
    }

    // MRR by plan
    const planPricing = { compliance_only: 99/12, business_starter: 199/12, business_pro: 349/12, business_empire: 699/12 };
    let mrr = 0;
    for (const [plan, count] of Object.entries(plans)) {
      mrr += (planPricing[plan] || 0) * count;
    }

    // Churn analysis — clients with overdue obligations
    const { data: obligations } = await supabase.from('obligations').select('organization_id, obligation_status');
    const orgsOverdue = new Set();
    for (const o of (obligations || [])) {
      if (['overdue', 'escalated'].includes(o.obligation_status)) orgsOverdue.add(o.organization_id);
    }

    // Upgrade candidates — compliance_only clients with complex entities
    const upgradeCandidate = (clients || []).filter(c => c.plan_code === 'compliance_only' && c.billing_status === 'active').length;

    // Cohort analysis — clients by month
    const cohorts = {};
    for (const c of (clients || [])) {
      const month = c.created_at?.slice(0, 7) || 'unknown';
      cohorts[month] = (cohorts[month] || 0) + 1;
    }

    return res.status(200).json({
      success: true,
      revenue: {
        mrr: Math.round(mrr * 100) / 100,
        arr: Math.round(mrr * 12 * 100) / 100,
        total_clients: (clients || []).length,
        active,
        churned,
        trial,
        churn_rate: active + churned > 0 ? Math.round(churned / (active + churned) * 100) : 0
      },
      plans: Object.entries(plans).map(([code, count]) => ({
        code, count, mrr_contribution: Math.round((planPricing[code] || 0) * count * 100) / 100
      })),
      compliance_risk: {
        entities_overdue: orgsOverdue.size,
        pct_at_risk: (clients || []).length > 0 ? Math.round(orgsOverdue.size / (clients || []).length * 100) : 0
      },
      opportunities: {
        upgrade_candidates: upgradeCandidate,
        potential_mrr_uplift: Math.round(upgradeCandidate * (planPricing.business_pro - planPricing.compliance_only) * 100) / 100
      },
      cohorts: Object.entries(cohorts).sort().map(([month, count]) => ({ month, count })),
      generated_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Revenue analytics error:', err.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
