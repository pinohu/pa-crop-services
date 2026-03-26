// PA CROP Services — Partner Commission Tracker
// POST /api/partner-commission { action: "track|calculate|report" }
// Tracks referral conversions and calculates partner commissions

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_SECRET_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action, payload = {} } = req.body || {};

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;

  // Commission rates by tier
  const commissionRates = {
    compliance_only: { rate: 0.20, amount: 19.80 },      // 20% of $99
    business_starter: { rate: 0.20, amount: 39.80 },     // 20% of $199
    business_pro: { rate: 0.20, amount: 69.80 },         // 20% of $349
    business_empire: { rate: 0.20, amount: 139.80 }      // 20% of $699
  };

  try {
    switch (action) {
      case 'track': {
        // Record a referral conversion
        const { referralCode, clientEmail, clientName, tier } = payload;
        if (!referralCode || !clientEmail) {
          return res.status(400).json({ error: 'referralCode and clientEmail required' });
        }

        const commission = commissionRates[tier] || commissionRates.compliance_only;
        
        // Look up the partner by referral code in SuiteDash
        const searchRes = await fetch(
          `https://app.suitedash.com/secure-api/contacts?tags=crop-partner&limit=100`,
          { headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Accept': 'application/json' } }
        );
        
        const partners = await searchRes.json();
        const partnerList = partners?.data || [];
        const partner = partnerList.find(p => 
          (p.custom_fields?.referral_code || '').toUpperCase() === referralCode.toUpperCase()
        );

        return res.status(200).json({
          success: true,
          referralCode,
          clientEmail,
          clientName,
          tier,
          commissionAmount: commission.amount,
          commissionRate: commission.rate,
          partnerFound: !!partner,
          partnerEmail: partner?.email || null,
          partnerName: partner ? `${partner.first_name} ${partner.last_name}` : null,
          trackedAt: new Date().toISOString()
        });
      }

      case 'calculate': {
        // Calculate commissions for a partner over a period
        const { partnerEmail, startDate, endDate } = payload;
        // This would query Stripe for conversions with the partner's referral code
        // For now, return the rate structure
        return res.status(200).json({
          success: true,
          partnerEmail,
          period: { startDate, endDate },
          rates: commissionRates,
          note: 'Full calculation requires Stripe subscription query — connect via n8n workflow'
        });
      }

      case 'report': {
        // Generate partner commission report
        return res.status(200).json({
          success: true,
          rates: commissionRates,
          partnerProgram: {
            name: 'PA CROP Services Partner Program',
            commissionType: 'Recurring annual',
            rate: '20% of annual fee',
            paymentSchedule: 'Quarterly',
            trackingMethod: 'Referral code in SuiteDash'
          }
        });
      }

      default:
        return res.status(400).json({ error: 'action must be track|calculate|report' });
    }
  } catch (err) {
    console.error('Commission error:', err);
    return res.status(500).json({ error: 'Commission tracking failed', detail: err.message });
  }
}
