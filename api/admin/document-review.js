import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    if (!db.isConnected()) return res.status(200).json({ success: true, items: [], stats: {} });
    const sql = db.getSql();

    const limit = parseInt(req.query.limit) || 50;
    const urgency = req.query.urgency || 'high';
    const status = req.query.status || 'pending';

    const urgencies = urgency === 'all'
      ? ['normal', 'high', 'critical']
      : urgency === 'critical' ? ['critical'] : ['high', 'critical'];

    const statuses = status === 'all'
      ? ['pending', 'escalated', 'auto_classified']
      : [status];

    const rows = await sql.query(
      `SELECT d.*, o.legal_name, o.entity_type, o.dos_number FROM documents d
       LEFT JOIN organizations o ON d.organization_id = o.id
       WHERE d.urgency = ANY($1) AND d.review_status = ANY($2)
       ORDER BY CASE d.urgency WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, d.received_at DESC
       LIMIT $3`,
      [urgencies, statuses, limit]);

    const items = rows || [];
    const stats = {
      total: items.length,
      critical: items.filter(d => d.urgency === 'critical').length,
      high: items.filter(d => d.urgency === 'high').length,
      pending: items.filter(d => d.review_status === 'pending').length,
      escalated: items.filter(d => d.review_status === 'escalated').length
    };

    return res.status(200).json({ success: true, items, stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
