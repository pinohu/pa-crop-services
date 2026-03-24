// PA CROP Services — Chatbot Guardrails
// Intent classification, legal boundary enforcement, citation requirement.
//
// Usage:
//   import { classifyIntent, buildGuardedPrompt, shouldRefuse } from './_guardrails.js';
//   const intent = classifyIntent(userMessage);
//   if (shouldRefuse(intent)) return refusalResponse(intent);
//   const prompt = buildGuardedPrompt(userMessage, intent, clientContext);

import { getEntityConfig, getEntityDeadline, computeDaysUntil, getRules } from './_compliance.js';

// ── Intent Classification ──
// Rules-based first (fast, deterministic). ML/embedding classifier can be added later.

const INTENT_PATTERNS = {
  // COMPLIANCE_FACT: Questions about deadlines, fees, requirements — deterministic answers
  COMPLIANCE_FACT: [
    /when\s+(?:is|are)\s+(?:my|the|our)\s+(?:annual\s+report|report|filing|deadline)/i,
    /(?:what|when)\s+(?:is|are)\s+the\s+deadline/i,
    /how much\s+(?:does|is)\s+(?:the|it|annual)\s+(?:report|filing|fee)/i,
    /(?:what|how much)\s+(?:is|are)\s+the\s+fee/i,
    /(?:what|which)\s+entity\s+types?\s+(?:need|must|have)\s+to\s+file/i,
    /(?:do|does|will)\s+(?:I|we|my)\s+(?:need|have)\s+to\s+file/i,
    /what\s+happens\s+if\s+(?:I|we)\s+(?:miss|don'?t\s+file|fail)/i,
    /(?:can|how)\s+(?:I|we)\s+(?:reinstate|file|register)/i,
    /(?:what|where)\s+(?:is|do)\s+(?:I|we)\s+file/i,
    /(?:dissolution|termination|penalty|penalties|enforcement)/i,
    /(?:grace\s+period|2027)/i,
    /(?:crop|registered\s+office|registered\s+agent)/i,
    /(?:change|update)\s+(?:my|our|the)\s+(?:registered|address)/i,
  ],

  // LEGAL_QUESTION: Anything that smells like legal advice — always refuse
  LEGAL_QUESTION: [
    /(?:should|can)\s+(?:I|we)\s+(?:sue|file\s+a\s+lawsuit|take\s+legal\s+action)/i,
    /(?:is\s+it|am\s+I)\s+(?:legal|liable|responsible|at\s+fault)/i,
    /(?:what|how)\s+(?:are|is)\s+(?:my|our)\s+(?:legal\s+rights|legal\s+options)/i,
    /(?:legal\s+advice|attorney|lawyer|counsel)\s+(?:about|for|regarding)/i,
    /(?:will|can)\s+(?:I|we|they)\s+be\s+(?:sued|liable|held\s+responsible)/i,
    /(?:interpret|meaning\s+of)\s+(?:the|this)\s+(?:law|statute|code|regulation)/i,
    /(?:contract|agreement|liability|indemnif)/i,
    /(?:tax\s+advice|tax\s+strategy|tax\s+implication|deduct)/i,
  ],

  // ACTION_REQUEST: User wants to do something in the portal
  ACTION_REQUEST: [
    /(?:how\s+do\s+I|can\s+I|help\s+me)\s+(?:upload|change|update|file|upgrade|cancel)/i,
    /(?:show|pull\s+up|check)\s+(?:my|our)\s+(?:status|entities|documents|plan)/i,
    /(?:upgrade|downgrade|change)\s+(?:my|our)\s+(?:plan|subscription)/i,
    /(?:refer|referral|share)\s+(?:a\s+friend|someone|my\s+code)/i,
  ],

  // BILLING_QUESTION: About plans, pricing, payments
  BILLING_QUESTION: [
    /(?:how\s+much|what)\s+(?:does|is)\s+(?:the|your|a)\s+(?:plan|service|crop|subscription)/i,
    /(?:pricing|price|cost)\s+(?:of|for)/i,
    /(?:difference|compare)\s+(?:between|of)\s+(?:plans|tiers)/i,
    /(?:cancel|refund|billing|invoice|payment|receipt)/i,
    /(?:what|which)\s+plan\s+(?:do\s+I|should\s+I|is\s+best)/i,
  ],

  // ONBOARDING_HELP: New client questions
  ONBOARDING_HELP: [
    /(?:how\s+do\s+I|help\s+me)\s+(?:get\s+started|set\s+up|begin)/i,
    /(?:what|where)\s+(?:is|do)\s+(?:I|we)\s+(?:start|begin|first)/i,
    /(?:access\s+code|login|portal\s+access)/i,
    /(?:onboarding|setup|getting\s+started)/i,
  ],
};

/**
 * Classify the intent of a user message.
 * Returns the most likely intent, or 'GENERAL_QUESTION' as fallback.
 * @param {string} message
 * @returns {'COMPLIANCE_FACT'|'LEGAL_QUESTION'|'ACTION_REQUEST'|'BILLING_QUESTION'|'ONBOARDING_HELP'|'GENERAL_QUESTION'}
 */
export function classifyIntent(message) {
  if (!message || typeof message !== 'string') return 'GENERAL_QUESTION';

  const normalized = message.trim();

  // Check each intent category
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalized)) {
        return intent;
      }
    }
  }

  return 'GENERAL_QUESTION';
}

