import { setCors, authenticateRequest } from '../services/auth.js';
import { query } from '../services/assistant.js';
import { getObligation } from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const { obligation_id, question } = req.body || {};
  try {
    // If obligation_id provided, look it up and explain
    if (obligation_id) {
      const obl = await getObligation(obligation_id);
      if (!obl) return res.status(404).json({ success: false, error: 'not_found' });
      const answer = await query(
        `Explain this obligation: ${obl.obligation_type} due ${obl.due_date} for entity type ${obl.organizations?.entity_type || 'unknown'}`,
        session.clientId, obl.organization_id, 'portal'
      );
      return res.status(200).json({ success: true, ...answer });
    }
    // If freeform question, answer it directly via AI
    if (question) {
      const answer = await query(
        `PA compliance question: ${question}`,
        session.clientId, session.orgId, 'portal'
      );
      return res.status(200).json({ success: true, explanation: answer.answer || answer.text || 'I can help with PA compliance questions.', ...answer });
    }
    return res.status(400).json({ success: false, error: 'Provide obligation_id or question' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
