// PA CROP Services — /api/entity-request
// Entity formation / add-entity lead capture
// POST { entityName, entityType, email, phone, notes, clientEmail }


// ── Rate Limiter (in-memory, per-instance) ──
const _rl = new Map();
function _rateLimit(req, res, max, win) {
  const ip = (req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.headers['x-real-ip'] || 'unknown';
  const k = ip + ':' + (req.url||'').split('?')[0];
  const now = Date.now();
  let d = _rl.get(k);
  if (!d || now - d.s > win) { _rl.set(k, {c:1,s:now,w:win}); return false; }
  d.c++;
  if (d.c > max) { res.setHeader('Retry-After', String(Math.ceil((d.s+win-now)/1000))); res.status(429).json({error:'Too many requests'}); return true; }
  return false;
}


// ── Emailit Fallback Notifier ──
async function _notifyIke(subject, body) {
  const key = process.env.EMAILIT_API_KEY;
  if (!key) { console.warn('EMAILIT_API_KEY not set — notification skipped:', subject); return; }
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
  } catch (e) { console.error('Emailit fallback failed:', e.message); }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: Entity request — 5/min
  if (_rateLimit(req, res, 5, 60000)) return;

  const { entityName, entityType, email, phone, notes, clientEmail } = req.body || {};
  const contactEmail = email || clientEmail;
  if (!contactEmail) return res.status(400).json({ error: 'Email required' });

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
        }).catch(() => {});
      }
    }

    // Notify Ike via n8n (with email fallback)
    const erRes = await fetch('https://n8n.audreysplace.place/webhook/crop-entity-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityName, entityType, email: contactEmail, phone, notes })
    }).catch(() => null);
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
    console.error('Entity request error:', err);
    return res.status(500).json({ error: 'Internal error. Please call 814-480-0989.' });
  }
}
