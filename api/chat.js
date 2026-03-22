// PA CROP Services — AI Compliance Chatbot v2
// POST /api/chat { message, clientContext?, history? }
// Context-aware: knows client's entity, plan, filing dates, documents

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, clientContext, clientTier, entityName, history = [] } = req.body || {};
  if (!message) return res.status(400).json({ error: 'message required' });

  const GROQ_KEY = process.env.GROQ_API_KEY || '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';

  // Build context-aware system prompt
  const ctx = clientContext || {};
  const eName = ctx.entityName || entityName || '';
  const tier = ctx.plan || clientTier || '';
  const tierLabel = ctx.planLabel || '';
  
  let clientSection = '';
  if (eName || tier) {
    clientSection = `\n\nCLIENT CONTEXT (use this to personalize your response):`;
    if (eName) clientSection += `\n- Entity name: ${eName}`;
    if (ctx.entityType) clientSection += `\n- Entity type: ${ctx.entityType}`;
    if (ctx.entityNumber) clientSection += ` (PA DOS File #${ctx.entityNumber})`;
    if (ctx.entityStatus) clientSection += `\n- Current entity status: ${ctx.entityStatus}`;
    if (tierLabel || tier) clientSection += `\n- Current plan: ${tierLabel || tier} (${ctx.price || ''})`;
    if (ctx.includesFiling !== undefined) clientSection += `\n- Annual report filing included: ${ctx.includesFiling ? 'YES' : 'No (available in Pro/Empire)'}`;
    if (ctx.includesHosting !== undefined) clientSection += `\n- Web hosting included: ${ctx.includesHosting ? 'YES' : 'No (available in Starter+)'}`;
    if (ctx.daysUntilDeadline) clientSection += `\n- Days until annual report deadline (Sept 30): ${ctx.daysUntilDeadline}`;
    if (ctx.annualReportStatus) clientSection += `\n- Annual report status: ${ctx.annualReportStatus}`;
    if (ctx.documentsReceived !== undefined) clientSection += `\n- Documents received this year: ${ctx.documentsReceived}`;
    if (ctx.lastDocumentDate) clientSection += `\n- Last document received: ${ctx.lastDocumentDate} (type: ${ctx.lastDocumentType || 'unknown'})`;
    if (ctx.clientSince) clientSection += `\n- Client since: ${ctx.clientSince}`;
    if (ctx.referralCode) clientSection += `\n- Referral code: ${ctx.referralCode}`;
    if (ctx.referralCount) clientSection += `\n- Referrals made: ${ctx.referralCount}`;
    
    clientSection += `\n\nWhen this client asks about their account, USE the context above to give specific answers. For example:`;
    clientSection += `\n- "When is my annual report due?" → "Your annual report for ${eName} is due September 30, ${ctx.daysUntilDeadline} days from now. ${ctx.includesFiling ? 'Since you\'re on the ' + tierLabel + ' plan, we\'ll file it for you.' : 'You can file at file.dos.pa.gov ($7 fee), or upgrade to Business Pro to have us handle it.'}"`;
    clientSection += `\n- "What plan am I on?" → "You're on the ${tierLabel} plan at ${ctx.price}." Then describe what's included.`;
    clientSection += `\n- "How many documents have you received?" → "We've received ${ctx.documentsReceived || 0} documents for ${eName} this year."`;
  }

  const systemPrompt = `You are the PA CROP Services AI Compliance Assistant. You help Pennsylvania business owners understand their registered office obligations, annual report requirements, and entity compliance.

CRITICAL KNOWLEDGE BASE:
- Every PA LLC, corporation, and LP must maintain a registered office address under 15 Pa. C.S. § 108
- A Commercial Registered Office Provider (CROP) is licensed under 15 Pa. C.S. § 109
- PA annual reports are due September 30 each year (decennial reports for LPs/LLPs)
- Filing fee: $7 online at file.dos.pa.gov, $70 on paper
- Late/missed annual reports → administrative dissolution after Dec 31, 2027
- Foreign entities dissolved in PA CANNOT reinstate — must re-register as new entity
- To change registered office: file DSCB:15-108 ($5 fee)
- PA CROP Services address: 924 W 23rd St, Erie, PA 16502
- Plans: Compliance Only ($99/yr), Business Starter ($199/yr), Business Pro ($349/yr), Business Empire ($699/yr)
- Business Pro and Empire include annual report filing
- Business Starter+ includes web hosting, email, and domain
- Business Empire includes multi-entity management, VPS hosting
- All plans include same-day document scanning, portal access, annual report reminders (90/60/30/14/7 days)

RESPONSE RULES:
- Be concise and direct — 2-3 paragraphs max
- Cite specific PA statutes when relevant (15 Pa. C.S. §)
- When the client has context, give SPECIFIC answers using their data — never generic
- If the question is outside PA compliance (tax, legal advice, litigation), say you can't advise on that and suggest consulting a CPA or attorney
- Naturally mention relevant PA CROP Services features when appropriate
- Suggest upgrading only when the question relates to a service in a higher tier AND it would genuinely help them${clientSection}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.3,
        max_tokens: 800,
        stream: false
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq error:', groqRes.status, errText);
      return res.status(502).json({ error: 'AI service temporarily unavailable' });
    }

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || 'I apologize, I was unable to process that question. Please try again.';

    return res.status(200).json({ success: true, reply, model: data.model, usage: data.usage });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
