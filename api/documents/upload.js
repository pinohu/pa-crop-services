import { setCors, authenticateRequest } from '../services/auth.js';
import * as db from '../services/db.js';
import { notifyAdmin } from '../services/notifications.js';
import { checkRateLimit, getClientIp } from '../_ratelimit.js';
import { isValidUUID, isValidString, requireJson, rejectOversizedBody } from '../_validate.js';
import { createLogger } from '../_log.js';

const log = createLogger('upload');

// Keywords that indicate service of process (needs immediate fast-lane alert)
const SOP_KEYWORDS = ['service of process', 'summons', 'complaint', 'subpoena', 'court order'];

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });
  if (requireJson(req, res)) return;
  if (rejectOversizedBody(req, res, 5_242_880)) return; // 5 MB — extracted text can be large

  // Rate limit: document uploads — 20 per minute per IP
  const rlResult = await checkRateLimit(getClientIp(req), 'doc-upload', 20, '60s');
  if (rlResult) {
    res.setHeader('Retry-After', String(rlResult.retryAfter));
    return res.status(429).json({ success: false, error: 'too_many_requests' });
  }

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const { organization_id, filename, mime_type, source_channel, extracted_text } = req.body || {};
  if (!organization_id || !filename || !mime_type) {
    return res.status(400).json({ success: false, error: 'missing_required_fields' });
  }
  if (!isValidUUID(organization_id)) {
    return res.status(400).json({ success: false, error: 'invalid_organization_id' });
  }
  if (!isValidString(filename, { minLength: 1, maxLength: 255 })) {
    return res.status(400).json({ success: false, error: 'invalid_filename' });
  }
  if (!isValidString(mime_type, { minLength: 1, maxLength: 100 })) {
    return res.status(400).json({ success: false, error: 'invalid_mime_type' });
  }
  if (extracted_text !== undefined && !isValidString(extracted_text, { minLength: 0, maxLength: 50000 })) {
    return res.status(400).json({ success: false, error: 'extracted_text_too_long' });
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
      ).catch(e => log.error('sop_notification_failed', {}, e instanceof Error ? e : new Error(String(e))));
    }

    return res.status(200).json({
      success: true,
      document_id: doc?.id,
      classification: { document_type: autoType, urgency: autoUrgency },
      upload_url: null
    });
  } catch (err) {
    log.error('document_upload_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
