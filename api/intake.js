import { rateLimit } from './_rateLimit.js';
// PA CROP Services — /api/intake
// Lead capture from compliance check + embedded widget
// Implements GAP-07: Lead Scoring
// POST { email, source, entityType, hasForeignEntity, visitedDeadlineArticle, completedCheck, planInterest }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: Lead capture — 10/min
  if (rateLimit(req, res, 10, 60000)) return;

  const {
    email, firstName, lastName, source, entityType,
    hasForeignEntity, visitedDeadlineArticle, completedCheck,
    planInterest, phone, partnerId
  } = req.body || {};

  if (!email) return res.status(400).json({ error: 'Email required' });

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
      }).catch(() => {});
    }

    // Fire n8n webhook for nurture sequence
    const webhookPath = leadTier === 'hot' 
      ? 'crop-hot-lead-alert'
      : 'crop-lead-nurture-start';
    
    await fetch(`${N8N_BASE}/${webhookPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail, firstName, source, score, leadTier,
        entityType, hasForeignEntity, partnerId
      })
    }).catch(() => {}); // Fire and forget

    return res.status(200).json({
      success: true,
      score,
      tier: leadTier,
      message: 'Lead captured successfully'
    });
  } catch (err) {
    console.error('Intake error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
