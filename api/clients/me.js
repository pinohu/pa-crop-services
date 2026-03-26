import { setCors, authenticateRequest } from '../services/auth.js';
import { getClientById, getOrganization } from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    const client = await getClientById(session.clientId);
    if (!client) return res.status(404).json({ success: false, error: 'not_found' });
    const org = await getOrganization(client.organization_id);
    // Never return raw metadata (contains access_code, internal IDs)
    const { metadata, ...safeClient } = client;
    return res.status(200).json({ success: true, client: safeClient, organization: org });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
