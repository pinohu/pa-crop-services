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
    const obl = await markFiled(req.query.id,
      { proof_document_id, filing_reference },
      { type: 'client', id: session.clientId });
    return res.status(200).json({ success: true, obligation: obl });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}
