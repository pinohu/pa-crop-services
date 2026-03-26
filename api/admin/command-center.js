import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';
import { logError } from '../_log.js';

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

    const sql = db.getSql();

    const [oblStats] = await sql.query(`
      SELECT
        COUNT(*) FILTER (WHERE obligation_status NOT IN ('filed_confirmed','closed')) AS pending,
        COUNT(*) FILTER (WHERE obligation_status IN ('filed_confirmed','closed')) AS filed,
        COUNT(*) FILTER (WHERE obligation_status = 'overdue') AS overdue,
        COUNT(*) FILTER (WHERE obligation_status = 'escalated') AS escalated,
        COUNT(*) FILTER (WHERE obligation_status NOT IN ('filed_confirmed','closed','overdue','escalated')
          AND due_date <= CURRENT_DATE + INTERVAL '30 days') AS due_soon,
        COUNT(*) FILTER (WHERE obligation_status NOT IN ('filed_confirmed','closed','overdue','escalated')
          AND due_date > CURRENT_DATE + INTERVAL '30 days') AS current_count,
        COUNT(*) AS total
      FROM obligations
    `);
    const oblStatsOut = {
      total: parseInt(oblStats.total || 0),
      current: parseInt(oblStats.current_count || 0),
      due_soon: parseInt(oblStats.due_soon || 0),
      overdue: parseInt(oblStats.overdue || 0),
      escalated: parseInt(oblStats.escalated || 0),
      filed: parseInt(oblStats.filed || 0)
    };
    const now = new Date();

    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const [clientRows, activeRows, aiConvos, failedNotifs, failedJobs, highRiskOrgs] = await Promise.all([
      sql.query("SELECT COUNT(*) as total FROM clients"),
      sql.query("SELECT COUNT(*) as total FROM clients WHERE billing_status = $1", ["active"]),
      sql.query("SELECT confidence_score, escalation_flag FROM ai_conversations WHERE created_at >= $1 LIMIT 500", [yesterday]),
      sql.query("SELECT COUNT(*) as total FROM notifications WHERE delivery_status = $1", ["failed"]),
      db.getFailedJobs(10),
      sql.query(`
        SELECT DISTINCT org.id, org.legal_name, org.entity_type, org.entity_status
        FROM organizations org
        JOIN obligations o ON o.organization_id = org.id
        WHERE o.obligation_status IN ('overdue','escalated')
        LIMIT 5
      `)
    ]);

    const highRisk = (highRiskOrgs || []).map(org => ({
      id: org.id, name: org.legal_name, type: org.entity_type, status: org.entity_status
    }));

    return res.status(200).json({
      success: true,
      compliance: oblStatsOut,
      clients: { total: parseInt(clientRows[0]?.total || 0), active: parseInt(activeRows[0]?.total || 0) },
      ai: { conversations_24h: aiConvos.length, low_confidence: aiConvos.filter(c => c.confidence_score < 0.8).length, escalated: aiConvos.filter(c => c.escalation_flag).length },
      notifications: { failed: parseInt(failedNotifs[0]?.total || 0) },
      workflow: { failed_jobs: failedJobs.length },
      high_risk_entities: highRisk,
      generated_at: now.toISOString()
    });
  } catch (err) {
    logError('command_center_error', {}, err);
    return res.status(500).json({ success: false, error: "internal_error" });
  }
}
