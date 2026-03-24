import { setCors, isAdminRequest } from '../services/auth.js';
import { getFailedJobs } from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    const items = await getFailedJobs(parseInt(req.query.limit) || 50);
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
