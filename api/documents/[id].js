import { setCors, authenticateRequest, isAdminRequest } from '../services/auth.js';
import { getDocument } from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const id = req.query.id;
  if (!id) return res.status(400).json({ success: false, error: 'missing_document_id' });

  try {
    const doc = await getDocument(id);
    if (!doc) return res.status(404).json({ success: false, error: 'document_not_found' });

    // Non-admin users can only see their own org's documents
    if (!isAdminRequest(req) && doc.organization_id !== session.orgId) {
      return res.status(403).json({ success: false, error: 'access_denied' });
    }

    return res.status(200).json({ success: true, document: doc });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
