// PA CROP Services — Admin API Key Management
// POST:   Create a new API key (returns raw key ONCE)
// GET:    List active keys for an organization
// PATCH:  Rotate a key (create replacement, schedule old key expiry)
// DELETE: Revoke a key by ID

import { setCors, isAdminRequest, generateApiKey } from '../services/auth.js';
import { getSql, isConnected } from '../services/db.js';
import { createLogger } from '../_log.js';

const log = createLogger('admin/api-keys');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });
  if (!isConnected()) return res.status(503).json({ success: false, error: 'database_unavailable' });

  const sql = getSql();

  // ── Create API key ──────────────────────────────────────
  if (req.method === 'POST') {
    const { client_id, organization_id, label, scopes, rate_limit, expires_in_days } = req.body || {};
    if (!organization_id) return res.status(400).json({ success: false, error: 'organization_id required' });

    const { raw, hash } = generateApiKey();
    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 86400000).toISOString()
      : null;

    try {
      const rows = await sql`
        INSERT INTO api_keys (client_id, organization_id, key_hash, label, scopes, rate_limit, expires_at)
        VALUES (${client_id || null}, ${organization_id}, ${hash}, ${label || 'default'},
                ${JSON.stringify(scopes || ['read'])}, ${rate_limit || 100}, ${expiresAt})
        RETURNING id, label, scopes, rate_limit, expires_at, created_at
      `;
      log.info('api_key_created', { orgId: organization_id, keyId: rows[0].id });
      return res.status(201).json({
        success: true,
        api_key: raw,  // Only time the raw key is returned
        key_id: rows[0].id,
        label: rows[0].label,
        scopes: rows[0].scopes,
        rate_limit: rows[0].rate_limit,
        expires_at: rows[0].expires_at,
        warning: 'Store this API key securely. It will not be shown again.'
      });
    } catch (err) {
      log.error('api_key_create_failed', {}, err);
      return res.status(500).json({ success: false, error: 'internal_error' });
    }
  }

  // ── List API keys ───────────────────────────────────────
  if (req.method === 'GET') {
    const orgId = req.query.organization_id;
    try {
      const rows = orgId
        ? await sql`SELECT id, client_id, organization_id, label, scopes, rate_limit, is_active, expires_at, last_used_at, created_at FROM api_keys WHERE organization_id = ${orgId} ORDER BY created_at DESC`
        : await sql`SELECT id, client_id, organization_id, label, scopes, rate_limit, is_active, expires_at, last_used_at, created_at FROM api_keys ORDER BY created_at DESC LIMIT 100`;
      return res.status(200).json({ success: true, items: rows });
    } catch (err) {
      log.error('api_key_list_failed', {}, err);
      return res.status(500).json({ success: false, error: 'internal_error' });
    }
  }

  // ── Rotate API key ──────────────────────────────────────
  // Creates a new key with the same config and schedules old key expiry after grace period
  if (req.method === 'PATCH') {
    const { id, grace_period_hours } = req.body || {};
    if (!id) return res.status(400).json({ success: false, error: 'id required' });
    const gracePeriod = Math.min(Math.max(grace_period_hours || 24, 1), 168); // 1h-7d

    try {
      // Look up existing key
      const existing = await sql`SELECT id, client_id, organization_id, label, scopes, rate_limit FROM api_keys WHERE id = ${id} AND is_active = true`;
      if (!existing?.[0]) return res.status(404).json({ success: false, error: 'key_not_found' });
      const old = existing[0];

      // Create replacement key with same config
      const { raw, hash } = generateApiKey();
      const newRows = await sql`
        INSERT INTO api_keys (client_id, organization_id, key_hash, label, scopes, rate_limit)
        VALUES (${old.client_id}, ${old.organization_id}, ${hash}, ${old.label + ' (rotated)'}, ${JSON.stringify(old.scopes)}, ${old.rate_limit})
        RETURNING id, label, scopes, rate_limit, created_at
      `;

      // Schedule old key expiry (grace period for client transition)
      const oldExpiresAt = new Date(Date.now() + gracePeriod * 3600000).toISOString();
      await sql`UPDATE api_keys SET expires_at = ${oldExpiresAt}, updated_at = now() WHERE id = ${id}`;

      log.info('api_key_rotated', { oldKeyId: id, newKeyId: newRows[0].id, gracePeriodHours: gracePeriod });
      return res.status(200).json({
        success: true,
        new_api_key: raw,
        new_key_id: newRows[0].id,
        old_key_id: id,
        old_key_expires_at: oldExpiresAt,
        grace_period_hours: gracePeriod,
        warning: 'Store this API key securely. It will not be shown again. Old key expires in ' + gracePeriod + ' hours.'
      });
    } catch (err) {
      log.error('api_key_rotate_failed', {}, err);
      return res.status(500).json({ success: false, error: 'internal_error' });
    }
  }

  // ── Revoke API key ──────────────────────────────────────
  if (req.method === 'DELETE') {
    const keyId = req.query.id || req.body?.id;
    if (!keyId) return res.status(400).json({ success: false, error: 'id required' });
    try {
      await sql`UPDATE api_keys SET is_active = false, updated_at = now() WHERE id = ${keyId}`;
      log.info('api_key_revoked', { keyId });
      return res.status(200).json({ success: true });
    } catch (err) {
      log.error('api_key_revoke_failed', {}, err);
      return res.status(500).json({ success: false, error: 'internal_error' });
    }
  }

  return res.status(405).json({ success: false, error: 'method_not_allowed' });
}
