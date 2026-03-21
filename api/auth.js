// PA CROP Services — Portal Auth API
// POST /api/auth  { email, code }
// Returns client data from SuiteDash or error

export default async function handler(req, res) {
  // CORS headers — allow the portal to call this from any domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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
        tier:         'Professional',
        price:        '$179/yr',
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
    let tier  = 'Starter';
    let price = '$79/yr';
    if      (tags.includes('crop-premium')       || customFields.crop_plan === 'premium')       { tier = 'Premium';      price = '$299/yr'; }
    else if (tags.includes('crop-professional')  || customFields.crop_plan === 'professional')  { tier = 'Professional'; price = '$179/yr'; }

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
        name:        entityName,
        email:       cleanEmail,
        tier,
        price,
        refCode,
        since,
        firstName,
        lastName,
        suitedashId: contact.id
      }
    });

  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ success: false, error: 'Internal error. Please try again.' });
  }
}
