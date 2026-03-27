// PA CROP Services — Portal Settings
// GET   /api/portal/settings — Returns user profile and notification preferences
// PATCH /api/portal/settings — Update notification preferences and profile fields
// Requires: Authorization: Bearer <token>

import { setCors, authenticateRequest } from '../services/auth.js';
import { checkRateLimit, getClientIp } from '../_ratelimit.js';
import { createLogger } from '../_log.js';
import * as db from '../services/db.js';

const log = createLogger('portal-settings');

// Fields the client is allowed to update via PATCH
const ALLOWED_PROFILE_FIELDS = ['owner_name', 'phone'];

const DEFAULT_NOTIFICATION_PREFS = {
  email_reminders: true,
  sms_reminders: false,
  email_document_alerts: true,
  sms_document_alerts: false,
  email_billing: true,
  sms_billing: false,
  reminder_days_before: [90, 60, 30, 14, 7],
  escalation_email: true,
  marketing_emails: false
};

function buildProfile(client) {
  return {
    id: client.id,
    owner_name: client.owner_name || null,
    email: client.email,
    phone: client.phone || null,
    plan_code: client.plan_code || 'compliance_only',
    billing_status: client.billing_status || 'active',
    onboarding_status: client.onboarding_status || 'not_started',
    referral_code: client.referral_code || null,
    member_since: client.created_at || null,
    communication_prefs: {
      ...DEFAULT_NOTIFICATION_PREFS,
      ...(client.communication_prefs || {})
    }
  };
}

function validatePatch(body) {
  const errors = [];

  if (body.owner_name !== undefined) {
    if (typeof body.owner_name !== 'string' || body.owner_name.trim().length < 1) {
      errors.push({ field: 'owner_name', issue: 'Must be a non-empty string.' });
    }
    if (body.owner_name?.length > 200) {
      errors.push({ field: 'owner_name', issue: 'Must be 200 characters or fewer.' });
    }
  }

  if (body.phone !== undefined && body.phone !== null) {
    const digits = String(body.phone).replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      errors.push({ field: 'phone', issue: 'Must be a valid phone number (10-15 digits).' });
    }
  }

  if (body.communication_prefs !== undefined) {
    if (typeof body.communication_prefs !== 'object' || Array.isArray(body.communication_prefs)) {
      errors.push({ field: 'communication_prefs', issue: 'Must be an object.' });
    } else {
      const prefs = body.communication_prefs;
      const boolFields = [
        'email_reminders', 'sms_reminders', 'email_document_alerts', 'sms_document_alerts',
        'email_billing', 'sms_billing', 'escalation_email', 'marketing_emails'
      ];
      for (const f of boolFields) {
        if (prefs[f] !== undefined && typeof prefs[f] !== 'boolean') {
          errors.push({ field: `communication_prefs.${f}`, issue: 'Must be a boolean.' });
        }
      }
      if (prefs.reminder_days_before !== undefined) {
        if (!Array.isArray(prefs.reminder_days_before)) {
          errors.push({ field: 'communication_prefs.reminder_days_before', issue: 'Must be an array of numbers.' });
        } else if (prefs.reminder_days_before.some(d => typeof d !== 'number' || d < 1 || d > 365)) {
          errors.push({ field: 'communication_prefs.reminder_days_before', issue: 'Each value must be a number between 1 and 365.' });
        }
      }
    }
  }

  return errors;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!['GET', 'PATCH'].includes(req.method)) {
    return res.status(405).json({
      data: null,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'GET or PATCH only' },
      meta: {}
    });
  }

  // Rate limit: 60/min for GET, 10/min for PATCH
  const rlPrefix = req.method === 'PATCH' ? 'portal-settings-write' : 'portal-settings-read';
  const rlMax = req.method === 'PATCH' ? 10 : 60;
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

  // ── GET: Return profile + preferences ──────────────────────
  if (req.method === 'GET') {
    try {
      let client = null;

      if (db.isConnected()) {
        client = await db.getClientById(session.clientId);
      }

      if (!client) {
        // Build a minimal profile from JWT claims
        client = {
          id: session.clientId,
          email: session.email,
          owner_name: null,
          phone: null,
          plan_code: session.plan || 'compliance_only',
          billing_status: 'active',
          onboarding_status: 'not_started',
          referral_code: null,
          created_at: null,
          communication_prefs: {}
        };
      }

      return res.status(200).json({
        data: { profile: buildProfile(client) },
        error: null,
        meta: {
          requestId: `settings_${Date.now()}`,
          clientId: session.clientId
        }
      });
    } catch (err) {
      log.error('settings_get_error', { clientId: session.clientId }, err instanceof Error ? err : new Error(String(err)));
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load settings' },
        meta: { requestId: `settings_${Date.now()}` }
      });
    }
  }

  // ── PATCH: Update profile and/or preferences ────────────────
  if (req.method === 'PATCH') {
    const body = req.body || {};

    const validationErrors = validatePatch(body);
    if (validationErrors.length > 0) {
      return res.status(422).json({
        data: null,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Settings update failed validation',
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
      const existing = await db.getClientById(session.clientId);
      if (!existing) {
        return res.status(404).json({
          data: null,
          error: { code: 'NOT_FOUND', message: 'Client record not found' },
          meta: {}
        });
      }

      const updates = {};

      // Apply allowed profile field updates
      for (const field of ALLOWED_PROFILE_FIELDS) {
        if (body[field] !== undefined) {
          updates[field] = typeof body[field] === 'string' ? body[field].trim() : body[field];
        }
      }

      // Merge notification preferences
      if (body.communication_prefs !== undefined) {
        updates.communication_prefs = {
          ...DEFAULT_NOTIFICATION_PREFS,
          ...(existing.communication_prefs || {}),
          ...body.communication_prefs
        };
      }

      if (Object.keys(updates).length === 0) {
        return res.status(200).json({
          data: { profile: buildProfile(existing) },
          error: null,
          meta: { requestId: `settings_${Date.now()}`, updated: false }
        });
      }

      const updated = await db.updateClient(session.clientId, updates);

      await db.writeAuditEvent({
        actor_type: 'client',
        actor_id: session.clientId,
        event_type: 'client.settings_updated',
        target_type: 'client',
        target_id: session.clientId,
        before_json: {
          owner_name: existing.owner_name,
          phone: existing.phone,
          communication_prefs: existing.communication_prefs
        },
        after_json: updates,
        reason: 'Client updated settings via portal',
        correlation_id: `settings_patch_${Date.now()}`
      });

      log.info('settings_updated', {
        clientId: session.clientId,
        fields: Object.keys(updates).join(',')
      });

      return res.status(200).json({
        data: { profile: buildProfile(updated || existing) },
        error: null,
        meta: {
          requestId: `settings_${Date.now()}`,
          updated: true,
          fields_updated: Object.keys(updates)
        }
      });
    } catch (err) {
      log.error('settings_patch_error', { clientId: session.clientId }, err instanceof Error ? err : new Error(String(err)));
      return res.status(500).json({
        data: null,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update settings' },
        meta: { requestId: `settings_${Date.now()}` }
      });
    }
  }
}
