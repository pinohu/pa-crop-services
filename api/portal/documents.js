// PA CROP Services — Portal Documents
// GET /api/portal/documents
// Returns paginated list of documents for the authenticated client's organization.
// Fields: id, title, type, date, url, status
// Query params: ?page=1&limit=20
// Requires: Authorization: Bearer <token>

import { setCors, authenticateRequest } from '../services/auth.js';
import { checkRateLimit, getClientIp } from '../_ratelimit.js';
import { createLogger } from '../_log.js';
import * as db from '../services/db.js';

const log = createLogger('portal-documents');

const DOCUMENT_TYPE_LABELS = {
  service_of_process: 'Service of Process',
  government_notice: 'Government Notice',
  tax_notice: 'Tax Notice',
  annual_report_reminder: 'Annual Report Reminder',
  general_mail: 'General Mail',
  filing_confirmation: 'Filing Confirmation',
  annual_report: 'Annual Report',
  legal_document: 'Legal Document',
  correspondence: 'Correspondence'
};

const URGENCY_LABELS = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  normal: 'Normal',
  low: 'Low'
};

function formatDocument(doc) {
  return {
    id: doc.id,
    title: doc.filename || DOCUMENT_TYPE_LABELS[doc.document_type] || 'Document',
    type: doc.document_type || 'general_mail',
    type_label: DOCUMENT_TYPE_LABELS[doc.document_type] || 'General Mail',
    date: doc.received_at || doc.created_at,
    url: doc.storage_url || null,
    status: doc.review_status || 'pending',
    urgency: doc.urgency || 'normal',
    urgency_label: URGENCY_LABELS[doc.urgency] || 'Normal',
    source_channel: doc.source_channel || null,
    obligation_id: doc.obligation_id || null,
    processed_at: doc.processed_at || null,
    mime_type: doc.mime_type || null
  };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({
      data: null,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'GET only' },
      meta: {}
    });
  }

  // Rate limit: 60 requests/min
  const rlResult = await checkRateLimit(getClientIp(req), 'portal-documents', 60, '60s');
  if (rlResult) {
    res.setHeader('Retry-After', String(rlResult.retryAfter));
    return res.status(429).json({
      data: null,
      error: { code: 'RATE_LIMITED', message: 'Too many requests' },
      meta: { retryAfter: rlResult.retryAfter }
    });
  }

  const session = await authenticateRequest(req);
  if (!session?.valid) {
    return res.status(401).json({
      data: null,
      error: { code: 'UNAUTHENTICATED', message: 'Valid Authorization: Bearer <token> required' },
      meta: {}
    });
  }

  const orgId = session.orgId;
  if (!orgId) {
    return res.status(200).json({
      data: { documents: [], total: 0 },
      error: null,
      meta: { page: 1, limit: 20, hasMore: false }
    });
  }

  // Parse and clamp pagination params
  const rawPage = parseInt(req.query.page, 10);
  const rawLimit = parseInt(req.query.limit, 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
  const offset = (page - 1) * limit;

  // Filter params
  const urgencyFilter = req.query.urgency || null;
  const typeFilter = req.query.type || null;
  const statusFilter = req.query.status || null;

  try {
    const allDocuments = await db.getDocumentsForOrg(orgId);

    if (!allDocuments) {
      return res.status(200).json({
        data: { documents: [], total: 0 },
        error: null,
        meta: { page, limit, hasMore: false, requestId: `docs_${Date.now()}` }
      });
    }

    // Apply filters
    let filtered = allDocuments;
    if (urgencyFilter) {
      filtered = filtered.filter(d => d.urgency === urgencyFilter);
    }
    if (typeFilter) {
      filtered = filtered.filter(d => d.document_type === typeFilter);
    }
    if (statusFilter) {
      filtered = filtered.filter(d => d.review_status === statusFilter);
    }

    const total = filtered.length;
    const page_documents = filtered.slice(offset, offset + limit).map(formatDocument);
    const hasMore = offset + limit < total;

    return res.status(200).json({
      data: {
        documents: page_documents,
        total
      },
      error: null,
      meta: {
        page,
        limit,
        hasMore,
        total_pages: Math.ceil(total / limit),
        requestId: `docs_${Date.now()}`,
        orgId
      }
    });
  } catch (err) {
    log.error('documents_error', { clientId: session.clientId, orgId }, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load documents' },
      meta: { requestId: `docs_${Date.now()}` }
    });
  }
}
