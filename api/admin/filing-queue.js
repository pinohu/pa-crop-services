// PA CROP Services — Admin Filing Operations Queue
// Shows which entities need annual reports filed by Ike (managed plan clients).

import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    if (!db.isConnected()) return res.status(200).json({ success: true, items: [], mode: 'no_db' });

    const sql = db.getSql();

    // Get all managed-filing obligations that aren't yet filed
    const items = await sql.query(`
      SELECT o.*, org.legal_name, org.entity_type, org.dos_number, org.entity_status,
             c.email as client_email, c.owner_name as client_name, c.phone as client_phone, c.plan_code
      FROM obligations o
      JOIN organizations org ON o.organization_id = org.id
      LEFT JOIN clients c ON c.organization_id = org.id
      WHERE o.filing_method IN ('managed', 'auto')
        AND o.obligation_status NOT IN ('filed_confirmed', 'closed')
      ORDER BY o.due_date ASC
    `);

    const now = new Date();
    const queue = (items || []).map(i => {
      const daysUntil = Math.ceil((new Date(i.due_date) - now) / 86400000);
      const hasName = !!i.legal_name;
      const hasDos = !!i.dos_number;
      const hasVerified = i.entity_status === 'active';
      const readyChecks = [hasName, hasDos, hasVerified, true /* fee known */, true /* registered office */];
      const readiness = Math.round(readyChecks.filter(Boolean).length / readyChecks.length * 100);

      return {
        obligation_id: i.id,
        organization_id: i.organization_id,
        entity_name: i.legal_name,
        entity_type: i.entity_type,
        dos_number: i.dos_number,
        entity_status: i.entity_status,
        client_name: i.client_name,
        client_email: i.client_email,
        client_phone: i.client_phone,
        plan: i.plan_code,
        due_date: i.due_date,
        days_until: daysUntil,
        status: i.obligation_status,
        fee: i.fee_usd,
        readiness_pct: readiness,
        missing: [
          ...(!hasName ? ['Entity name'] : []),
          ...(!hasDos ? ['DOS number'] : []),
          ...(!hasVerified ? ['Entity verification'] : [])
        ],
        urgency: daysUntil < 0 ? 'overdue' : daysUntil < 7 ? 'critical' : daysUntil < 14 ? 'high' : daysUntil < 30 ? 'medium' : 'normal',
        filing_url: 'https://file.dos.pa.gov'
      };
    });

    return res.status(200).json({
      success: true,
      items: queue,
      summary: {
        total: queue.length,
        overdue: queue.filter(q => q.urgency === 'overdue').length,
        critical: queue.filter(q => q.urgency === 'critical').length,
        ready: queue.filter(q => q.readiness_pct === 100).length,
        not_ready: queue.filter(q => q.readiness_pct < 100).length
      }
    });
  } catch (err) {
    console.error('Filing queue error:', err.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
