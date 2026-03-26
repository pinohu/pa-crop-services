// PA CROP Services — AI Compliance Chatbot (Streaming)
// POST /api/chat { message, clientContext?, stream? }
// Returns streaming text/event-stream when stream=true

export const config = { runtime: 'edge' };

import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { buildChatbotKnowledge, getEntityDeadline, computeDaysUntil } from './_compliance.js';
import { classifyIntent, shouldRefuse, tryDeterministicAnswer, buildRefusalResponse, buildGuardrailInstructions } from './_guardrails.js';
import { logConversation } from './_log.js';
import { fetchWithTimeout, isCircuitOpen, recordFailure, recordSuccess } from './_fetch.js';
import { isValidString, sanitize } from './_validate.js';
const ALLOWED_ORIGINS = ['https://pacropservices.com', 'https://www.pacropservices.com'];

function corsOrigin(req) {
  const origin = req.headers.get('origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': corsOrigin(req), 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });

  // Rate limit: AI chatbot — 15/min (Upstash Redis with in-memory fallback)
  const rlResult = await checkRateLimit(getClientIp(req), 'chat', 15, '60s');
  if (rlResult) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(rlResult.retryAfter),
        'Access-Control-Allow-Origin': corsOrigin(req)
      }
    });
  }

  let body;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }
  const { message, clientContext, clientTier, entityName, history = [], stream } = body;
  if (!message) return new Response(JSON.stringify({ error: 'message required' }), { status: 400 });
  if (!isValidString(message, { minLength: 1, maxLength: 2000 })) {
    return new Response(JSON.stringify({ error: 'message must be between 1 and 2000 characters' }), { status: 400 });
  }
  if (!Array.isArray(history) || history.length > 10) {
    return new Response(JSON.stringify({ error: 'history must be an array of at most 10 items' }), { status: 400 });
  }
  const ALLOWED_ROLES = ['user', 'assistant'];
  for (const entry of history) {
    if (!entry || typeof entry.role !== 'string' || typeof entry.content !== 'string') {
      return new Response(JSON.stringify({ error: 'each history item must have role and content strings' }), { status: 400 });
    }
    if (!ALLOWED_ROLES.includes(entry.role)) {
      return new Response(JSON.stringify({ error: 'history role must be "user" or "assistant"' }), { status: 400 });
    }
  }

  const safeMessage = sanitize(message);

  // ── Intent Classification + Guardrails ──
  const intent = classifyIntent(safeMessage);
  const ctx = clientContext || {};
  const sessionId = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // LEGAL_QUESTION: refuse without calling LLM
  if (shouldRefuse(intent)) {
    const refusal = buildRefusalResponse();
    logConversation({ sessionId, clientEmail: ctx.email, orgId: ctx.entityNumber, entityType: ctx.entityType, userMessage: safeMessage, response: refusal.answer, intent, sources: [], confidence: 1.0, escalated: false });
    return new Response(JSON.stringify({ success: true, reply: refusal.answer, intent, sources: refusal.sources }), {
      headers: { 'Access-Control-Allow-Origin': corsOrigin(req), 'Content-Type': 'application/json' }
    });
  }

  // COMPLIANCE_FACT: try deterministic answer first (no LLM, no hallucination risk)
  if (intent === 'COMPLIANCE_FACT') {
    const deterministic = tryDeterministicAnswer(safeMessage, ctx);
    if (deterministic) {
      logConversation({ sessionId, clientEmail: ctx.email, orgId: ctx.entityNumber, entityType: ctx.entityType, userMessage: safeMessage, response: deterministic.answer, intent, sources: deterministic.sources, confidence: deterministic.confidence, escalated: false });
      return new Response(JSON.stringify({ success: true, reply: deterministic.answer, intent, sources: deterministic.sources, confidence: deterministic.confidence }), {
        headers: { 'Access-Control-Allow-Origin': corsOrigin(req), 'Content-Type': 'application/json' }
      });
    }
    // If deterministic can't answer, fall through to LLM with extra guardrails
  }

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) {
    return new Response(JSON.stringify({ 
      success: true, 
      reply: "I'm temporarily unavailable. You can reach our team directly at 814-228-2822 or hello@pacropservices.com — we respond within one business day." 
    }), {
      headers: { 'Access-Control-Allow-Origin': corsOrigin(req), 'Content-Type': 'application/json' }
    });
  }

  const eName = ctx.entityName || entityName || '';
  const tier = ctx.plan || clientTier || '';
  const tierLabel = ctx.planLabel || '';

  let clientSection = '';
  if (eName || tier) {
    clientSection = `\n\nCLIENT CONTEXT (personalize every response using this):`;
    if (eName) clientSection += `\n- Entity: ${eName}`;
    if (ctx.entityType) clientSection += ` (${ctx.entityType})`;
    if (ctx.entityNumber) clientSection += `, PA DOS #${ctx.entityNumber}`;
    if (ctx.entityStatus) clientSection += `\n- Status: ${ctx.entityStatus}`;
    if (tierLabel || tier) clientSection += `\n- Plan: ${tierLabel || tier} (${ctx.price || ''})`;
    if (ctx.includesFiling !== undefined) clientSection += `\n- Filing included: ${ctx.includesFiling ? 'YES' : 'No'}`;
    if (ctx.daysUntilDeadline) clientSection += `\n- Days to deadline: ${ctx.daysUntilDeadline}`;
    if (ctx.documentsReceived !== undefined) clientSection += `\n- Documents received: ${ctx.documentsReceived}`;
    if (ctx.lastDocumentDate) clientSection += `\n- Last document: ${ctx.lastDocumentDate} (${ctx.lastDocumentType || ''})`;
    if (ctx.clientSince) clientSection += `\n- Client since: ${ctx.clientSince}`;
  }

  const systemPrompt = `You are the PA CROP Services compliance concierge. You speak like a trusted advisor — warm, knowledgeable, direct. Never robotic. Never say "I'm an AI" or "As an AI." You ARE the compliance team.

VOICE & TONE:
- Speak like a trusted professional who genuinely cares about this person's business
- Use their entity name naturally: "For ${eName || 'your entity'}..." not "For the entity..."
- Be specific, never generic. If you know their deadline is ${ctx.daysUntilDeadline || '?'} days away, SAY that number
- Keep responses to 2-3 short paragraphs. Concise but warm
- End with a specific next step or offer, never a generic "let me know if you have questions"
- Use contractions naturally: "you'll" not "you will", "we'll" not "we will"

KNOWLEDGE BASE:
${buildChatbotKnowledge()}
- Our address: 924 W 23rd St, Erie, PA 16502
- Plans: Compliance Only $99/yr, Starter $199/yr (hosting), Pro $349/yr (hosting + filing), Empire $699/yr (multi-entity)
- Pro/Empire include annual report filing
- All plans: same-day document scanning, portal, AI assistant, reminders at 90/60/30/14/7 days
${buildGuardrailInstructions()}

RULES:
- Never give legal or tax advice. Say "that's a question for your attorney/CPA" and offer to connect them with a partner
- When their question relates to a higher tier, mention it naturally: "Since you're on ${tierLabel || 'your current plan'}, you'd need to..." not "UPGRADE NOW"
- If you don't know something specific to their entity, say so honestly${clientSection}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map(h => ({ role: sanitize(h.role), content: sanitize(h.content) })),
    { role: 'user', content: safeMessage }
  ];

  // Streaming response
  if (stream) {
    if (isCircuitOpen('groq')) {
      return new Response(JSON.stringify({
        success: true,
        reply: "I'm temporarily unavailable. You can reach our team directly at 814-228-2822 or hello@pacropservices.com — we respond within one business day."
      }), {
        headers: { 'Access-Control-Allow-Origin': corsOrigin(req), 'Content-Type': 'application/json' }
      });
    }
    try {
      const groqRes = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          temperature: 0.4,
          max_tokens: 600,
          stream: true
        })
      }, 15000);

      if (!groqRes.ok) {
        recordFailure('groq');
        return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
          status: 502, headers: { 'Access-Control-Allow-Origin': corsOrigin(req), 'Content-Type': 'application/json' }
        });
      }
      recordSuccess('groq');

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const reader = groqRes.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6).trim();
                  if (data === '[DONE]') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    continue;
                  }
                  try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`));
                    }
                  } catch(e) {}
                }
              }
            }
          } catch(e) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`));
          }
          controller.close();
        }
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': corsOrigin(req)
        }
      });
    } catch(err) {
      recordFailure('groq');
      return new Response(JSON.stringify({ error: 'Stream failed' }), {
        status: 502,
        headers: { 'Access-Control-Allow-Origin': corsOrigin(req), 'Content-Type': 'application/json' }
      });
    }
  }

  // Non-streaming fallback
  if (isCircuitOpen('groq')) {
    return new Response(JSON.stringify({
      success: true,
      reply: "I'm temporarily unavailable. You can reach our team directly at 814-228-2822 or hello@pacropservices.com — we respond within one business day."
    }), {
      headers: { 'Access-Control-Allow-Origin': corsOrigin(req), 'Content-Type': 'application/json' }
    });
  }
  try {
    const groqRes = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.4, max_tokens: 600, stream: false })
    }, 15000);
    if (!groqRes.ok) {
      recordFailure('groq');
      return new Response(JSON.stringify({ error: 'AI service temporarily unavailable' }), {
        status: 502, headers: { 'Access-Control-Allow-Origin': corsOrigin(req), 'Content-Type': 'application/json' }
      });
    }
    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || 'I apologize — please try again.';
    recordSuccess('groq');
    return new Response(JSON.stringify({ success: true, reply }), {
      headers: { 'Access-Control-Allow-Origin': corsOrigin(req), 'Content-Type': 'application/json' }
    });
  } catch(err) {
    recordFailure('groq');
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': corsOrigin(req), 'Content-Type': 'application/json' }
    });
  }
}
