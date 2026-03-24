// PA CROP Services — Portal Value Layer APIs
// These endpoints power the "value stacked" portal experience.
// Every response is designed to make the client feel: protected, informed,
// guided, ahead of risk, supported, and getting a bargain.

import { setCors, authenticateRequest } from '../services/auth.js';
import * as db from '../services/db.js';
import { computeRisk } from '../services/obligations.js';
import { getPlanEntitlements, getFilingMethod } from '../services/entitlements.js';

// ═══════════════════════════════════════════════════════════
// SAVINGS CALCULATOR — "What you would pay elsewhere"
// ═══════════════════════════════════════════════════════════

const MARKET_PRICES = {
  registered_office: { label: 'Registered office service', low: 125, high: 299, unit: '/yr' },
  compliance_monitoring: { label: 'Compliance monitoring & alerts', low: 75, high: 150, unit: '/yr' },
  email_hosting: { label: 'Business email (5 mailboxes)', low: 360, high: 500, unit: '/yr' },
  domain: { label: 'Domain registration', low: 12, high: 20, unit: '/yr' },
  website_hosting: { label: 'Website hosting + SSL', low: 120, high: 240, unit: '/yr' },
  website_build: { label: 'Business website (one-time)', low: 500, high: 2000, unit: '' },
  filing_service: { label: 'Annual report filing service', low: 50, high: 150, unit: '/yr' },
  phone_line: { label: 'Dedicated business phone line', low: 180, high: 300, unit: '/yr' },
  notary: { label: 'Notarization (2 per year)', low: 20, high: 50, unit: '/yr' }
};

const PLAN_INCLUDES = {
  compliance_only: ['registered_office', 'compliance_monitoring'],
  business_starter: ['registered_office', 'compliance_monitoring', 'email_hosting', 'domain', 'website_hosting', 'website_build'],
  business_pro: ['registered_office', 'compliance_monitoring', 'email_hosting', 'domain', 'website_hosting', 'website_build', 'filing_service', 'phone_line'],
  business_empire: ['registered_office', 'compliance_monitoring', 'email_hosting', 'domain', 'website_hosting', 'website_build', 'filing_service', 'phone_line', 'notary']
};

const PLAN_PRICES = { compliance_only: 99, business_starter: 199, business_pro: 349, business_empire: 699 };

export function computeSavings(planCode) {
  const included = PLAN_INCLUDES[planCode] || PLAN_INCLUDES.compliance_only;
  const planPrice = PLAN_PRICES[planCode] || 99;
  let marketLow = 0, marketHigh = 0;
  const breakdown = [];

  for (const key of included) {
    const item = MARKET_PRICES[key];
    if (!item) continue;
    breakdown.push({ key, label: item.label, market_low: item.low, market_high: item.high });
    marketLow += item.low;
    marketHigh += item.high;
  }

  // Available to activate (not in current plan)
  const available = Object.entries(MARKET_PRICES)
    .filter(([k]) => !included.includes(k))
    .map(([k, v]) => ({ key: k, label: v.label, market_range: `$${v.low}-${v.high}${v.unit}` }));

  return {
    plan_code: planCode,
    plan_price: planPrice,
    market_low: marketLow,
    market_high: marketHigh,
    savings_low: marketLow - planPrice,
    savings_high: marketHigh - planPrice,
    savings_pct: Math.round(((marketHigh - planPrice) / marketHigh) * 100),
    included: breakdown,
    available_to_activate: available,
    value_message: `You're saving $${marketLow - planPrice}–$${marketHigh - planPrice}/yr compared to buying these services separately.`
  };
}

// ═══════════════════════════════════════════════════════════
// ENTITY HEALTH — 7-component score with trend and drivers
// ═══════════════════════════════════════════════════════════

