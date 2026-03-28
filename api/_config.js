// PA CROP Services — Shared Configuration
// Centralizes external service URLs that were previously hardcoded across 15+ files.

export const N8N_BASE = process.env.N8N_WEBHOOK_URL || 'https://n8n.audreysplace.place/webhook';
export const N8N_HEALTH = process.env.N8N_HEALTH_URL || 'https://n8n.audreysplace.place/healthz';
