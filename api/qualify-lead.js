// PA CROP Services — AI Lead Qualifier
// POST /api/qualify-lead { answers }
// Scores leads based on conversational intake responses


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

  // Rate limit: AI scoring — 10/min
  if (_rateLimit(req, res, 10, 60000)) return;

  const { answers, email, name } = req.body || {};
  if (!answers) return res.status(400).json({ error: 'answers required' });

  const GROQ_KEY = process.env.GROQ_API_KEY;

  const qualifyPrompt = `Score this lead for PA CROP Services (PA registered office provider).

LEAD RESPONSES:
${JSON.stringify(answers, null, 2)}

Score on 5 dimensions (0-20 each, total 0-100):
1. URGENCY: Are they facing a deadline (annual report, dissolution, formation)?
2. FIT: Do they need a PA registered office specifically?
3. BUDGET: Can they afford $99-$699/year?
4. AUTHORITY: Are they the decision maker?
5. COMPLEXITY: Do they need premium features (hosting, filing, multi-entity)?

Respond in JSON:
{
  "totalScore": 0-100,
  "tier": "hot|warm|cold",
  "dimensions": { "urgency": 0-20, "fit": 0-20, "budget": 0-20, "authority": 0-20, "complexity": 0-20 },
  "recommendedPlan": "compliance_only|business_starter|business_pro|business_empire",
  "nextSteps": "What to say to this lead",
  "followUpQuestion": "Best question to ask next to move them forward",
  "riskFactors": ["list of concerns about this lead"],
  "keyInsight": "One sentence about this lead's primary motivation"
}`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a lead qualification AI for PA CROP Services. Be accurate and specific. Respond only in valid JSON.' },
          { role: 'user', content: qualifyPrompt }
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      })
    });

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || '{}';
    
    let parsed;
    try {
      parsed = JSON.parse(reply);
    } catch {
      parsed = { totalScore: 50, tier: 'warm', recommendedPlan: 'compliance_only' };
    }

    return res.status(200).json({
      success: true,
      email,
      name,
      ...parsed,
      qualifiedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Qualify error:', err);
    return res.status(500).json({ error: 'Qualification failed' });
  }
}
