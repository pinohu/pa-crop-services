import { setCors, authenticateRequest } from '../services/auth.js';
import * as db from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const { organization_id, filename, mime_type, source_channel } = req.body || {};
  if (!organization_id || !filename || !mime_type) {
    return res.status(400).json({ success: false, error: 'missing_required_fields' });
  }

  // Enforce org-level access: users can only upload to their own org
  if (organization_id !== session.orgId) {
    return res.status(403).json({ success: false, error: 'access_denied' });
  }

  try {
    const doc = await db.createDocument({
      organization_id,
      filename,
      mime_type,
      source_channel: source_channel || 'portal_upload',
      storage_key: `docs/${organization_id}/${Date.now()}-${filename}`,
      received_at: new Date().toISOString(),
      review_status: 'pending',
      urgency: 'normal'
    });

    await db.writeAuditEvent({
      actor_type: 'client', actor_id: session.clientId,
      event_type: 'document.received', target_type: 'document', target_id: doc?.id,
      after_json: { filename, mime_type, source_channel }, reason: 'portal_upload'
    });

    return res.status(200).json({ success: true, document_id: doc?.id, upload_url: null });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
