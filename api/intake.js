import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';
import { isValidEmail, isValidString, sanitize } from './_validate.js';
import { fetchWithTimeout } from './_fetch.js';

const log = createLogger('intake');

// PA CROP Services — /api/intake
// Lead capture from compliance check + embedded widget
// Implements GAP-07: Lead Scoring
// POST { email, source, entityType, hasForeignEntity, visitedDeadlineArticle, completedCheck, planInterest }


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
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // Rate limit: Lead capture — 10/min
  if (_rateLimit(req, res, 10, 60000)) return;

  const {
    email, firstName, lastName, source, entityType,
    hasForeignEntity, visitedDeadlineArticle, completedCheck,
    planInterest, phone, partnerId
  } = req.body || {};

  if (!email || !isValidEmail(email)) return res.status(400).json({ success: false, error: 'Valid email required' });
  if (firstName !== undefined && !isValidString(firstName, { minLength: 0, maxLength: 100 })) return res.status(400).json({ success: false, error: 'firstName too long' });
  if (lastName !== undefined && !isValidString(lastName, { minLength: 0, maxLength: 100 })) return res.status(400).json({ success: false, error: 'lastName too long' });
  if (source !== undefined && !isValidString(source, { minLength: 0, maxLength: 100 })) return res.status(400).json({ success: false, error: 'source too long' });
  if (entityType !== undefined && !isValidString(entityType, { minLength: 0, maxLength: 100 })) return res.status(400).json({ success: false, error: 'entityType too long' });
  if (phone !== undefined && !isValidString(phone, { minLength: 0, maxLength: 30 })) return res.status(400).json({ success: false, error: 'phone too long' });
  if (partnerId !== undefined && !isValidString(partnerId, { minLength: 0, maxLength: 64 })) return res.status(400).json({ success: false, error: 'partnerId too long' });

  const cleanEmail = email.toLowerCase().trim();

  // ── Lead Scoring (GAP-07) ─────────────────────────────────────────────────
  let score = 0;
  if (visitedDeadlineArticle)  score += 20; // High intent signal
  if (completedCheck)          score += 30; // Strongest signal — they checked
  if (hasForeignEntity)        score += 25; // Foreign entities have urgent 2027 risk
  if (planInterest === 'pro' || planInterest === 'empire') score += 15;
  if (source === 'compliance-check') score += 10;
  if (source === 'partner-widget')   score += 10;

  // Tier assignment
  let leadTier = 'cold';
  if (score >= 70) leadTier = 'hot';
  else if (score >= 40) leadTier = 'warm';

  const tags = [
    'lead-captured',
    `lead-${leadTier}`,
    source ? `source-${source}` : '',
    partnerId ? `partner-${partnerId}` : '',
    hasForeignEntity ? 'has-foreign-entity' : '',
  ].filter(Boolean);

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const N8N_BASE  = 'https://n8n.audreysplace.place/webhook';

  try {
    // Create SuiteDash contact
    if (SD_PUBLIC && SD_SECRET) {
      await fetchWithTimeout('https://app.suitedash.com/secure-api/contacts', {
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
          role: 'lead',
          tags,
          custom_fields: {
            lead_score: score,
            lead_tier: leadTier,
            lead_source: source || 'website',
            entity_type: entityType || '',
            has_foreign_entity: hasForeignEntity ? 'yes' : 'no',
            partner_id: partnerId || ''
          }
        })
      }).catch(e => log.warn('external_call_failed', { error: e.message }));
    }

    // Fire n8n webhook for nurture sequence
    const webhookPath = leadTier === 'hot' 
      ? 'crop-hot-lead-alert'
      : 'crop-lead-nurture-start';
    
    await fetchWithTimeout(`${N8N_BASE}/${webhookPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail, firstName, source, score, leadTier,
        entityType, hasForeignEntity, partnerId
      })
    }).catch(e => log.warn('external_call_failed', { error: e.message })); // Fire and forget

    // Add to retargeting drip (for leads that don't convert immediately)
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
    fetchWithTimeout(`${baseUrl}/api/retarget`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, name: firstName, riskScore: score, source })
    }).catch(e => log.warn('external_call_failed', { error: e.message })); // Fire and forget

    return res.status(200).json({
      success: true,
      score,
      tier: leadTier,
      message: 'Lead captured successfully'
    });
  } catch (err) {
    log.error('intake_error', {}, err);
    return res.status(500).json({ error: 'Something went wrong processing your request. Please try again or call 814-228-2822.' });
  }
}
