// PA CROP Services — Client Context Aggregator
// POST /api/client-context { email }
// Returns enriched client profile for AI chatbot personalization
// Called by portal before first AI interaction


// ── Entity-type-aware deadline computation ──
// Corps (business + nonprofit): June 30 | LLCs: Sept 30 | All others: Dec 31
function getDeadlineForEntityType(entityType) {
  const t = (entityType || '').toLowerCase();
  const year = new Date().getFullYear();
  if (t.includes('corp') || t.includes('nonprofit') || t.includes('non-profit') || t === 'c-corp' || t === 's-corp') {
    return { date: `${year}-06-30`, month: 5, day: 30, label: 'June 30' };
  }
  if (t.includes('llc') || t.includes('limited liability company')) {
    return { date: `${year}-09-30`, month: 8, day: 30, label: 'September 30' };
  }
  if (t.includes('lp') || t.includes('llp') || t.includes('limited partnership') || t.includes('trust') || t.includes('professional association')) {
    return { date: `${year}-12-31`, month: 11, day: 31, label: 'December 31' };
  }
  // Default to LLC deadline if unknown (most common entity type in PA CROP client base)
  return { date: `${year}-09-30`, month: 8, day: 30, label: 'September 30' };
}

function computeDaysUntilDeadline(deadlineInfo) {
  const now = new Date();
  const deadline = new Date(now.getFullYear(), deadlineInfo.month, deadlineInfo.day);
  // If deadline has passed this year, show next year
  if (deadline < now) deadline.setFullYear(deadline.getFullYear() + 1);
  return Math.ceil((deadline - now) / 86400000);
}

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: Client context — 15/min
  if (_rateLimit(req, res, 15, 60000)) return;

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  // Demo client
  if (email === 'demo@pacropservices.com') {
    const demoDeadline = getDeadlineForEntityType('LLC');
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
        annualReportDeadline: demoDeadline.date,
        entityDeadline: demoDeadline.label,
        daysUntilDeadline: computeDaysUntilDeadline(demoDeadline),
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

  const defaultDeadline = getDeadlineForEntityType('LLC'); // default assumption until SuiteDash returns entity type
  let context = {
    entityName: null, entityType: null, entityNumber: null, entityStatus: 'unknown',
    plan: 'compliance_only', planLabel: 'Compliance Only', price: '$99/yr',
    includesHosting: false, includesFiling: false,
    clientSince: null, documentsReceived: 0,
    annualReportStatus: 'unknown', annualReportDeadline: defaultDeadline.date,
    entityDeadline: defaultDeadline.label,
    daysUntilDeadline: computeDaysUntilDeadline(defaultDeadline),
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
          
          // Recompute deadline based on actual entity type from SuiteDash
          const realEntityType = cf.entity_type || 'LLC';
          const realDeadline = getDeadlineForEntityType(realEntityType);
          
          context = {
            ...context,
            entityName: client.company || `${client.first_name} ${client.last_name}`,
            entityType: realEntityType,
            annualReportDeadline: realDeadline.date,
            entityDeadline: realDeadline.label,
            daysUntilDeadline: computeDaysUntilDeadline(realDeadline),
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
