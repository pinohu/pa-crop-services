import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    const supabase = db.getClient();
    if (!supabase) return res.status(200).json({ success: true, mode: 'no_db', message: 'Supabase not configured' });

    // Obligation stats
    const { data: obligations } = await supabase.from('obligations').select('obligation_status, escalation_level, due_date');
    const oblStats = { total: 0, current: 0, due_soon: 0, overdue: 0, escalated: 0, filed: 0 };
    const now = new Date();
    for (const o of (obligations || [])) {
      oblStats.total++;
      if (['filed_confirmed', 'closed'].includes(o.obligation_status)) oblStats.filed++;
      else if (['overdue'].includes(o.obligation_status)) oblStats.overdue++;
      else if (['escalated'].includes(o.obligation_status)) oblStats.escalated++;
      else {
        const days = Math.ceil((new Date(o.due_date) - now) / (1000*60*60*24));
        if (days <= 30) oblStats.due_soon++;
        else oblStats.current++;
      }
    }

    // Client stats
    const { count: totalClients } = await supabase.from('clients').select('*', { count: 'exact', head: true });
    const { count: activeClients } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('billing_status', 'active');

    // AI stats (last 24h)
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const { data: aiConvos } = await supabase.from('ai_conversations').select('confidence_score, escalation_flag').gte('created_at', yesterday);
    const lowConfidence = (aiConvos || []).filter(c => c.confidence_score < 0.8);
    const escalated = (aiConvos || []).filter(c => c.escalation_flag);

    // Notification stats
    const { data: failedNotifs } = await supabase.from('notifications').select('id').eq('delivery_status', 'failed').limit(100);

    // Failed jobs
    const failedJobs = await db.getFailedJobs(10);

    // 5 highest risk entities
    const { data: orgs } = await supabase.from('organizations').select('id, legal_name, entity_type, entity_status').limit(100);
    const highRisk = [];
    for (const org of (orgs || []).slice(0, 20)) {
      const orgObls = (obligations || []).filter(o => o.organization_id === org.id);
      if (orgObls.some(o => ['overdue', 'escalated'].includes(o.obligation_status))) {
        highRisk.push({ id: org.id, name: org.legal_name, type: org.entity_type, status: org.entity_status });
      }
    }

    return res.status(200).json({
      success: true,
      compliance: oblStats,
      clients: { total: totalClients || 0, active: activeClients || 0 },
      ai: {
        conversations_24h: (aiConvos || []).length,
        low_confidence: lowConfidence.length,
        escalated: escalated.length
      },
      notifications: { failed: (failedNotifs || []).length },
      workflow: { failed_jobs: failedJobs.length },
      high_risk_entities: highRisk.slice(0, 5),
      generated_at: now.toISOString()
    });
  } catch (err) {
    console.error('Command center error:', err.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