export function computeEntityHealth(org, obligations, documents, notifications, client) {
  const components = {};
  const now = new Date();
  const drivers = [];
  const fixes = [];

  // 1. Filing readiness (are obligations on track?)
  const activeObls = (obligations || []).filter(o => !['closed', 'filed_confirmed'].includes(o.obligation_status));
  const overdue = activeObls.filter(o => new Date(o.due_date) < now);
  if (overdue.length > 0) { components.filing_readiness = 0; drivers.push('Overdue filings detected'); fixes.push({ impact: 'critical', action: 'File overdue annual reports immediately at file.dos.pa.gov' }); }
  else if (activeObls.some(o => { const d = Math.ceil((new Date(o.due_date) - now) / 86400000); return d < 30; })) { components.filing_readiness = 50; drivers.push('Filing deadline within 30 days'); fixes.push({ impact: 'high', action: 'File your annual report before the deadline' }); }
  else if (activeObls.length > 0) { components.filing_readiness = 90; }
  else { components.filing_readiness = 100; }

  // 2. Document responsiveness (are critical docs acknowledged?)
  const criticalDocs = (documents || []).filter(d => d.urgency === 'critical' && d.review_status === 'pending');
  if (criticalDocs.length > 0) { components.document_responsiveness = 20; drivers.push(`${criticalDocs.length} critical document(s) need attention`); fixes.push({ impact: 'critical', action: 'Review critical documents in your Document Center' }); }
  else { components.document_responsiveness = 100; }

  // 3. Entity verification (is entity confirmed active?)
  if (org?.entity_status === 'active') { components.entity_verification = 100; }
  else if (org?.entity_status === 'pending_verification') { components.entity_verification = 50; drivers.push('Entity status not yet verified with PA DOS'); fixes.push({ impact: 'medium', action: 'Verify your entity at file.dos.pa.gov' }); }
  else { components.entity_verification = 0; drivers.push('Entity status unknown or inactive'); fixes.push({ impact: 'critical', action: 'Check your entity status with PA DOS immediately' }); }

  // 4. Billing continuity
  const billingOk = client?.billing_status === 'active' || client?.billing_status === 'trial';
  components.billing_continuity = billingOk ? 100 : 0;
  if (!billingOk) { drivers.push('Billing issue detected'); fixes.push({ impact: 'high', action: 'Update your payment method to maintain service' }); }

  // 5. Contact data accuracy
  const hasEmail = !!client?.email;
  const hasPhone = !!client?.phone;
  const hasName = !!client?.owner_name;
  components.contact_accuracy = [hasEmail, hasPhone, hasName].filter(Boolean).length / 3 * 100;
  if (components.contact_accuracy < 100) { drivers.push('Contact information incomplete'); fixes.push({ impact: 'low', action: 'Update your contact details in Settings' }); }

  // 6. Multi-entity exposure
  if (!org) { components.multi_entity_exposure = 100; }
  else { components.multi_entity_exposure = 100; } // Would check for unmanaged entities

  // 7. Jurisdiction complexity
  components.jurisdiction_complexity = 100; // PA-only for now

  // Overall score (weighted)
  const weights = { filing_readiness: 30, document_responsiveness: 20, entity_verification: 20, billing_continuity: 15, contact_accuracy: 10, multi_entity_exposure: 3, jurisdiction_complexity: 2 };
  let weighted = 0, totalWeight = 0;
  for (const [k, w] of Object.entries(weights)) {
    weighted += (components[k] || 0) * w;
    totalWeight += w;
  }
  const overall = Math.round(weighted / totalWeight);

  // Grade
  const grade = overall >= 90 ? 'A' : overall >= 75 ? 'B' : overall >= 60 ? 'C' : overall >= 40 ? 'D' : 'F';

  return {
    overall,
    grade,
    components,
    risk_level: overall >= 80 ? 'low' : overall >= 60 ? 'medium' : overall >= 40 ? 'high' : 'critical',
    drivers: drivers.slice(0, 5),
    recommended_fixes: fixes.sort((a, b) => { const p = { critical: 0, high: 1, medium: 2, low: 3 }; return (p[a.impact] || 4) - (p[b.impact] || 4); }).slice(0, 5)
  };
}

