import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    if (!db.isConnected()) {
      // Fallback: pull client data from SuiteDash
      if (db.isSuiteDashConnected()) {
        const { suitedash } = db;
        const clients = await suitedash.getAllClientsWithCompliance();
        return res.status(200).json({
          success: true, mode: 'suitedash_only',
          compliance: { total: clients.length, current: clients.filter(c => c.compliance_status === 'active').length, due_soon: 0, overdue: 0, escalated: 0, filed: 0 },
          clients: { total: clients.length, active: clients.filter(c => c.role === 'client').length },
          ai: { conversations_24h: 0, low_confidence: 0, escalated: 0 },
          notifications: { failed: 0 }, workflow: { failed_jobs: 0 },
          high_risk_entities: clients.filter(c => c.risk_level === 'high' || c.risk_level === 'critical').slice(0, 5).map(c => ({ id: c.uid, name: c.company_name || c.name, type: c.entity_type, status: c.compliance_status })),
          generated_at: new Date().toISOString()
        });
      }
      return res.status(200).json({ success: true, mode: 'no_db', message: 'Connect Neon or SuiteDash' });
    }

    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL);

    const obligations = await sql("SELECT obligation_status, escalation_level, due_date FROM obligations");
    const oblStats = { total: 0, current: 0, due_soon: 0, overdue: 0, escalated: 0, filed: 0 };
    const now = new Date();
    for (const o of obligations) {
      oblStats.total++;
      if (["filed_confirmed","closed"].includes(o.obligation_status)) oblStats.filed++;
      else if (o.obligation_status === "overdue") oblStats.overdue++;
      else if (o.obligation_status === "escalated") oblStats.escalated++;
      else {
        const days = Math.ceil((new Date(o.due_date) - now) / 86400000);
        if (days <= 30) oblStats.due_soon++; else oblStats.current++;
      }
    }

    const clientRows = await sql("SELECT COUNT(*) as total FROM clients");
    const activeRows = await sql("SELECT COUNT(*) as total FROM clients WHERE billing_status = $1", ["active"]);
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const aiConvos = await sql("SELECT confidence_score, escalation_flag FROM ai_conversations WHERE created_at >= $1", [yesterday]);
    const failedNotifs = await sql("SELECT COUNT(*) as total FROM notifications WHERE delivery_status = $1", ["failed"]);
    const failedJobs = await db.getFailedJobs(10);

    const orgs = await sql("SELECT id, legal_name, entity_type, entity_status FROM organizations LIMIT 100");
    const highRisk = [];
    for (const org of orgs.slice(0, 20)) {
      if (obligations.some(o => ["overdue","escalated"].includes(o.obligation_status))) {
        highRisk.push({ id: org.id, name: org.legal_name, type: org.entity_type, status: org.entity_status });
      }
    }

    return res.status(200).json({
      success: true,
      compliance: oblStats,
      clients: { total: parseInt(clientRows[0]?.total || 0), active: parseInt(activeRows[0]?.total || 0) },
      ai: { conversations_24h: aiConvos.length, low_confidence: aiConvos.filter(c => c.confidence_score < 0.8).length, escalated: aiConvos.filter(c => c.escalation_flag).length },
      notifications: { failed: parseInt(failedNotifs[0]?.total || 0) },
      workflow: { failed_jobs: failedJobs.length },
      high_risk_entities: highRisk.slice(0, 5),
      generated_at: now.toISOString()
    });
  } catch (err) {
    console.error("Command center error:", err.message);
    return res.status(500).json({ success: false, error: "internal_error" });
  }
}
