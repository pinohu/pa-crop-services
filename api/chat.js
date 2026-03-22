// PA CROP Services — AI Compliance Chatbot (Streaming)
// POST /api/chat { message, clientContext?, stream? }
// Returns streaming text/event-stream when stream=true

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
  }
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });

  const { message, clientContext, clientTier, entityName, history = [], stream } = await req.json();
  if (!message) return new Response(JSON.stringify({ error: 'message required' }), { status: 400 });

  const GROQ_KEY = process.env.GROQ_API_KEY || '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';

  const ctx = clientContext || {};
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
- PA LLC/corp/LP must maintain registered office (15 Pa. C.S. § 108)
- CROP licensed under 15 Pa. C.S. § 109
- Annual reports due September 30, $7 online at file.dos.pa.gov
- Late reports → dissolution after Dec 31, 2027
- Foreign entities dissolved in PA cannot reinstate
- Change RO: file DSCB:15-108 ($5)
- Our address: 924 W 23rd St, Erie, PA 16502
- Plans: Compliance Only $99/yr, Starter $199/yr (hosting), Pro $349/yr (hosting + filing), Empire $699/yr (multi-entity)
- Pro/Empire include annual report filing
- All plans: same-day document scanning, portal, AI assistant, reminders at 90/60/30/14/7 days

RULES:
- Never give legal or tax advice. Say "that's a question for your attorney/CPA" and offer to connect them with a partner
- When their question relates to a higher tier, mention it naturally: "Since you're on ${tierLabel || 'your current plan'}, you'd need to..." not "UPGRADE NOW"
- If you don't know something specific to their entity, say so honestly${clientSection}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  // Streaming response
  if (stream) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          temperature: 0.4,
          max_tokens: 600,
          stream: true
        })
      });

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
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch(err) {
      return new Response(JSON.stringify({ error: 'Stream failed' }), {
        status: 502,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
      });
    }
  }

  // Non-streaming fallback
  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.4, max_tokens: 600, stream: false })
    });
    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || 'I apologize — please try again.';
    return new Response(JSON.stringify({ success: true, reply }), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    });
  } catch(err) {
    return new Response(JSON.stringify({ error: 'Service unavailable' }), {
      status: 502,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    });
  }
}
