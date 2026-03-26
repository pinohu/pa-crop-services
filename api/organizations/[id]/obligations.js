import { setCors, authenticateRequest, isAdminRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';
import { computeObligations } from '../../services/obligations.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const id = req.query.id;

  if (!isAdminRequest(req) && session.orgId !== id) {
    return res.status(403).json({ success: false, error: 'access_denied' });
  }

  try {
    if (req.method === 'GET') {
      let items = await db.getObligationsForOrg(id);

      const { status, type, limit } = req.query;
      if (status) items = items.filter(o => o.obligation_status === status);
      if (type) items = items.filter(o => o.obligation_type === type);
      if (limit) items = items.slice(0, parseInt(limit));

      res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
      return res.status(200).json({ success: true, items, total: items.length });
    }

    if (req.method === 'POST') {
      // Recompute obligations for this org
      const year = req.body?.year || new Date().getFullYear();
      const result = await computeObligations(id, year);
      return res.status(200).json({ success: true, ...result });
    }

    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
