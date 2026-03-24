import { setCors, authenticateRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    // AI classification would go here — for now, manual classification
    const { document_type, urgency } = req.body || {};
    const doc = await db.updateDocument(req.query.id, {
      document_type: document_type || 'general_mail',
      urgency: urgency || 'normal',
      processed_at: new Date().toISOString(),
      review_status: 'reviewed'
    });
    return res.status(200).json({
      success: true,
      classification: { document_type: doc?.document_type, urgency: doc?.urgency, extracted_entities: [] }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
