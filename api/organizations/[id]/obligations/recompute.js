import { setCors, authenticateRequest } from '../../../services/auth.js';
import { computeObligations } from '../../../services/obligations.js';
import { createLogger } from '../../../_log.js';

const log = createLogger('recompute');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const id = req.query.id;
  const year = req.body?.year || new Date().getFullYear();
  try {
    const result = await computeObligations(id, year);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    log.error('recompute_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
