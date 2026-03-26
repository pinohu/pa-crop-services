
import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';

const log = createLogger('qualify-lead');
// PA CROP Services — AI Lead Qualifier
// POST /api/qualify-lead { answers }
// Scores leads based on conversational intake responses



export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const rlResult = await checkRateLimit(getClientIp(req), 'qualify-lead', 10, '60s');
  if (rlResult) {
    res.setHeader('Retry-After', String(rlResult.retryAfter));
    return res.status(429).json({ success: false, error: 'Too many requests' });
  }

  const { answers, email, name } = req.body || {};
  if (!answers) return res.status(400).json({ success: false, error: 'answers required' });

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
    log.error('qualify_error', {}, err);
    return res.status(500).json({ success: false, error: 'Qualification failed' });
  }
}
