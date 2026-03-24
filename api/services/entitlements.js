// PA CROP Services — Entitlement Service
// Tech spec: section 11 (Entitlement model)
// Enforces plan-based feature access at the API layer.

const PLANS = {
  compliance_only: {
    registered_office: true,
    dashboard: true,
    ai_assistant: true,
    hosting: false,
    annual_report_filing: false,
    multi_entity_limit: 1,
    document_storage_mb: 50,
    sms_notifications: false
  },
  business_starter: {
    registered_office: true,
    dashboard: true,
    ai_assistant: true,
    hosting: true,
    annual_report_filing: false,
    multi_entity_limit: 1,
    document_storage_mb: 200,
    sms_notifications: false
  },
  business_pro: {
    registered_office: true,
    dashboard: true,
    ai_assistant: true,
    hosting: true,
    annual_report_filing: true,
    multi_entity_limit: 3,
    document_storage_mb: 1000,
    sms_notifications: true
  },
  business_empire: {
    registered_office: true,
    dashboard: true,
    ai_assistant: true,
    hosting: true,
    annual_report_filing: true,
    multi_entity_limit: 10,
    document_storage_mb: 5000,
    sms_notifications: true
  }
};

export function getPlanEntitlements(planCode) {
  return PLANS[planCode] || PLANS.compliance_only;
}

export function checkEntitlement(planCode, feature) {
  const plan = getPlanEntitlements(planCode);
  return !!plan[feature];
}

export function getMultiEntityLimit(planCode) {
  return getPlanEntitlements(planCode).multi_entity_limit;
}

export function canFile(planCode) {
  return getPlanEntitlements(planCode).annual_report_filing;
}

export function getFilingMethod(planCode) {
  if (getPlanEntitlements(planCode).annual_report_filing) return 'managed';
  return 'self';
}

export function getAllPlans() {
  return Object.entries(PLANS).map(([code, entitlements]) => ({ code, ...entitlements }));
}

export function requireEntitlement(planCode, feature) {
  if (!checkEntitlement(planCode, feature)) {
    return { allowed: false, upgrade_required: true, feature, current_plan: planCode };
  }
  return { allowed: true };
}
