// PA CROP Services — Admin API Key Management
// POST: Create a new API key (returns raw key ONCE)
// GET:  List active keys for an organization
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
