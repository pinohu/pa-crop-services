import { setCors, authenticateRequest } from '../../services/auth.js';
import { markFiled } from '../../services/obligations.js';
import { writeAuditEvent } from '../../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const { proof_document_id, filing_reference } = req.body || {};
  try {
    // Verify ownership: load obligation and check org match
    const { getObligation } = await import('../../services/db.js');
    const obl = await getObligation(req.query.id);
    if (!obl) return res.status(404).json({ success: false, error: 'not_found' });
    if (obl.organization_id !== session.orgId) {
      return res.status(403).json({ success: false, error: 'access_denied' });
    }

    const result = await markFiled(req.query.id,
      { proof_document_id, filing_reference },
      { type: 'client', id: session.clientId });
    return res.status(200).json({ success: true, obligation: obl });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
