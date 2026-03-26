import { setCors, authenticateRequest } from '../../services/auth.js';
import { transition } from '../../services/obligations.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    // Verify ownership
    const { getObligation } = await import('../../services/db.js');
    const existing = await getObligation(req.query.id);
    if (!existing) return res.status(404).json({ success: false, error: 'not_found' });
    if (existing.organization_id !== session.orgId) {
      return res.status(403).json({ success: false, error: 'access_denied' });
    }

    const obl = await transition(req.query.id, 'awaiting_client_input',
      { type: 'client', id: session.clientId }, 'Client acknowledged obligation');
    return res.status(200).json({ success: true, obligation: obl });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
