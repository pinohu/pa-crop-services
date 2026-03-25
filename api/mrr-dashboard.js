// PA CROP Services — MRR/Revenue Dashboard
// GET /api/mrr-dashboard (admin-key required)
// Reads Neon Postgres first, falls back to SuiteDash

import { setCors, isAdminRequest } from './services/auth.js';
import * as db from './services/db.js';

const PRICES = { compliance_only: 99, business_starter: 199, business_pro: 349, business_empire: 699 };
const LABELS = { compliance_only: 'Compliance Only', business_starter: 'Business Starter', business_pro: 'Business Pro', business_empire: 'Business Empire' };

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Unauthorized' });

  try {
    if (db.isConnected()) {
      const sql = db.getSql();
      const clients = await sql.query("SELECT plan_code, billing_status, created_at FROM clients");
      const by_tier = {};
      let active = 0, rev = 0;
      for (const c of (clients || [])) {
        const t = c.plan_code || 'compliance_only';
        if (c.billing_status === 'active') { active++; by_tier[t] = (by_tier[t]||0)+1; rev += PRICES[t]||99; }
      }
      const mrr = Math.round(rev/12*100)/100;
      const arpu = active > 0 ? Math.round(rev/active*100)/100 : 0;
      const cohorts = {};
      for (const c of (clients||[])) { const m = c.created_at ? new Date(c.created_at).toISOString().slice(0,7) : 'unknown'; cohorts[m]=(cohorts[m]||0)+1; }
      return res.status(200).json({
        success: true, source: 'neon', generated: new Date().toISOString(),
        mrr, arr: rev, clients: { total: active, by_tier }, arpu,
        ltv_estimate: Math.round(arpu*3.2*100)/100,
        revenue_breakdown: Object.fromEntries(Object.entries(by_tier).map(([t,n])=>[LABELS[t]||t,{clients:n,annual:n*(PRICES[t]||99),monthly:Math.round(n*(PRICES[t]||99)/12*100)/100}])),
        cohorts: Object.entries(cohorts).sort().map(([month,count])=>({month,count}))
      });
    }
    if (db.isSuiteDashConnected()) {
      const clients = await db.suitedash.getAllClientsWithCompliance();
      const by_tier = {};
      let rev = 0;
      for (const c of clients) { const t=c.plan_code||'compliance_only'; by_tier[t]=(by_tier[t]||0)+1; rev+=PRICES[t]||99; }
      return res.status(200).json({
        success: true, source: 'suitedash', generated: new Date().toISOString(),
        mrr: Math.round(rev/12*100)/100, arr: rev, clients: { total: clients.length, by_tier },
        arpu: clients.length>0 ? Math.round(rev/clients.length*100)/100 : 0
      });
    }
    return res.status(200).json({ success: true, source: 'none', mrr: 0, arr: 0, clients: { total: 0, by_tier: {} } });
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
