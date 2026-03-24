// PA CROP Services — Compliance Rules Engine
// Single source of truth: reads from data/compliance-rules.json
// All deadline, fee, penalty, and entity-type logic reads from here.
//
// Usage:
//   import { getRules, getEntityDeadline, computeDaysUntil, getDeadlineGroup } from './_compliance.js';

import rules from '../data/compliance-rules.json' assert { type: 'json' };

/**
 * Get the full rules object.
 */
export function getRules() {
  return rules;
}

/**
 * Resolve a SuiteDash/freeform entity type string to a canonical entity type key.
 * Handles: "LLC", "Domestic LLC", "Corporation", "LP", "C-Corp", "S-Corp", "Nonprofit", etc.
 */
export function resolveEntityType(raw) {
  const t = (raw || '').toLowerCase().trim();

  // Direct match
  if (rules.entityTypes[t]) return t;

  // Fuzzy match
  if (t.includes('nonprofit') || t.includes('non-profit')) {
    return t.includes('foreign') ? 'foreign_nonprofit_corp' : 'domestic_nonprofit_corp';
  }
  if (t.includes('corp') || t === 'c-corp' || t === 's-corp' || t === 'corporation') {
    return t.includes('foreign') ? 'foreign_business_corp' : 'domestic_business_corp';
  }
  if (t.includes('llc') || t.includes('limited liability company')) {
    return t.includes('foreign') ? 'foreign_llc' : 'domestic_llc';
  }
  if (t.includes('llp') || t.includes('limited liability partnership')) {
    return t.includes('foreign') ? 'foreign_llp' : 'domestic_llp';
  }
  if (t.includes('lp') || t.includes('limited partnership')) {
    return t.includes('foreign') ? 'foreign_lp' : 'domestic_lp';
  }
  if (t.includes('trust')) return 'business_trust';
  if (t.includes('professional association')) return 'professional_association';

  // Default: domestic LLC (most common PA CROP client)
  return 'domestic_llc';
}

/**
 * Get entity type config from rules.
 * @param {string} entityType - raw entity type string (e.g., "LLC", "Corporation", "domestic_llc")
 * @returns {{ label, shortLabel, deadline, fee, category, dissolutionTerm, canReinstate }}
 */
export function getEntityConfig(entityType) {
  const key = resolveEntityType(entityType);
  return { key, ...rules.entityTypes[key] };
}

/**
 * Get deadline info for an entity type.
 * @param {string} entityType - raw entity type string
 * @returns {{ date: string, label: string, shortLabel: string, month: number, day: number, category: string }}
 */
export function getEntityDeadline(entityType) {
  const config = getEntityConfig(entityType);
  const group = rules.deadlineGroups[config.category];
  const year = new Date().getFullYear();
  return {
    date: `${year}-${group.deadline}`,
    label: group.label,
    shortLabel: group.shortLabel,
    month: group.month,
    day: group.day,
    category: config.category,
    fee: config.fee
  };
}

/**
 * Compute days until a deadline.
 * If the deadline has passed this year, returns days until next year's deadline.
 * @param {string} entityType - raw entity type string
 * @returns {number} days until deadline
 */
export function computeDaysUntil(entityType) {
  const dl = getEntityDeadline(entityType);
  const now = new Date();
  const deadline = new Date(now.getFullYear(), dl.month, dl.day);
  if (deadline < now) deadline.setFullYear(deadline.getFullYear() + 1);
  return Math.ceil((deadline - now) / 86400000);
}

/**
 * Get the deadline group name for an entity type.
 * @param {string} entityType - raw entity type string
 * @returns {'corporations' | 'llcs' | 'others'}
 */
export function getDeadlineGroup(entityType) {
  return getEntityConfig(entityType).category;
}

/**
 * Build a chatbot knowledge block from the rules.
 * Used by api/chat.js to inject accurate compliance facts.
 */
export function buildChatbotKnowledge() {
  const r = rules;
  const groups = r.deadlineGroups;
  return `COMPLIANCE FACTS (from verified PA DOS rules — Act 122 of 2022):
- PA annual report requirement started January 1, 2025
- Filing: online at ${r.annualReport.filingUrl} (form ${r.annualReport.form})
- Deadlines by entity type:
  * Corporations (business + nonprofit, domestic + foreign): ${groups.corporations.label}
  * LLCs (domestic + foreign): ${groups.llcs.label}
  * All others (LPs, LLPs, business trusts, professional associations): ${groups.others.label}
- Fee: $7 for most for-profit entities, $0 for nonprofits
- 2025-2026: Grace period. No dissolution for missed reports.
- Starting with 2027 reports: dissolution/termination/cancellation ${r.enforcement.dissolutionDelayMonths} months after entity-type due date
  * Corps miss ${groups.corporations.label} → enforcement ~January 2028
  * LLCs miss ${groups.llcs.label} → enforcement ~April 2028
  * Others miss ${groups.others.label} → enforcement ~July 2028
- Domestic entities can reinstate (fee: $${r.enforcement.domesticReinstatementFeeOnline} online + $${r.enforcement.delinquentReportFee}/missed report)
- Foreign entities CANNOT reinstate — must re-register as new foreign entity
- During dissolution: name protection lost, entity cannot conduct business, contracts may be unenforceable
- Change registered office: form ${r.registeredOffice.changeForm}, fee $${r.registeredOffice.changeFee}
- Registered office must be physical PA address (no PO boxes), available during business hours`;
}

/**
 * Build a summary string for use in email templates, admin UI, etc.
 */
export function buildDeadlineSummary() {
  const g = rules.deadlineGroups;
  return `Corps ${g.corporations.shortLabel} · LLCs ${g.llcs.shortLabel} · Others ${g.others.shortLabel}`;
}
