// PA CROP Services — Multi-Entity Management (Empire tier)
// GET /api/multi-entity?email=x (list all entities)
// POST /api/multi-entity { email, action, entityData }
// Actions: list, add, remove, update

const _rl = new Map();
function _rateLimit(req, res, max, win) {
  const ip = (req.headers['x-forwarded-for']||'').split(',')[0].trim()||'unknown';
  const k = ip+':'+(req.url||'').split('?')[0]; const now = Date.now();
  let d = _rl.get(k); if(!d||now-d.s>win){_rl.set(k,{c:1,s:now});return false;}
  d.c++; if(d.c>max){res.setHeader('Retry-After',String(Math.ceil((d.s+win-now)/1000)));res.status(429).json({error:'Too many requests'});return true;} return false;
}

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (_rateLimit(req, res, 10, 60000)) return;

  const email = req.query?.email || req.body?.email;
  if (!email) return res.status(400).json({ error: 'email required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  if (!SD_PUBLIC || !SD_SECRET) return res.status(500).json({ error: 'CRM not configured' });

  try {
    const sdSearch = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const contacts = (await sdSearch.json())?.data || [];
    const contact = contacts[0];
    if (!contact) return res.status(404).json({ error: 'Client not found' });

    const tier = contact.custom_fields?.crop_plan || 'compliance';
    if (tier !== 'empire' && tier !== 'pro') {
      return res.status(403).json({ error: 'Multi-entity management requires Business Pro or Empire plan', currentTier: tier, upgradeUrl: 'https://pacropservices.com/#pricing' });
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
        return res.status(400).json({ error: `Maximum ${maxEntities} entities on ${tier} plan`, entities });
      }
      if (!entityData?.name) return res.status(400).json({ error: 'entityData.name required' });
      entities.push({
        name: entityData.name,
        type: entityData.type || 'LLC',
        dosNumber: entityData.dosNumber || '',
        status: 'pending_verification',
        primary: false,
        addedDate: new Date().toISOString()
      });
    } else if (action === 'remove') {
      if (!entityData?.name) return res.status(400).json({ error: 'entityData.name required' });
      entities = entities.filter(e => e.name !== entityData.name || e.primary);
    } else if (action === 'list') {
      // Already handled above
    } else {
      return res.status(400).json({ error: 'action must be list, add, or remove' });
    }

    // Save back to SuiteDash
    await fetch(`https://app.suitedash.com/secure-api/contacts/${contact.id}`, {
      method: 'PUT',
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify({ custom_fields: { entities_json: JSON.stringify(entities), entity_count: String(entities.length) } })
    });

    return res.status(200).json({ success: true, entities, count: entities.length, maxEntities });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
