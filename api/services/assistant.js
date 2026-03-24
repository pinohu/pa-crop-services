// PA CROP Services — Assistant Service
// Tech spec: section 8 (AI architecture)
// 5-step pipeline: classify → retrieve → policy check → generate → log

import * as db from './db.js';

// ── Step 1: Intent Classification (8.2) ────────────────────

const INTENT_PATTERNS = {
  deadline_question: [/when\s+is|due\s+date|deadline|annual\s+report\s+due|file\s+by/i],
  document_question: [/document|upload|mail|letter|notice|service\s+of\s+process/i],
  plan_question: [/plan|pricing|upgrade|cost|how\s+much|includes?/i],
  filing_status: [/file[d]|status|confirm|submitted|track/i],
  legal_advice: [/lawyer|attorney|legal\s+advice|sue|liable|should\s+i\s+(file|sue|report)/i],
  escalation: [/speak\s+to|human|agent|help\s+me|urgent|emergency|are\s+you\s+sure/i]
};

export function classifyIntent(message) {
  const msg = (message || '').toLowerCase();
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (patterns.some(p => p.test(msg))) return intent;
  }
  return 'general_question';
}

// ── Step 2: Retrieval (8.2) ────────────────────────────────

export async function retrieve(intent, orgId, question) {
  const sources = [];

  // Always pull active rules
  const rules = await db.getAllActiveRules('PA');
  if (rules.length) {
    sources.push({ type: 'rules', data: rules.map(r => ({
      id: r.id, entity_type: r.entity_type, version: r.version,
      rule: r.rule_json
    }))});
  }

  // Pull org context if available
  if (orgId) {
    const org = await db.getOrganization(orgId);
    if (org) {
      sources.push({ type: 'organization_context', data: org });
      const obls = await db.getObligationsForOrg(orgId);
      if (obls.length) sources.push({ type: 'obligations', data: obls });
    }
  }

  return sources;
}

// ── Step 3: Policy Check (8.2) ─────────────────────────────

export function policyCheck(intent) {
  if (intent === 'legal_advice') {
    return {
      action: 'defer',
      message: 'I can help explain compliance requirements, but I\'m not able to provide legal advice. For legal questions, I\'d recommend consulting with a Pennsylvania attorney. Would you like me to explain the compliance rules that apply to your entity type?'
    };
  }
  if (intent === 'escalation') {
    return {
      action: 'escalate',
      message: 'I\'ll connect you with our team. You can reach us at 814-228-2822 or reply to this message and we\'ll follow up by email.'
    };
  }
  return { action: 'answer' };
}

// ── Step 4: Response Generation (8.2) ──────────────────────

export async function generateAnswer(question, intent, sources, orgContext) {
  // Try deterministic answer first (compliance facts)
  const deterministic = tryDeterministicAnswer(question, sources, orgContext);
  if (deterministic) return deterministic;

  // Fall back to LLM with guardrails
  return generateLLMAnswer(question, intent, sources, orgContext);
}

function tryDeterministicAnswer(question, sources, orgContext) {
  const q = (question || '').toLowerCase();
  const rules = sources.find(s => s.type === 'rules')?.data || [];
  const org = sources.find(s => s.type === 'organization_context')?.data;

  // Entity-specific deadline
  if (q.match(/when|due|deadline/) && org) {
    const rule = rules.find(r => r.entity_type === org.entity_type);
    if (rule) {
      const rj = rule.rule;
      const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const deadline = `${monthNames[rj.due_date_rule.month]} ${rj.due_date_rule.day}`;
      return {
        answer: `For your Pennsylvania ${org.entity_type.replace(/_/g, ' ')}, the annual report is due on ${deadline}. The filing fee is $${rj.fee.amount_usd}. File online at ${rj.filing.url} using form ${rj.filing.form}.`,
        sources: [{ type: 'rule', id: rule.id, label: `PA ${org.entity_type} annual report rule v${rule.version}` }],
        confidence: 1.0,
        escalate: false,
        next_actions: [{ type: 'open_obligation', label: 'View my annual report obligation' }]
      };
    }
  }

  // General fee question
  if (q.match(/fee|cost|how much/) && q.match(/annual|report|file/)) {
    return {
      answer: 'The Pennsylvania annual report filing fee is $7 for most entity types. Nonprofit corporations and LLCs/LPs with a not-for-profit purpose are exempt from the fee. File online at file.dos.pa.gov.',
      sources: [{ type: 'rule', id: 'all', label: 'PA annual report rules' }],
      confidence: 0.95,
      escalate: false,
      next_actions: []
    };
  }

  // Dissolution question
  if (q.match(/dissolv|terminat|cancel|what\s+happens|miss|fail/)) {
    return {
      answer: 'Starting with the 2027 reporting year, failure to file the annual report will result in administrative action approximately 6 months after the entity-type deadline. For domestic entities, this means dissolution — but you can reinstate. For foreign entities, this means termination of authority to do business in PA, and you cannot reinstate — you would need to re-register as a new foreign entity.',
      sources: [{ type: 'rule', id: 'enforcement', label: 'PA enforcement rules' }],
      confidence: 0.95,
      escalate: false,
      next_actions: [{ type: 'explain_obligation', label: 'What does this mean for my entity?' }]
    };
  }

  return null; // Fall through to LLM
}