/**
 * Should the chatbot refuse to answer this intent?
 * @param {string} intent
 * @returns {boolean}
 */
export function shouldRefuse(intent) {
  return intent === 'LEGAL_QUESTION';
}

/**
 * Build a deterministic answer for COMPLIANCE_FACT intents.
 * Returns null if the question can't be answered deterministically.
 * @param {string} message
 * @param {object} [clientContext] - { entityType, plan, entityName, daysUntilDeadline }
 */
export function tryDeterministicAnswer(message, clientContext = {}) {
  const rules = getRules();
  const entityType = clientContext.entityType || 'LLC';
  const config = getEntityConfig(entityType);
  const deadline = getEntityDeadline(entityType);
  const days = clientContext.daysUntilDeadline || computeDaysUntil(entityType);
  const entityName = clientContext.entityName || 'your entity';
  const plan = clientContext.plan || '';
  const includesFiling = ['business_pro', 'business_empire'].includes(plan);
  const msg = message.toLowerCase();

  // Deadline questions
  if (/when.*deadline|when.*due|when.*file/i.test(msg)) {
    let answer = `Your ${config.shortLabel} annual report is due ${deadline.label} — that's ${days} days from now.`;
    answer += ` The filing fee is $${config.fee}.`;
    if (includesFiling) {
      answer += ` Since you're on ${clientContext.planLabel || 'a managed plan'}, we'll file it for you. Just make sure your entity details in the portal are current.`;
    } else {
      answer += ` You can file online at file.dos.pa.gov with your PA DOS entity number.`;
    }
    return {
      answer,
      sources: [`compliance-rules.json#entityTypes.${config.key}`, `compliance-rules.json#deadlineGroups.${config.category}`],
      confidence: 1.0
    };
  }

  // Fee questions
  if (/how much|fee|cost.*report|cost.*file/i.test(msg)) {
    return {
      answer: `The PA annual report filing fee is $${config.fee} for ${config.label}s. Nonprofits pay $0. You pay online at file.dos.pa.gov by credit card.`,
      sources: [`compliance-rules.json#entityTypes.${config.key}`],
      confidence: 1.0
    };
  }

  // Dissolution / what happens if I miss
  if (/what happens|miss|don'?t file|dissolution|termination|penalty/i.test(msg)) {
    const enforcement = rules.enforcement;
    let answer = `If you miss your filing deadline, here's the timeline:\n\n`;
    answer += `2025–2026: Grace period — no dissolution actions for missed reports.\n`;
    answer += `Starting with 2027 reports: ${enforcement.description}\n\n`;
    if (config.canReinstate) {
      answer += `As a domestic entity, ${entityName} can reinstate after dissolution ($${enforcement.domesticReinstatementFeeOnline} fee + $${enforcement.delinquentReportFee} per missed report). But you'd lose name protection during dissolution and couldn't legally conduct business.`;
    } else {
      answer += `As a foreign entity, ${entityName} **cannot reinstate** after termination. You'd have to re-register as a new foreign entity, potentially under a different name if yours was taken. This is the worst-case scenario.`;
    }
    return {
      answer,
      sources: ['compliance-rules.json#enforcement'],
      confidence: 1.0
    };
  }

  // CROP / registered office questions
  if (/crop|registered office|registered agent|change.*address/i.test(msg)) {
    const ro = rules.registeredOffice;
    return {
      answer: `Every PA entity must maintain a registered office under ${ro.requirement}. A CROP (Commercial Registered Office Provider) is licensed under ${ro.cropLicense} to serve as your registered office. To change your registered office, file form ${ro.changeForm} — the fee is $${ro.changeFee}. Your registered office must be a physical PA address available during business hours.`,
      sources: ['compliance-rules.json#registeredOffice'],
      confidence: 1.0
    };
  }

  return null; // Can't answer deterministically — fall through to LLM
}

/**
 * Build the refusal response for LEGAL_QUESTION intent.
 */
export function buildRefusalResponse() {
  return {
    answer: "That's a question for your attorney or CPA — I'm not qualified to give legal or tax advice. Would you like me to connect you with one of our partner attorneys who specializes in Pennsylvania business compliance? They offer free 15-minute consultations for PA CROP Services clients.",
    sources: [],
    confidence: 1.0,
    intent: 'LEGAL_QUESTION',
    escalated: false
  };
}

/**
 * Build guardrail instructions to inject into the LLM system prompt.
 * These constrain the model's behavior when deterministic answers aren't possible.
 */
export function buildGuardrailInstructions() {
  return `
GUARDRAILS — YOU MUST FOLLOW THESE:
1. CITATION: Every factual claim about PA compliance must reference its source. Use [Rules: section] format.
   Example: "Your LLC deadline is September 30 [Rules: entityTypes.domestic_llc]"
2. UNCERTAINTY: If you are not confident about a compliance fact, say: "I'm not certain about that specific detail. I'd recommend confirming directly with the PA DOS at 717-787-1057 or checking file.dos.pa.gov."
3. LEGAL BOUNDARY: Never give legal advice. If the question involves "should I", "is it legal", "can I sue", "am I liable", "tax strategy", or "contract interpretation", say: "That's a question for your attorney or CPA" and offer to connect them with a partner.
4. NO INVENTION: Never invent compliance facts. If the knowledge base doesn't cover it, say so honestly.
5. DEFERENCE: When in doubt, defer to official sources. PA DOS: 717-787-1057. Filing: file.dos.pa.gov.`;
}
