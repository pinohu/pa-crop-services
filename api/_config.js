// PA CROP Services — Shared Configuration
// Centralizes external service URLs — all values from environment variables only.

export const N8N_BASE = process.env.N8N_WEBHOOK_URL || '';
export const N8N_HEALTH = process.env.N8N_HEALTH_URL || '';

/**
 * Log warnings for missing optional env vars so operators know what's unconfigured.
 * Called lazily — does not block startup.
 */
let _envValidated = false;
export function validateOptionalEnv() {
  if (_envValidated) return;
  _envValidated = true;
  const missing = [];
  if (!process.env.N8N_WEBHOOK_URL) missing.push('N8N_WEBHOOK_URL');
  if (!process.env.N8N_HEALTH_URL) missing.push('N8N_HEALTH_URL');
  if (!process.env.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
  if (!process.env.EMAILIT_API_KEY) missing.push('EMAILIT_API_KEY');
  if (!process.env.SUITEDASH_PUBLIC_ID) missing.push('SUITEDASH_PUBLIC_ID');
  if (missing.length) {
    console.warn(JSON.stringify({
      ts: new Date().toISOString(), service: 'pa-crop', level: 'warn',
      event: 'optional_env_vars_missing', missing,
      note: 'Features depending on these services will be disabled'
    }));
  }
}
