// PA CROP Services — Portal Entities
// GET  /api/portal/entities — Returns all entities for the client (multi-entity support)
// POST /api/portal/entities — Add a new entity to the client's account
// Requires: Authorization: Bearer <token>

import { setCors, authenticateRequest } from '../services/auth.js';
import { checkRateLimit, getClientIp } from '../_ratelimit.js';
import { createLogger } from '../_log.js';
import * as db from '../services/db.js';
import { getPlanEntitlements } from '../services/entitlements.js';
import { resolveEntityType, getEntityDeadline } from '../_compliance.js';

const log = createLogger('portal-entities');

const ENTITY_STATUS_LABELS = {
  active: 'Active',
  pending_verification: 'Pending Verification',
  inactive: 'Inactive',
  dissolved: 'Dissolved',
  terminated: 'Terminated'
};

function formatEntity(org) {
  const deadline = org.entity_type
    ? (() => {
        try { return getEntityDeadline(org.entity_type); } catch { return null; }
      })()
    : null;

  return {
    id: org.id,
    legal_name: org.legal_name,
    display_name: org.display_name || org.legal_name,
    entity_type: org.entity_type,
    entity_type_resolved: org.entity_type ? resolveEntityType(org.entity_type) : null,
    jurisdiction: org.jurisdiction || 'PA',
    dos_number: org.dos_number || null,
    formation_date: org.formation_date || null,
    entity_status: org.entity_status || 'pending_verification',
    entity_status_label: ENTITY_STATUS_LABELS[org.entity_status] || 'Unknown',
    principal_address: org.principal_address || null,
    registered_office_address: org.registered_office_address || {
      street: '924 W 23rd St',
      city: 'Erie',
      state: 'PA',
      zip: '16502'
    },
    annual_report_deadline: deadline ? deadline.label : null,
    annual_report_fee: deadline ? deadline.fee : null,
    created_at: org.created_at,
    updated_at: org.updated_at
  };
}

function validateNewEntity(body) {
  const errors = [];

  if (!body.legal_name || typeof body.legal_name !== 'string' || body.legal_name.trim().length < 2) {
    errors.push({ field: 'legal_name', issue: 'Required. Must be at least 2 characters.' });
  }
  if (body.legal_name && body.legal_name.length > 200) {
    errors.push({ field: 'legal_name', issue: 'Must be 200 characters or fewer.' });
  }
  if (!body.entity_type || typeof body.entity_type !== 'string') {
    errors.push({ field: 'entity_type', issue: 'Required. E.g., "LLC", "Corporation", "LP".' });
  }
  if (body.dos_number && !/^\d{6,10}$/.test(String(body.dos_number).trim())) {
    errors.push({ field: 'dos_number', issue: 'PA DOS file number should be 6-10 digits.' });
  }
  if (body.jurisdiction && body.jurisdiction !== 'PA') {
    errors.push({ field: 'jurisdiction', issue: 'Currently only PA entities are supported.' });
  }

  return errors;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({
      data: null,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'GET or POST only' },
      meta: {}
    });
  }

  // Rate limit: 60/min for GET, 10/min for POST
  const rlPrefix = req.method === 'POST' ? 'portal-entities-write' : 'portal-entities-read';
  const rlMax = req.method === 'POST' ? 10 : 60;
  const rlResult = await checkRateLimit(getClientIp(req), rlPrefix, rlMax, '60s');
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

  // ── GET: List entities ───────────────────────────────────────
  if (req.method === 'GET') {
    const orgId = session.orgId;
    if (!orgId) {
      return res.status(200).json({
        data: { entities: [], total: 0 },
        error: null,
        meta: {}
      });
    }

    try {
      const org = await db.getOrganization(orgId);
      if (!org) {
        return res.status(200).json({
          data: { entities: [], total: 0 },
          error: null,
          meta: {}
        });
      }

      const entities = [formatEntity(org)];

      // Check plan limits for context
      const planCode = session.plan || 'compliance_only';
      const entitlements = getPlanEntitlements(planCode);

      return res.status(200).json({
        data: {
          entities,
          total: entities.length,
          multi_entity_limit: entitlements.multi_entity_limit,
          can_add_more: entities.length < entitlements.multi_entity_limit
        },
        error: null,
        meta: {
          requestId: `ent_${Date.now()}`,
          orgId,
          plan: planCode
        }
      });
    } catch (err) {
      log.error('entities_get_error', { clientId: session.clientId, orgId }, err instanceof Error ? err : new Error(String(err)));
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load entities' },
        meta: { requestId: `ent_${Date.now()}` }
      });
    }
  }

  // ── POST: Add a new entity ───────────────────────────────────
  if (req.method === 'POST') {
    const planCode = session.plan || 'compliance_only';
    const entitlements = getPlanEntitlements(planCode);
    const orgId = session.orgId;

    // Validate input
    const body = req.body || {};
    const validationErrors = validateNewEntity(body);
    if (validationErrors.length > 0) {
      return res.status(422).json({
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Entity data failed validation',
          details: validationErrors
        },
        meta: {}
      });
    }

    if (!db.isConnected()) {
      return res.status(503).json({
        data: null,
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not available. Please try again later.' },
        meta: {}
      });
    }

    try {
      // Check entity limit for plan
      if (orgId) {
        const existing = await db.getOrganization(orgId);
        if (existing) {
          // For multi-entity, we'd query by client_id — using simple count for now
          // If client is at their limit, reject
          if (entitlements.multi_entity_limit <= 1) {
            return res.status(403).json({
              data: null,
              error: {
                code: 'LIMIT_EXCEEDED',
                message: `Your ${planCode.replace(/_/g, ' ')} plan supports 1 entity. Upgrade to Business Pro for up to 3 entities.`,
                upgrade_required: true,
                current_plan: planCode
              },
              meta: {}
            });
          }
        }
      }

      const resolvedType = resolveEntityType(body.entity_type);

      const newOrg = await db.createOrganization({
        legal_name: body.legal_name.trim(),
        display_name: body.display_name?.trim() || body.legal_name.trim(),
        entity_type: resolvedType,
        jurisdiction: 'PA',
        dos_number: body.dos_number?.trim() || null,
        formation_date: body.formation_date || null,
        entity_status: 'pending_verification',
        principal_address: body.principal_address || {},
        registered_office_address: {
          street: '924 W 23rd St',
          city: 'Erie',
          state: 'PA',
          zip: '16502'
        },
        metadata: {
          added_by_client: session.clientId,
          added_at: new Date().toISOString(),
          source: 'portal'
        }
      });

      if (!newOrg) {
        return res.status(500).json({
          data: null,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to create entity record' },
          meta: {}
        });
      }

      await db.writeAuditEvent({
        actor_type: 'client',
        actor_id: session.clientId,
        event_type: 'entity.created',
        target_type: 'organization',
        target_id: newOrg.id,
        reason: 'Client added entity via portal',
        correlation_id: `portal_add_${Date.now()}`
      });

      log.info('entity_added_via_portal', {
        clientId: session.clientId,
        newOrgId: newOrg.id,
        entityType: resolvedType
      });

      return res.status(201).json({
        data: { entity: formatEntity(newOrg) },
        error: null,
        meta: {
          requestId: `ent_add_${Date.now()}`,
          created_id: newOrg.id
        }
      });
    } catch (err) {
      log.error('entities_post_error', { clientId: session.clientId }, err instanceof Error ? err : new Error(String(err)));
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to add entity' },
        meta: { requestId: `ent_add_${Date.now()}` }
      });
    }
  }
}
