// PA CROP Services — /api/partner-intake
// CPA/Attorney partner application intake
// Follows the neatcircle compliance-productized pattern (GAP-15)
// POST { firmName, firstName, lastName, email, phone, clientCount, pricingPreference, firmType }


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

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: Partner apps — 5/min
  if (_rateLimit(req, res, 5, 60000)) return;

  const {
    firmName, firstName, lastName, email, phone,
    clientCount, pricingPreference, firmType
  } = req.body || {};

  if (!email || !firmName) return res.status(400).json({ error: 'Email and firm name required' });

  const cleanEmail = email.toLowerCase().trim();

  // Build tags (compliance-productized pattern)
  const tags = [
    'crop-partner-applicant',
    firmType ? `firm-${firmType}` : '',
    (clientCount && Number(clientCount) > 20) ? 'high-value-partner' : 'standard-partner',
    pricingPreference ? `pricing-${pricingPreference}` : '',
  ].filter(Boolean);

  // Background info for SuiteDash notes
  const backgroundInfo = [
    firmType ? `Firm type: ${firmType}` : '',
    clientCount ? `Estimated client count: ${clientCount}` : '',
    pricingPreference ? `Pricing preference: ${pricingPreference}` : '',
  ].filter(Boolean).join('\n');

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;

  try {
    // Create SuiteDash contact as partner lead
    if (SD_PUBLIC && SD_SECRET) {
      await fetch('https://app.suitedash.com/secure-api/contacts', {
        method: 'POST',
        headers: {
          'X-Public-ID': SD_PUBLIC,
          'X-Secret-Key': SD_SECRET,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: firstName || '',
          last_name: lastName || '',
          email: cleanEmail,
          phone: phone || '',
          company: firmName,
          role: 'lead',
          tags,
          notes: backgroundInfo,
          custom_fields: {
            lead_source: 'partner-application',
            firm_name: firmName,
            firm_type: firmType || '',
            estimated_client_count: clientCount || '',
            pricing_preference: pricingPreference || ''
          }
        })
      }).catch(e => console.error('Silent failure:', e.message));
    }

    // Fire n8n partner onboarding sequence
    await fetch('https://n8n.audreysplace.place/webhook/crop-partner-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firmName, firstName, lastName, email: cleanEmail, phone,
        clientCount, pricingPreference, firmType, tags
      })
    }).catch(e => console.error('Silent failure:', e.message));

    return res.status(200).json({
      success: true,
      message: 'Partner application received. You will hear from us within 1 business day.'
    });
  } catch (err) {
    console.error('Partner intake error:', err);
    return res.status(500).json({ error: 'Internal error. Please email partners@pacropservices.com directly.' });
  }
}
