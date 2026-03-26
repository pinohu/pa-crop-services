// PA CROP Services — Client Entity Info Self-Update
// POST /api/entity-update { email, entityName, entityType, address, officers, dosNumber }
// Updates SuiteDash, triggers re-verification, generates change form if needed

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (_rateLimit(req, res, 5, 60000)) return;

  const { email, entityName, entityType, address, officers, dosNumber, phone } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

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
      if (!contact) return res.status(404).json({ error: 'Client not found' });

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
        }).catch(e => console.error('Silent failure:', e.message));
        result.reverificationTriggered = true;
      }
    }

    return res.status(200).json({ success: true, ...result });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
