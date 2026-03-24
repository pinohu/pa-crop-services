import { setCors, authenticateRequest, isAdminRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';

import { computeObligations } from '../../services/obligations.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const id = req.query.id;
  try {
    if (req.method === 'GET') {
      const items = await db.getObligationsForOrg(id);
      return res.status(200).json({ items });
    }
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
