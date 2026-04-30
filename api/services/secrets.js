// PA CROP Services — Symmetric secret encryption
//
// Uses AES-256-GCM with a single master key from the env var
// SECRETS_MASTER_KEY (32 bytes, base64 or hex). Format of stored ciphertext:
//
//   "enc:v1:<base64(iv)>:<base64(authTag)>:<base64(ciphertext)>"
//
// The "enc:v1:" prefix lets readers detect encrypted vs legacy plaintext
// values and lazily migrate as records pass through the read path. Until the
// master key rotation cadence is established, this is sufficient — when key
// rotation is needed, add v2 with key-id metadata.
//
// Use cases:
//   - clients.metadata.hosting_password (the immediate audit finding)
//   - any future per-client secrets stored in JSONB metadata
//
// NOT for: Stripe customer IDs, SuiteDash UIDs, access codes (those need a
// different lifecycle — access codes get rotated via reset, etc.).

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { logWarn, logError } from '../_log.js';

const PREFIX = 'enc:v1:';
const IV_LEN = 12; // GCM standard
const KEY_LEN = 32;

let _keyCache = null;

function getKey() {
  if (_keyCache) return _keyCache;
  const raw = process.env.SECRETS_MASTER_KEY;
  if (!raw) return null;
  let buf;
  // Accept base64 (44-char standard / 43 url-safe) or hex (64-char) or raw 32-byte.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    buf = Buffer.from(raw, 'hex');
  } else {
    try { buf = Buffer.from(raw, 'base64'); } catch { buf = null; }
  }
  if (!buf || buf.length !== KEY_LEN) {
    // Last resort: derive from arbitrary string via SHA-256. NOT ideal, but
    // beats hard-failing if the operator pasted a long string.
    buf = createHash('sha256').update(raw, 'utf8').digest();
    logWarn('secrets_master_key_derived', { reason: 'raw value not 32-byte base64/hex; SHA-256 derived' });
  }
  _keyCache = buf;
  return _keyCache;
}

/**
 * True if the SECRETS_MASTER_KEY env var is configured. Callers should check
 * this before assuming encryption is available.
 */
export function isConfigured() {
  return !!getKey();
}

/**
 * True if the value already looks encrypted (has the enc:v1: prefix).
 */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

/**
 * Encrypt a plaintext string. If no master key is configured, returns the
 * plaintext unchanged and logs a warning — this lets the codebase ship in a
 * partially-configured state without throwing on every write.
 */
export function encrypt(plaintext) {
  if (typeof plaintext !== 'string' || plaintext.length === 0) return plaintext;
  if (isEncrypted(plaintext)) return plaintext; // Already encrypted
  const key = getKey();
  if (!key) {
    logWarn('secrets_encrypt_skipped', { reason: 'SECRETS_MASTER_KEY not configured' });
    return plaintext;
  }
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

/**
 * Decrypt an enc:v1: blob. If the input isn't encrypted (legacy plaintext),
 * returns it as-is so the read path is backward-compatible during migration.
 * Throws on decryption failure with a structured error.
 */
export function decrypt(value) {
  if (typeof value !== 'string' || value.length === 0) return value;
  if (!isEncrypted(value)) return value; // Legacy plaintext — return as-is
  const key = getKey();
  if (!key) {
    logError('secrets_decrypt_failed', { reason: 'SECRETS_MASTER_KEY not configured but encrypted value found' });
    throw new Error('SECRETS_MASTER_KEY not configured');
  }
  const parts = value.slice(PREFIX.length).split(':');
  if (parts.length !== 3) throw new Error('Malformed enc:v1: blob');
  const [ivB64, tagB64, ctB64] = parts;
  try {
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const ciphertext = Buffer.from(ctB64, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    return plaintext;
  } catch (err) {
    logError('secrets_decrypt_failed', { reason: err.message });
    throw new Error('Decryption failed');
  }
}

/**
 * Convenience: encrypt every value in `obj` whose key matches `keys`. Useful
 * for protecting selected JSONB metadata fields (e.g. hosting_password) before
 * persistence without affecting the rest of the metadata blob.
 */
export function encryptFields(obj, keys) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const k of keys) {
    if (typeof out[k] === 'string' && out[k].length > 0) {
      out[k] = encrypt(out[k]);
    }
  }
  return out;
}

/**
 * Convenience: decrypt every value in `obj` whose key matches `keys`. Tolerant
 * of legacy plaintext (returns as-is) and of decryption failures (logs and
 * leaves the original value rather than throwing — the caller decides whether
 * to surface).
 */
export function decryptFields(obj, keys) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  for (const k of keys) {
    if (typeof out[k] === 'string' && isEncrypted(out[k])) {
      try { out[k] = decrypt(out[k]); }
      catch { /* leave the cipher blob in place; surface elsewhere */ }
    }
  }
  return out;
}

// Reset cached key (test-only)
export function _resetCache() { _keyCache = null; }
