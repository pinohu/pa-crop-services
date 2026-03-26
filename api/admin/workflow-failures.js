import { setCors, isAdminRequest } from '../services/auth.js';
import { getFailedJobs } from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    const limit = parseInt(req.query.limit) || 50;
    const items = await getFailedJobs(limit);

    // Enrich with summary stats
    const stats = {
      total: items.length,
      failed: items.filter(j => j.job_status === 'failed').length,
      dead_letter: items.filter(j => j.job_status === 'dead_letter').length,
      by_type: {}
    };
    for (const job of items) {
      stats.by_type[job.job_type] = (stats.by_type[job.job_type] || 0) + 1;
    }

    return res.status(200).json({ success: true, items, stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
