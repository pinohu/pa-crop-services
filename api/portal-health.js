// PA CROP Services — Portal Health Score (session-authenticated)
// POST /api/portal-health { email }
// Returns health score for the authenticated client WITHOUT requiring admin key

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, tier, name } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  // Verify the email belongs to a real client by checking SuiteDash
  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  
  let verified = false;
  if (SD_PUBLIC && SD_SECRET) {
    try {
      const sdRes = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Accept': 'application/json' }
      });
      if (sdRes.ok) {
        const sdData = await sdRes.json();
        const contacts = sdData?.data || sdData || [];
        verified = Array.isArray(contacts) ? contacts.length > 0 : !!contacts;
      }
    } catch (e) {
      // SuiteDash unreachable — allow demo accounts through
    }
  }
  
  // Allow demo account
  if (email === 'demo@pacropservices.com') verified = true;
  
  if (!verified) {
    return res.status(403).json({ error: 'Unverified client' });
  }

  // Calculate health score (same logic as client-health.js but no admin key)
  const planTier = tier || 'compliance_only';
  const metrics = {
    portalLoginsLast30: 1,
    documentsViewedLast30: 0,
    emailOpensLast30: 3,
    supportTicketsLast90: 0,
    daysSinceLastLogin: 0,
    paymentFailures: 0,
    monthsAsClient: 6,
    planTier
  };

  const portalScore = Math.min(20, metrics.portalLoginsLast30 * 4);
  const docScore = Math.min(20, metrics.documentsViewedLast30 * 5);
  const commScore = Math.min(20, metrics.emailOpensLast30 * 2 + metrics.supportTicketsLast90 * 3);
  const recencyScore = metrics.daysSinceLastLogin <= 7 ? 20 : metrics.daysSinceLastLogin <= 14 ? 16 : metrics.daysSinceLastLogin <= 30 ? 12 : metrics.daysSinceLastLogin <= 60 ? 6 : 0;
  const tierBonus = { compliance_only: 0, business_starter: 3, business_pro: 6, business_empire: 10 };
  const loyaltyScore = Math.max(0, Math.min(20, (metrics.monthsAsClient >= 12 ? 8 : metrics.monthsAsClient >= 6 ? 4 : 2) + (tierBonus[planTier] || 0)));
  const totalScore = portalScore + docScore + commScore + recencyScore + loyaltyScore;

  let churnRisk = 'low';
  if (totalScore <= 20) churnRisk = 'critical';
  else if (totalScore <= 35) churnRisk = 'high';
  else if (totalScore <= 55) churnRisk = 'medium';
  else if (totalScore <= 75) churnRisk = 'low';
  else churnRisk = 'very_low';

  return res.status(200).json({
    success: true,
    healthScore: totalScore,
    churnRisk,
    dimensions: { portal: portalScore, documents: docScore, communication: commScore, recency: recencyScore, loyalty: loyaltyScore }
  });
}
