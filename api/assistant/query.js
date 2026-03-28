import { setCors, authenticateRequest } from '../services/auth.js';
import { query } from '../services/assistant.js';
import { createLogger } from '../_log.js';

const log = createLogger('query');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  // Auth optional for public chat, required for portal
  const session = await authenticateRequest(req);
  const { question, client_id, organization_id, channel } = req.body || {};

  if (!question) return res.status(400).json({ success: false, error: 'missing_question' });

  try {
    // Session-authenticated values always win over client-supplied IDs (prevent IDOR)
    const effectiveClientId = session.valid ? session.clientId : (client_id || null);
    const effectiveOrgId = session.valid ? session.orgId : (organization_id || null);

    const answer = await query(
      question,
      effectiveClientId,
      effectiveOrgId,
      channel || (session.valid ? 'portal' : 'public')
    );
    return res.status(200).json({ success: true, ...answer });
  } catch (err) {
    log.error('assistant_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'assistant_error' });
  }
}
