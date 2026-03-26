// PA CROP Services — Client Context Aggregator
// POST /api/client-context { email }
// Returns enriched client profile for AI chatbot personalization
// Called by portal before first AI interaction

import { getEntityDeadline, computeDaysUntil, getEntityConfig } from './_compliance.js';
import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';
import { isValidEmail } from './_validate.js';

const log = createLogger('client-context');

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

  // Rate limit: Client context — 15/min
  if (_rateLimit(req, res, 15, 60000)) return;

  const { email } = req.body || {};
  if (!email || !isValidEmail(email)) return res.status(400).json({ success: false, error: 'Valid email required' });

  // Demo client
  if (email === 'demo@pacropservices.com') {
    const demoDeadline = getEntityDeadline('LLC');
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
        daysUntilDeadline: computeDaysUntil("LLC"),
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

  const defaultDeadline = getEntityDeadline('LLC'); // default assumption until SuiteDash returns entity type
  let context = {
    entityName: null, entityType: null, entityNumber: null, entityStatus: 'unknown',
    plan: 'compliance_only', planLabel: 'Compliance Only', price: '$99/yr',
    includesHosting: false, includesFiling: false,
    clientSince: null, documentsReceived: 0,
    annualReportStatus: 'unknown', annualReportDeadline: defaultDeadline.date,
    entityDeadline: defaultDeadline.label,
    daysUntilDeadline: computeDaysUntil("LLC"),
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
          const realDeadline = getEntityDeadline(realEntityType);
          
          context = {
            ...context,
            entityName: client.company || `${client.first_name} ${client.last_name}`,
            entityType: realEntityType,
            annualReportDeadline: realDeadline.date,
            entityDeadline: realDeadline.label,
            daysUntilDeadline: computeDaysUntil(realEntityType),
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
      log.warn('suitedash_lookup_failed', { email, error: e.message });
    }
  }

  return res.status(200).json({ success: true, context });
}