async function generateLLMAnswer(question, intent, sources, orgContext) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return {
      answer: 'I\'m temporarily unable to process complex questions. For compliance facts, I can tell you about deadlines, fees, and filing requirements. What would you like to know?',
      sources: [],
      confidence: 0.0,
      escalate: false,
      next_actions: []
    };
  }

  const orgSummary = orgContext ? `\nClient org: ${orgContext.legal_name} (${orgContext.entity_type}, ${orgContext.jurisdiction})` : '';
  const rulesSummary = sources.find(s => s.type === 'rules')?.data?.map(r =>
    `${r.entity_type}: due ${r.rule.due_date_rule.month}/${r.rule.due_date_rule.day}, fee $${r.rule.fee.amount_usd}`
  ).join('\n') || '';

  const systemPrompt = `You are the PA CROP Services compliance assistant. Answer ONLY from the provided rules and context.

RULES:
${rulesSummary}
${orgSummary}

REQUIREMENTS:
- Cite the specific rule for every compliance claim
- Say "I'm not sure" if you don't have the information
- Never provide legal or tax advice
- If the question is about a specific entity type you don't have context for, ask which entity type
- Keep answers concise and actionable`;

  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content || 'I wasn\'t able to process that question. Please try rephrasing.';

    return {
      answer,
      sources: sources.filter(s => s.type === 'rules').map(s => ({ type: 'rule', id: 'rules-db', label: 'PA compliance rules' })),
      confidence: 0.75,
      escalate: false,
      next_actions: []
    };
  } catch (err) {
    return {
      answer: 'I encountered an error processing your question. Please try again or contact us at 814-228-2822.',
      sources: [],
      confidence: 0.0,
      escalate: true,
      next_actions: [{ type: 'escalate', label: 'Contact support' }]
    };
  }
}

// ── Step 5: Log (8.2) ──────────────────────────────────────

export async function logAnswer(orgId, clientId, channel, question, answer) {
  return db.logAIConversation({
    organization_id: orgId || null,
    client_id: clientId || null,
    channel: channel || 'public',
    user_message: question,
    assistant_answer: answer.answer,
    source_refs: answer.sources || [],
    confidence_score: answer.confidence,
    escalation_flag: answer.escalate || false,
    model_name: answer.confidence === 1.0 ? 'deterministic' : 'llama-3.3-70b'
  });
}

// ── Full Pipeline ──────────────────────────────────────────

export async function query(question, clientId, orgId, channel) {
  const intent = classifyIntent(question);

  // Policy check first
  const policy = policyCheck(intent);
  if (policy.action === 'defer' || policy.action === 'escalate') {
    const result = {
      answer: policy.message,
      sources: [],
      confidence: 1.0,
      escalate: policy.action === 'escalate',
      next_actions: policy.action === 'escalate' ? [{ type: 'contact', label: 'Call 814-228-2822' }] : []
    };
    await logAnswer(orgId, clientId, channel, question, result);
    return result;
  }

  // Retrieve context
  const sources = await retrieve(intent, orgId, question);
  const orgContext = sources.find(s => s.type === 'organization_context')?.data;

  // Generate answer
  const answer = await generateAnswer(question, intent, sources, orgContext);

  // Log
  await logAnswer(orgId, clientId, channel, question, answer);

  return answer;
}
