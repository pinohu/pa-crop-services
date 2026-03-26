import { setCors, authenticateRequest, isAdminRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const orgId = req.query.id;

  if (!isAdminRequest(req) && session.orgId !== orgId) {
    return res.status(403).json({ success: false, error: 'access_denied' });
  }

  try {
    let items = await db.getNotificationsForOrg(orgId);

    // Apply query filters
    const { channel, status, limit } = req.query;
    if (channel) items = items.filter(n => n.channel === channel);
    if (status) items = items.filter(n => n.delivery_status === status);
    if (limit) items = items.slice(0, parseInt(limit));

    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    return res.status(200).json({ success: true, items, total: items.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
