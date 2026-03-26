import { setCors, authenticateRequest, isAdminRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const id = req.query.id;

  // Non-admin users can only verify their own org
  if (!isAdminRequest(req) && session.orgId !== id) {
    return res.status(403).json({ success: false, error: 'access_denied' });
  }

  try {
    const org = await db.getOrganization(id);
    if (!org) return res.status(404).json({ success: false, error: 'organization_not_found' });

    // Verify required fields are present before marking active
    const missingFields = [];
    if (!org.legal_name) missingFields.push('legal_name');
    if (!org.entity_type) missingFields.push('entity_type');
    if (!org.dos_number) missingFields.push('dos_number');

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'verification_incomplete',
        missing_fields: missingFields
      });
    }

    const beforeStatus = org.entity_status;
    const updated = await db.updateOrganization(id, { entity_status: 'active' });

    await db.writeAuditEvent({
      actor_type: isAdminRequest(req) ? 'admin' : 'client',
      actor_id: session.clientId,
      event_type: 'entity.verified', target_type: 'organization', target_id: id,
      before_json: { entity_status: beforeStatus },
      after_json: { entity_status: 'active' },
      reason: 'entity_verification_complete'
    });

    return res.status(200).json({ success: true, organization: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
