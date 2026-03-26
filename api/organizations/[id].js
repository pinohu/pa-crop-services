import { setCors, authenticateRequest, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';
import { isValidUUID } from '../_validate.js';
import { createLogger } from '../_log.js';

const log = createLogger('[id]');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const id = req.query.id;
  if (!id || !isValidUUID(id)) return res.status(400).json({ success: false, error: 'invalid_id' });

  // Enforce org-level access control
  if (!isAdminRequest(req) && session.orgId !== id) {
    return res.status(403).json({ success: false, error: 'access_denied' });
  }

  try {
    if (req.method === 'GET') {
      const org = await db.getOrganization(id);
      if (!org) return res.status(404).json({ success: false, error: 'not_found' });
      return res.status(200).json(org);
    }

    if (req.method === 'PATCH') {
      const updates = req.body || {};
      const allowed = ['display_name', 'principal_address', 'metadata'];
      const filtered = {};
      for (const k of allowed) if (updates[k] !== undefined) filtered[k] = updates[k];
      const org = await db.updateOrganization(id, filtered);
      await db.writeAuditEvent({
        actor_type: 'client', actor_id: session.clientId,
        event_type: 'entity.updated', target_type: 'organization', target_id: id,
        after_json: filtered, reason: 'client_update'
      });
      return res.status(200).json({ success: true, organization: org });
    }

    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  } catch (err) {
    log.error('org_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
