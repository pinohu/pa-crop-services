import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';

const log = createLogger('multi-entity');

// PA CROP Services — Multi-Entity Management (Empire tier)
// GET /api/multi-entity?email=x (list all entities)
// POST /api/multi-entity { email, action, entityData }
// Actions: list, add, remove, update

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const blocked = await checkRateLimit(getClientIp(req), 'multi-entity', 10, '60s');
  if (blocked) { res.setHeader('Retry-After', String(blocked.retryAfter)); return res.status(429).json({ success: false, error: 'Too many requests' }); }

  const email = req.query?.email || req.body?.email;
  if (!email) return res.status(400).json({ success: false, error: 'email required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  if (!SD_PUBLIC || !SD_SECRET) return res.status(500).json({ success: false, error: 'CRM not configured' });

  try {
    const sdSearch = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const contacts = (await sdSearch.json())?.data || [];
    const contact = contacts[0];
    if (!contact) return res.status(404).json({ success: false, error: 'Client not found' });

    const tier = contact.custom_fields?.crop_plan || 'compliance';
    if (tier !== 'empire' && tier !== 'pro') {
      return res.status(403).json({ success: false, error: 'Multi-entity management requires Business Pro or Empire plan', currentTier: tier, upgradeUrl: 'https://pacropservices.com/#pricing' });
    }

    // Parse existing entities (stored as JSON string in custom field)
    let entities = [];
    try { entities = JSON.parse(contact.custom_fields?.entities_json || '[]'); } catch(e) {}

    // Always include primary entity
    if (contact.custom_fields?.entity_name && !entities.find(e => e.name === contact.custom_fields.entity_name)) {
      entities.unshift({
        name: contact.custom_fields.entity_name,
        type: contact.custom_fields.entity_type || 'LLC',
        dosNumber: contact.custom_fields.dos_number || '',
        status: contact.custom_fields.entity_status || 'active',
        primary: true,
        addedDate: contact.custom_fields.crop_since || new Date().toISOString()
      });
    }

    if (req.method === 'GET') {
      return res.status(200).json({ success: true, entities, count: entities.length, tier, maxEntities: tier === 'empire' ? 10 : 3 });
    }

    // POST actions
    const { action, entityData } = req.body || {};
    const maxEntities = tier === 'empire' ? 10 : 3;

    if (action === 'add') {
      if (entities.length >= maxEntities) {
        return res.status(400).json({ success: false, error: `Maximum ${maxEntities} entities on ${tier} plan`, entities });
      }
      if (!entityData?.name) return res.status(400).json({ success: false, error: 'entityData.name required' });
      entities.push({
        name: entityData.name,
        type: entityData.type || 'LLC',
        dosNumber: entityData.dosNumber || '',
        status: 'pending_verification',
        primary: false,
        addedDate: new Date().toISOString()
      });
    } else if (action === 'remove') {
      if (!entityData?.name) return res.status(400).json({ success: false, error: 'entityData.name required' });
      entities = entities.filter(e => e.name !== entityData.name || e.primary);
    } else if (action === 'list') {
      // Already handled above
    } else {
      return res.status(400).json({ success: false, error: 'action must be list, add, or remove' });
    }

    // Save back to SuiteDash
    await fetch(`https://app.suitedash.com/secure-api/contacts/${contact.id}`, {
      method: 'PUT',
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_fields: { entities_json: JSON.stringify(entities), entity_count: String(entities.length) } })
    });

    return res.status(200).json({ success: true, entities, count: entities.length, maxEntities });
  } catch (e) {
    log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
