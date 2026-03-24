import { setCors, authenticateRequest } from '../services/auth.js';
import { query } from '../services/assistant.js';
import { getObligation } from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const { obligation_id } = req.body || {};
  try {
    const obl = await getObligation(obligation_id);
    if (!obl) return res.status(404).json({ success: false, error: 'not_found' });

    const answer = await query(
      `Explain this obligation: ${obl.obligation_type} due ${obl.due_date} for entity type ${obl.organizations?.entity_type || 'unknown'}`,
      session.clientId, obl.organization_id, 'portal'
    );
    return res.status(200).json({ success: true, ...answer });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
