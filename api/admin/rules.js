import { setCors, isAdminRequest } from '../services/auth.js';
import { getAllRules, createRule } from '../services/db.js';
import { createLogger } from '../_log.js';

const log = createLogger('rules');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    if (req.method === 'GET') {
      const items = await getAllRules();
      return res.status(200).json({ items });
    }
    if (req.method === 'POST') {
      const rule = await createRule(req.body);
      return res.status(200).json({ success: true, rule });
    }
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  } catch (err) {
    log.error('rules_handler_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
