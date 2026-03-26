// PA CROP Services — Portal Auth API
// POST /api/auth  { email, code }
// Returns client data from SuiteDash or error


// ── Rate Limiter ──
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

export default async function handler(req, res) {
  // CORS headers — allow the portal to call this from any domain
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Rate limit: 10 attempts/min (MUST be after method check, before auth logic)
  if (_rateLimit(req, res, 10, 60000)) return;

  const { email, code } = req.body || {};

  if (!email || !code) {
    return res.status(400).json({ success: false, error: 'Missing email or code' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanCode  = code.toUpperCase().trim();

  // ── Demo account (always works) ──────────────────────────────
  if (cleanEmail === 'demo@pacropservices.com' && cleanCode === 'DEMO2026') {
    return res.status(200).json({
      success: true,
      client: {
        name:         'Acme LLC',
        email:        cleanEmail,
        tier:         'business_pro',
        tierLabel:    'Business Pro',
        price:        '$349/yr',
        refCode:      'CROP-DEMO2026',
        since:        'January 2026',
        firstName:    'Demo',
        lastName:     'Client',
        suitedashId:  null
      }
    });
  }

  // ── SuiteDash lookup ─────────────────────────────────────────
  const SD_PUBLIC  = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET  = process.env.SUITEDASH_SECRET_KEY;
  const SD_BASE    = 'https://app.suitedash.com/secure-api';

  if (!SD_PUBLIC || !SD_SECRET) {
    // Keys not yet configured — fail with a clear message
    return res.status(503).json({
      success: false,
      error: 'Service configuration pending. Please contact hello@pacropservices.com'
    });
  }

  try {
    // Search SuiteDash for the contact by email
    const sdRes = await fetch(
      `${SD_BASE}/contacts?email=${encodeURIComponent(cleanEmail)}&limit=5`,
      {
        headers: {
          'X-Public-ID':  SD_PUBLIC,
          'X-Secret-Key': SD_SECRET,
          'Accept':       'application/json'
        }
      }
    );

    if (!sdRes.ok) {
      console.error('SuiteDash error:', sdRes.status, await sdRes.text());
      return res.status(502).json({ success: false, error: 'Unable to verify credentials' });
    }

    const sdData = await sdRes.json();
    const contacts = sdData?.data || [];
    const contact  = contacts.find(c =>
      (c.email || '').toLowerCase() === cleanEmail
    );

    if (!contact) {
      return res.status(401).json({ success: false, error: 'Client not found' });
    }

    // ── Validate access code ──────────────────────────────────
    const customFields  = contact.custom_fields || {};
    const storedCode    = (customFields.portal_access_code || '').toUpperCase();

    // Fallback: CROP + last 6 chars of email local part (uppercase)
    const localPart     = cleanEmail.split('@')[0].replace(/[^a-z0-9]/gi, '').toUpperCase();
    const fallbackCode  = 'CROP' + localPart.slice(-4);

    const codeValid = storedCode === cleanCode || fallbackCode === cleanCode;

    if (!codeValid) {
      return res.status(401).json({ success: false, error: 'Invalid access code' });
    }

    // ── Build client object ───────────────────────────────────
    const tags = contact.tags || [];
    // Map crop_plan custom field to tier + price
    const plan = (customFields.crop_plan || '').toLowerCase();
    let tier = 'compliance_only';
    let tierLabel = 'Compliance Only';
    let price = '$99/yr';
    let includesHosting = false;
    if (plan === 'business_empire' || tags.includes('crop-business_empire')) {
      tier = 'business_empire'; tierLabel = 'Business Empire'; price = '$699/yr'; includesHosting = true;
    } else if (plan === 'business_pro' || tags.includes('crop-business_pro')) {
      tier = 'business_pro'; tierLabel = 'Business Pro'; price = '$349/yr'; includesHosting = true;
    } else if (plan === 'business_starter' || tags.includes('crop-business_starter')) {
      tier = 'business_starter'; tierLabel = 'Business Starter'; price = '$199/yr'; includesHosting = true;
    }

    const firstName  = contact.first_name || '';
    const lastName   = contact.last_name  || '';
    const entityName = customFields.entity_name
                    || customFields.business_name
                    || `${firstName} ${lastName}`.trim()
                    || cleanEmail.split('@')[0];

    const since   = customFields.crop_since
                 || (contact.created_at || '').split('T')[0]
                 || 'January 2026';

    const refCode = customFields.referral_code
                 || ('CROP-' + String(contact.id || 'NEW').slice(-6).toUpperCase());

    return res.status(200).json({
      success: true,
      client: {
        name:           entityName,
        email:          cleanEmail,
        tier,
        tierLabel,
        price,
        includesHosting,
        refCode,
        since,
        firstName,
        lastName,
        entityType:     customFields.entity_type || '',
        hasForeignEntity: customFields.has_foreign_entity || 'no',
        suitedashId:    contact.id
      }
    });

  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ success: false, error: 'Something went wrong. Please try again or call 814-228-2822.' });
  }
}
