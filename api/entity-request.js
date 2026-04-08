import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';
import { N8N_BASE } from './_config.js';

const log = createLogger('entity-request');

// PA CROP Services — /api/entity-request
// Entity formation / add-entity lead capture
// POST { entityName, entityType, email, phone, notes, clientEmail }

// ── Emailit Fallback Notifier ──
async function _notifyIke(subject, body) {
  const key = process.env.EMAILIT_API_KEY;
  if (!key) { log.warn('emailit_api_key_not_set_notification_skipped', { error: String(subject) }); return; }
  try {
    await fetch('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'alerts@pacropservices.com',
        to: 'hello@pacropservices.com',
        subject: '[PA CROP] ' + subject,
        html: '<div style="font-family:sans-serif;max-width:600px">' + body + '</div>'
      })
    });
  } catch (e) { log.error('emailit_fallback_failed', {}, e instanceof Error ? e : new Error(String(e))); }
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // Rate limit: Entity request — 5/min
  const blocked = await checkRateLimit(getClientIp(req), 'entity-request', 5, '60s');
  if (blocked) { res.setHeader('Retry-After', String(blocked.retryAfter)); return res.status(429).json({ success: false, error: 'Too many requests' }); }

  const { entityName, entityType, email, phone, notes, clientEmail } = req.body || {};
  const contactEmail = email || clientEmail;
  if (!contactEmail) return res.status(400).json({ success: false, error: 'Email required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;

  try {
    // Create a task/project in SuiteDash for Ike to follow up
    if (SD_PUBLIC && SD_SECRET) {
      // Update contact with entity request tag
      const sdSearch = await fetch(
        `https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(contactEmail.toLowerCase())}&limit=1`,
        { headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET } }
      ).then(r => r.json()).catch(() => ({ data: [] }));

      const contact = (sdSearch?.data || [])[0];
      if (contact) {
        await fetch(`https://app.suitedash.com/secure-api/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: ['entity-formation-request'] })
        }).catch(e => log.warn('external_call_failed', { error: e.message }));
      }
    }

    // Notify Ike via n8n (with email fallback)
    let erRes = null;
    if (N8N_BASE) {
      erRes = await fetch(`${N8N_BASE}/crop-entity-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityName, entityType, email: contactEmail, phone, notes })
      }).catch(() => null);
    } else {
      log.warn('n8n_not_configured', { step: 'entity_request', reason: 'N8N_WEBHOOK_URL not set' });
    }
    if (!erRes || !erRes.ok) {
      await _notifyIke('New Entity Formation Request',
        '<h2>🏢 Entity Formation Request</h2>' +
        '<p><strong>Entity:</strong> ' + (entityName || 'not specified') + '</p>' +
        '<p><strong>Type:</strong> ' + (entityType || 'not specified') + '</p>' +
        '<p><strong>Contact:</strong> ' + contactEmail + '</p>' +
        '<p><strong>Phone:</strong> ' + (phone || 'not provided') + '</p>' +
        '<p><strong>Notes:</strong> ' + (notes || 'none') + '</p>'
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Entity formation request received. We will contact you within 1 business day.'
    });
  } catch (err) {
    log.error('entity_request_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'Internal error. Please call 814-228-2822.' });
  }
}