// ═══════════════════════════════════════════════════════════
// MAIN PORTAL DATA ENDPOINT — aggregates everything
// ═══════════════════════════════════════════════════════════

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = await authenticateRequest(req);
  const action = req.query.action || 'dashboard';

  // Savings calculator (public)
  if (action === 'savings') {
    const plan = req.query.plan || session?.plan || 'compliance_only';
    return res.status(200).json({ success: true, ...computeSavings(plan) });
  }

  // Require auth for everything else
  if (!session?.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  const orgId = req.query.org || session.orgId;

  try {
    if (action === 'health' && orgId) {
      const org = await db.getOrganization(orgId);
      const obligations = await db.getObligationsForOrg(orgId);
      const documents = await db.getDocumentsForOrg(orgId);
      const notifications = await db.getNotificationsForOrg(orgId);
      const client = await db.getClient_ById(session.clientId);
      const health = computeEntityHealth(org, obligations, documents, notifications, client);
      return res.status(200).json({ success: true, health });
    }

    if (action === 'activity' && orgId) {
      const events = await db.getAuditEvents({ targetId: orgId, limit: 20 });
      const notifications = await db.getNotificationsForOrg(orgId);
      const activities = [];

      // Convert audit events to activity items
      for (const e of (events || [])) {
        const labels = {
          'obligation.status_changed': '📋 Obligation status updated',
          'obligation.created': '📋 New obligation tracked',
          'entity.updated': '🏢 Entity information updated',
          'entity.verified': '✅ Entity verified',
          'document.received': '📄 Document received',
          'document.escalated': '🚨 Document escalated',
          'client.login': '🔑 Portal accessed',
          'billing.cancellation_requested': '⚠️ Cancellation requested',
          'ai.answer_escalated': '🤖 AI answer escalated to support'
        };
        activities.push({
          type: 'event',
          icon: labels[e.event_type]?.split(' ')[0] || '📌',
          text: labels[e.event_type]?.slice(2) || e.event_type.replace(/\./g, ' '),
          detail: e.reason,
          timestamp: e.created_at
        });
      }

      // Add recent notifications
      for (const n of (notifications || []).filter(n => n.sent_at).slice(0, 10)) {
        activities.push({
          type: 'notification',
          icon: '✉️',
          text: `Reminder sent: ${(n.template_id || '').replace(/_/g, ' ')}`,
          detail: `${n.channel} — ${n.delivery_status}`,
          timestamp: n.sent_at
        });
      }

      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return res.status(200).json({ success: true, activities: activities.slice(0, 30) });
    }

    if (action === 'filing-readiness' && orgId) {
      const org = await db.getOrganization(orgId);
      const obligations = await db.getObligationsForOrg(orgId);
      const documents = await db.getDocumentsForOrg(orgId);

      const filings = (obligations || []).map(obl => {
        const checks = {
          entity_name: !!org?.legal_name,
          entity_type: !!org?.entity_type,
          dos_number: !!org?.dos_number,
          registered_office: true, // Always true — we are the registered office
          filing_fee: true, // $7, always known
          entity_verified: org?.entity_status === 'active'
        };
        const ready = Object.values(checks).filter(Boolean).length;
        const total = Object.keys(checks).length;
        const confidence = Math.round((ready / total) * 100);

        return {
          obligation_id: obl.id,
          type: obl.obligation_type,
          due_date: obl.due_date,
          status: obl.obligation_status,
          filing_method: obl.filing_method || getFilingMethod(session.plan),
          fee: obl.fee_usd,
          checklist: checks,
          ready_count: ready,
          total_checks: total,
          confidence,
          confidence_label: confidence >= 100 ? 'Ready to file' : confidence >= 80 ? 'Almost ready' : confidence >= 50 ? 'Missing information' : 'Not ready',
          missing: Object.entries(checks).filter(([, v]) => !v).map(([k]) => k.replace(/_/g, ' ')),
          supporting_docs: (documents || []).filter(d => d.obligation_id === obl.id),
          filing_url: 'https://file.dos.pa.gov',
          form: 'DSCB:15-146'
        };
      });

      return res.status(200).json({ success: true, filings });
    }

    if (action === 'business-stack') {
      const plan = session.plan || 'compliance_only';
      const entitlements = getPlanEntitlements(plan);
      const savings = computeSavings(plan);

      const services = [
        { key: 'registered_office', label: 'Registered Office Address', status: 'active', detail: '924 W 23rd St, Erie, PA 16502' },
        { key: 'compliance_monitoring', label: 'Deadline Monitoring & Alerts', status: 'active', detail: '5 reminders per deadline' },
        { key: 'document_handling', label: 'Document Scanning & Classification', status: 'active', detail: 'AI-powered, same-day processing' },
        { key: 'ai_assistant', label: 'AI Compliance Assistant', status: 'active', detail: 'Source-backed answers 24/7' },
        { key: 'dashboard', label: 'Compliance Dashboard', status: 'active', detail: 'Real-time entity monitoring' },
        { key: 'hosting', label: 'Website Hosting + SSL', status: entitlements.hosting ? 'active' : 'available', detail: entitlements.hosting ? 'Included in your plan' : 'Available on Starter+' },
        { key: 'email', label: 'Business Email', status: entitlements.hosting ? 'active' : 'available', detail: entitlements.hosting ? 'Up to 99 mailboxes' : 'Available on Starter+' },
        { key: 'filing', label: 'Managed Annual Report Filing', status: entitlements.annual_report_filing ? 'active' : 'available', detail: entitlements.annual_report_filing ? 'We file for you' : 'Available on Pro+' },
        { key: 'sms', label: 'SMS Deadline Alerts', status: entitlements.sms_notifications ? 'active' : 'available', detail: entitlements.sms_notifications ? 'Critical alerts via text' : 'Available on Pro+' },
        { key: 'multi_entity', label: 'Multi-Entity Management', status: entitlements.multi_entity_limit > 1 ? 'active' : 'available', detail: entitlements.multi_entity_limit > 1 ? `Up to ${entitlements.multi_entity_limit} entities` : 'Available on Pro+' }
      ];

      return res.status(200).json({
        success: true,
        plan_code: plan,
        services,
        active_count: services.filter(s => s.status === 'active').length,
        available_count: services.filter(s => s.status === 'available').length,
        savings
      });
    }

    return res.status(400).json({ success: false, error: 'unknown_action', valid_actions: ['savings', 'health', 'activity', 'filing-readiness', 'business-stack'] });
  } catch (err) {
    console.error('Portal value API error:', err.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
