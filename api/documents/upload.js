import { setCors, authenticateRequest } from '../services/auth.js';
import * as db from '../services/db.js';
import { notifyAdmin } from '../services/notifications.js';

// Keywords that indicate service of process (needs immediate fast-lane alert)
const SOP_KEYWORDS = ['service of process', 'summons', 'complaint', 'subpoena', 'court order'];

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const { organization_id, filename, mime_type, source_channel, extracted_text } = req.body || {};
  if (!organization_id || !filename || !mime_type) {
    return res.status(400).json({ success: false, error: 'missing_required_fields' });
  }

  if (organization_id !== session.orgId) {
    return res.status(403).json({ success: false, error: 'access_denied' });
  }

  try {
    // Auto-classify based on filename
    const fnLower = (filename || '').toLowerCase();
    const textLower = (extracted_text || '').toLowerCase();
    const searchable = fnLower + ' ' + textLower;

    let autoType = 'general_mail';
    let autoUrgency = 'normal';
    const isSOP = SOP_KEYWORDS.some(kw => searchable.includes(kw));

    if (isSOP) { autoType = 'service_of_process'; autoUrgency = 'critical'; }
    else if (searchable.includes('irs') || searchable.includes('tax')) { autoType = 'tax_notice'; autoUrgency = 'high'; }
    else if (searchable.includes('department of state') || searchable.includes('dos')) { autoType = 'government_notice'; autoUrgency = 'high'; }
    else if (searchable.includes('annual report')) { autoType = 'annual_report'; autoUrgency = 'normal'; }
    else if (searchable.includes('invoice')) { autoType = 'invoice'; autoUrgency = 'normal'; }

    const doc = await db.createDocument({
      organization_id,
      filename,
      mime_type,
      source_channel: source_channel || 'portal_upload',
      document_type: autoType,
      urgency: autoUrgency,
      storage_key: `docs/${organization_id}/${Date.now()}-${filename}`,
      received_at: new Date().toISOString(),
      review_status: autoUrgency === 'critical' ? 'escalated' : 'auto_classified'
    });

    await db.writeAuditEvent({
      actor_type: 'client', actor_id: session.clientId,
      event_type: 'document.received', target_type: 'document', target_id: doc?.id,
      after_json: { filename, mime_type, document_type: autoType, urgency: autoUrgency },
      reason: 'portal_upload'
    });

    // SOP fast-lane: immediate admin notification for service of process
    if (isSOP) {
      await notifyAdmin('URGENT: Service of Process Received',
        `A service of process document was uploaded for org ${organization_id}.\n` +
        `Filename: ${filename}\nThis requires immediate attention within the legal response window.`
      ).catch(e => console.error('SOP notification failed:', e.message));
    }

    return res.status(200).json({
      success: true,
      document_id: doc?.id,
      classification: { document_type: autoType, urgency: autoUrgency },
      upload_url: null
    });
  } catch (err) {
    console.error('Document upload error:', err.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
