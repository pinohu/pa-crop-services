import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';

const log = createLogger('entity-update');

// PA CROP Services — Client Entity Info Self-Update
// POST /api/entity-update { email, entityName, entityType, address, officers, dosNumber }
// Updates SuiteDash, triggers re-verification, generates change form if needed

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });
  const blocked = await checkRateLimit(getClientIp(req), 'entity-update', 5, '60s');
  if (blocked) { res.setHeader('Retry-After', String(blocked.retryAfter)); return res.status(429).json({ success: false, error: 'Too many requests' }); }

  const { email, entityName, entityType, address, officers, dosNumber, phone } = req.body || {};
  if (!email) return res.status(400).json({ success: false, error: 'email required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const result = { updated: [] };

  try {
    if (SD_PUBLIC && SD_SECRET) {
      const sdSearch = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
      });
      const contacts = (await sdSearch.json())?.data || [];
      const contact = contacts[0];
      if (!contact) return res.status(404).json({ success: false, error: 'Client not found' });

      const updates = {};
      if (entityName) { updates.entity_name = entityName; result.updated.push('entityName'); }
      if (entityType) { updates.entity_type = entityType; result.updated.push('entityType'); }
      if (address) { updates.entity_address = address; result.updated.push('address'); }
      if (officers) { updates.entity_officers = officers; result.updated.push('officers'); }
      if (dosNumber) { updates.dos_number = dosNumber; result.updated.push('dosNumber'); }
      if (phone) { updates.phone = phone; result.updated.push('phone'); }
      updates.last_info_update = new Date().toISOString();

      await fetch(`https://app.suitedash.com/secure-api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_fields: updates, ...(phone ? { phone } : {}) })
      });

      // Check if registered office change is needed
      const oldAddress = contact.custom_fields?.entity_address;
      if (address && oldAddress && address !== oldAddress) {
        result.registeredOfficeChangeNeeded = true;
        result.changeInstructions = 'Your address changed. If this affects your registered office, file DSCB:15-108 at file.dos.pa.gov ($5 fee). We can help — call 814-228-2822.';
      }

      // Trigger re-verification
      if (entityName || dosNumber) {
        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
        fetch(`${baseUrl}/api/entity-monitor`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY },
          body: JSON.stringify({ entityName: entityName || contact.custom_fields?.entity_name, dosNumber: dosNumber || contact.custom_fields?.dos_number, email })
        }).catch(e => log.warn('external_call_failed', { error: e.message }));
        result.reverificationTriggered = true;
      }
    }

    return res.status(200).json({ success: true, ...result });
  } catch (e) {
    log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
