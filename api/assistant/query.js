import { setCors, authenticateRequest } from '../services/auth.js';
import { query } from '../services/assistant.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  // Auth optional for public chat, required for portal
  const session = await authenticateRequest(req);
  const { question, client_id, organization_id, channel } = req.body || {};

  if (!question) return res.status(400).json({ success: false, error: 'missing_question' });

  try {
    const answer = await query(
      question,
      client_id || session.clientId || null,
      organization_id || session.orgId || null,
      channel || (session.valid ? 'portal' : 'public')
    );
    return res.status(200).json({ success: true, ...answer });
  } catch (err) {
    console.error('Assistant error:', err.message);
    return res.status(500).json({ success: false, error: 'assistant_error' });
  }
}
