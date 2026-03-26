// PA CROP Services — Client Health Score Calculator
// POST /api/client-health { clientId, metrics }
// Calculates health score and churn probability

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Internal-Key, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = req.headers['x-admin-key'] || req.headers['x-internal-key'];
  if (key !== (process.env.ADMIN_SECRET_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { clientEmail, clientName, metrics = {} } = req.body || {};

  try {
  // Scoring dimensions (0-20 each, total 0-100)
  const {
    portalLoginsLast30 = 0,    // How often they log in
    documentsViewedLast30 = 0,  // Engagement with documents
    emailOpensLast30 = 0,       // Email engagement
    supportTicketsLast90 = 0,   // Active support = engaged
    daysSinceLastLogin = 999,   // Recency
    paymentFailures = 0,        // Payment health
    monthsAsClient = 0,         // Tenure
    planTier = 'compliance_only' // Higher tier = more invested
  } = metrics;

  // Portal engagement (0-20)
  let portalScore = Math.min(20, portalLoginsLast30 * 4);
  
  // Document engagement (0-20)  
  let docScore = Math.min(20, documentsViewedLast30 * 5);
  
  // Communication (0-20)
  let commScore = Math.min(20, emailOpensLast30 * 2 + supportTicketsLast90 * 3);
  
  // Recency (0-20)
  let recencyScore = daysSinceLastLogin <= 7 ? 20 : 
                     daysSinceLastLogin <= 14 ? 16 :
                     daysSinceLastLogin <= 30 ? 12 :
                     daysSinceLastLogin <= 60 ? 6 :
                     daysSinceLastLogin <= 90 ? 3 : 0;

  // Loyalty (0-20)
  const tierBonus = { compliance_only: 0, business_starter: 3, business_pro: 6, business_empire: 10 };
  let loyaltyScore = Math.min(20, 
    (monthsAsClient >= 12 ? 8 : monthsAsClient >= 6 ? 4 : monthsAsClient >= 3 ? 2 : 0) +
    (tierBonus[planTier] || 0) -
    (paymentFailures * 5)
  );
  loyaltyScore = Math.max(0, loyaltyScore);

  const totalScore = portalScore + docScore + commScore + recencyScore + loyaltyScore;
  
  // Churn risk
  let churnRisk = 'low';
  let churnProbability = 0;
  if (totalScore <= 20) { churnRisk = 'critical'; churnProbability = 85; }
  else if (totalScore <= 35) { churnRisk = 'high'; churnProbability = 60; }
  else if (totalScore <= 55) { churnRisk = 'medium'; churnProbability = 30; }
  else if (totalScore <= 75) { churnRisk = 'low'; churnProbability = 10; }
  else { churnRisk = 'very_low'; churnProbability = 3; }

  // Recommended action
  let action = 'none';
  if (churnRisk === 'critical') action = 'immediate_outreach';
  else if (churnRisk === 'high') action = 'personal_email';
  else if (churnRisk === 'medium') action = 'engagement_nudge';
  else if (totalScore >= 80) action = 'upsell_opportunity';

  return res.status(200).json({
    success: true,
    clientEmail,
    clientName,
    healthScore: totalScore,
    dimensions: {
      portal: portalScore,
      documents: docScore,
      communication: commScore,
      recency: recencyScore,
      loyalty: loyaltyScore
    },
    churnRisk,
    churnProbability,
    recommendedAction: action,
    calculatedAt: new Date().toISOString()
  });
  } catch (err) {
    console.error('Health score error:', err);
    return res.status(500).json({ success: false, error: 'Failed to calculate health score' });
  }
}
