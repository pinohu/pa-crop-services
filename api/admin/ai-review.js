import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    if (!db.isConnected()) return res.status(200).json({ items: [] });
    const sql = db.getSql();
    const limit = parseInt(req.query.limit) || 50;
    const filter = req.query.filter;

    let where = '';
    if (filter === 'escalated') where = 'WHERE escalation_flag = true';
    else if (filter === 'low_confidence') where = 'WHERE confidence_score < 0.8';
    else where = 'WHERE escalation_flag = true OR confidence_score < 0.8';

    const rows = await sql.query(`SELECT * FROM ai_conversations ${where} ORDER BY created_at DESC LIMIT $1`, [limit]);
    return res.status(200).json({ success: true, items: rows || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
