// PA CROP Services — Client Context Aggregator
// POST /api/client-context { email }
// Returns enriched client profile for AI chatbot personalization
// Called by portal before first AI interaction

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  // Demo client
  if (email === 'demo@pacropservices.com') {
    return res.status(200).json({
      success: true,
      context: {
        entityName: 'Acme LLC',
        entityType: 'LLC',
        entityNumber: '7654321',
        entityStatus: 'active',
        plan: 'business_pro',
        planLabel: 'Business Pro',
        price: '$349/yr',
        includesHosting: true,
        includesFiling: true,
        clientSince: '2026-01',
        documentsReceived: 3,
        lastDocumentDate: '2026-03-15',
        lastDocumentType: 'government_correspondence',
        annualReportStatus: 'not_yet_due',
        annualReportDeadline: '2026-09-30',
        daysUntilDeadline: Math.ceil((new Date(new Date().getFullYear(), 8, 30) - new Date()) / 86400000),
        referralCode: 'CROP-DEMO2026',
        referralCount: 2,
        onboardingComplete: true,
        onboardingSteps: {
          accountCreated: true,
          portalAccessed: true,
          agreementSigned: true,
          entityVerified: true,
          firstDocumentReceived: true,
          annualReportReminderSet: true
        }
      }
    });
  }

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;

  let context = {
    entityName: null, entityType: null, entityNumber: null, entityStatus: 'unknown',
    plan: 'compliance_only', planLabel: 'Compliance Only', price: '$99/yr',
    includesHosting: false, includesFiling: false,
    clientSince: null, documentsReceived: 0,
    annualReportStatus: 'unknown', annualReportDeadline: '2026-09-30',
    daysUntilDeadline: Math.ceil((new Date(new Date().getFullYear(), 8, 30) - new Date()) / 86400000),
    onboardingComplete: false,
    onboardingSteps: {
      accountCreated: true, portalAccessed: false, agreementSigned: false,
      entityVerified: false, firstDocumentReceived: false, annualReportReminderSet: true
    }
  };

  if (SD_PUBLIC && SD_SECRET) {
    try {
      const sdRes = await fetch(
        `https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`,
        { headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Accept': 'application/json' } }
      );
      if (sdRes.ok) {
        const sdData = await sdRes.json();
        const contacts = sdData?.data || sdData || [];
        const client = Array.isArray(contacts) ? contacts[0] : contacts;
        
        if (client) {
          const cf = client.custom_fields || {};
          const plan = cf.crop_plan || 'compliance_only';
          const planMap = {
            compliance_only: { label: 'Compliance Only', price: '$99/yr', hosting: false, filing: false },
            business_starter: { label: 'Business Starter', price: '$199/yr', hosting: true, filing: false },
            business_pro: { label: 'Business Pro', price: '$349/yr', hosting: true, filing: true },
            business_empire: { label: 'Business Empire', price: '$699/yr', hosting: true, filing: true }
          };
          const pm = planMap[plan] || planMap.compliance_only;
          
          context = {
            ...context,
            entityName: client.company || `${client.first_name} ${client.last_name}`,
            entityType: cf.entity_type || 'LLC',
            plan,
            planLabel: pm.label,
            price: pm.price,
            includesHosting: pm.hosting,
            includesFiling: pm.filing,
            clientSince: cf.crop_since || client.created_at?.split('T')[0],
            referralCode: cf.referral_code,
            onboardingSteps: {
              ...context.onboardingSteps,
              portalAccessed: !!cf.portal_access_code,
              agreementSigned: true,
              entityVerified: !!cf.entity_type,
            }
          };
          
          // Check onboarding completeness
          const steps = Object.values(context.onboardingSteps);
          context.onboardingComplete = steps.every(Boolean);
        }
      }
    } catch (e) {
      console.error('SuiteDash lookup failed:', e.message);
    }
  }

  return res.status(200).json({ success: true, context });
}
