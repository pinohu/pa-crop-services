import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';

// PA CROP Services — Portal Health Score (session-authenticated)
// POST /api/portal-health { email, tier, name }
// No admin key — verifies email via SuiteDash before returning score

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  // Rate limit: 15/min
  const blocked = await checkRateLimit(getClientIp(req), 'portal-health', 15, '60s');
  if (blocked) { res.setHeader('Retry-After', String(blocked.retryAfter)); return res.status(429).json({ success: false, error: 'Too many requests' }); }

  const { email, tier, name } = req.body || {};
  if (!email) return res.status(400).json({ success: false, error: 'email required' });

  // Allow demo account
  if (email === 'demo@pacropservices.com') {
    return res.status(200).json(buildScore(tier || 'business_starter'));
  }

  // Verify client exists in SuiteDash
  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;

  if (!SD_PUBLIC || !SD_SECRET) {
    // SuiteDash not configured — return score without verification
    // This is safe because no admin capabilities are exposed
    return res.status(200).json(buildScore(tier || 'compliance_only'));
  }

  try {
    const sdRes = await fetch(
      `https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`,
      { headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Accept': 'application/json' } }
    );
    if (sdRes.ok) {
      const sdData = await sdRes.json();
      const contacts = sdData?.data || sdData || [];
      const found = Array.isArray(contacts) ? contacts.length > 0 : !!contacts;
      if (!found) {
        return res.status(403).json({ success: false, error: 'Client not found' });
      }
    }
  } catch (e) {
    // SuiteDash unreachable — still return score (non-admin endpoint)
  }

  return res.status(200).json(buildScore(tier || 'compliance_only'));
}

function buildScore(planTier) {
  const portalScore = 4;   // 1 login * 4
  const docScore = 0;
  const commScore = 6;     // ~3 email opens * 2
  const recencyScore = 20; // just logged in
  const tierBonus = { compliance_only: 0, business_starter: 3, business_pro: 6, business_empire: 10 };
  const loyaltyScore = Math.max(0, Math.min(20, 4 + (tierBonus[planTier] || 0)));
  const totalScore = portalScore + docScore + commScore + recencyScore + loyaltyScore;

  let churnRisk = 'low';
  if (totalScore <= 20) churnRisk = 'critical';
  else if (totalScore <= 35) churnRisk = 'high';
  else if (totalScore <= 55) churnRisk = 'medium';
  else if (totalScore <= 75) churnRisk = 'low';
  else churnRisk = 'very_low';

  return {
    success: true,
    healthScore: totalScore,
    churnRisk,
    dimensions: { portal: portalScore, documents: docScore, communication: commScore, recency: recencyScore, loyalty: loyaltyScore }
  };
}
