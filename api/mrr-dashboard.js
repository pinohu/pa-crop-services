// PA CROP Services — MRR/Revenue Dashboard
// GET /api/mrr-dashboard (admin-key required)
// Reads Neon Postgres first, falls back to SuiteDash

import { setCors, isAdminRequest } from './services/auth.js';
import * as db from './services/db.js';
import * as plans from './services/plans.js';
import { createLogger } from './_log.js';

const log = createLogger('mrr-dashboard');

const PRICES = plans.priceMap();
const LABELS = plans.labelMap();

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

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
  } catch (e) { log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' }); }
}
