import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    if (!db.isConnected()) return res.status(200).json({ items: [] });
    const sql = db.getSql();

    const urgency = req.query.urgency || 'high';
    const urgencies = urgency === 'all' ? ['normal','high','critical'] : ['high','critical'];

    const rows = await sql.query(
      `SELECT d.*, o.legal_name, o.entity_type FROM documents d
       LEFT JOIN organizations o ON d.organization_id = o.id
       WHERE d.urgency = ANY($1) AND d.review_status = $2
       ORDER BY d.received_at DESC LIMIT 50`,
      [urgencies, 'pending']);
    return res.status(200).json({ success: true, items: rows || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
