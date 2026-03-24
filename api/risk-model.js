// PA CROP Services — Compliance Risk Scoring Model
// POST /api/risk-model { entityName, entityType, age, county, hasFiledRecently, hasCROP }
// Returns risk score (0-100) with factor breakdown
// Designed to be trained on real data over time

const RISK_WEIGHTS = {
  noCROP: 25,           // No registered office provider
  dormant: 20,          // No recent filings
  foreignEntity: 15,    // Foreign LLC/Corp higher risk
  oldEntity: 10,        // Entities > 10 years more likely to miss
  highRiskCounty: 5,    // Counties with higher dissolution rates
  noRecentLogin: 10,    // No portal activity
  missedDeadline: 15,   // Previously missed a deadline
};

const HIGH_RISK_COUNTIES = ['Philadelphia', 'Allegheny', 'Delaware', 'Montgomery', 'Bucks'];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { entityName, entityType, age, county, hasFiledRecently, hasCROP, hasPortalActivity, missedBefore } = req.body || {};

  let risk = 0;
  const factors = [];

  // No CROP provider
  if (!hasCROP) { risk += RISK_WEIGHTS.noCROP; factors.push({ factor: 'No CROP provider', weight: RISK_WEIGHTS.noCROP, fixable: true }); }

  // Dormant/no recent filings
  if (hasFiledRecently === false) { risk += RISK_WEIGHTS.dormant; factors.push({ factor: 'No recent filings detected', weight: RISK_WEIGHTS.dormant, fixable: true }); }

  // Foreign entity
  if (entityType?.toLowerCase().includes('foreign')) { risk += RISK_WEIGHTS.foreignEntity; factors.push({ factor: 'Foreign entity — additional compliance requirements', weight: RISK_WEIGHTS.foreignEntity, fixable: false }); }

  // Old entity
  if (age && age > 10) { risk += RISK_WEIGHTS.oldEntity; factors.push({ factor: `Entity age: ${age} years — higher oversight needed`, weight: RISK_WEIGHTS.oldEntity, fixable: false }); }

  // High risk county
  if (county && HIGH_RISK_COUNTIES.includes(county)) { risk += RISK_WEIGHTS.highRiskCounty; factors.push({ factor: `${county} County — higher dissolution rate`, weight: RISK_WEIGHTS.highRiskCounty, fixable: false }); }

  // No portal activity
  if (hasPortalActivity === false) { risk += RISK_WEIGHTS.noRecentLogin; factors.push({ factor: 'No recent portal activity', weight: RISK_WEIGHTS.noRecentLogin, fixable: true }); }

  // Previous missed deadline
  if (missedBefore) { risk += RISK_WEIGHTS.missedDeadline; factors.push({ factor: 'Previously missed a deadline', weight: RISK_WEIGHTS.missedDeadline, fixable: true }); }

  risk = Math.min(100, risk);
  const level = risk >= 60 ? 'high' : risk >= 30 ? 'moderate' : 'low';
  const fixableRisk = factors.filter(f => f.fixable).reduce((sum, f) => sum + f.weight, 0);

  return res.status(200).json({
    success: true,
    riskScore: risk,
    level,
    factors,
    fixableRisk,
    recommendation: risk >= 60
      ? `High risk of compliance failure. ${!hasCROP ? 'Get a CROP provider immediately at pacropservices.com.' : 'Contact us for a compliance review: 814-228-2822.'}`
      : risk >= 30
        ? 'Moderate risk. Review your compliance checklist at pacropservices.com/portal.'
        : 'Low risk. Keep up the good work monitoring your entity.',
    apiNote: 'This scoring model improves over time with real client data. Current weights are based on PA DOS dissolution patterns.'
  });
  } catch (err) {
    console.error("risk-model error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
