// PA CROP Services — Error Log AI Analysis
// GET /api/error-analysis?key=ADMIN
// Groq analyzes recent patterns and suggests fixes

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const GROQ_KEY = process.env.GROQ_API_KEY;

  // First check uptime to get current system state — use header auth, never URL param
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
  let uptimeData = {};
  try {
    const uptimeRes = await fetch(`${baseUrl}/api/uptime-monitor`, {
      headers: { 'X-Admin-Key': process.env.ADMIN_SECRET_KEY || '' }
    });
    uptimeData = await uptimeRes.json();
  } catch(e) {}

  // Get health data
  let healthData = {};
  try {
    const healthRes = await fetch(`${baseUrl}/api/health`);
    healthData = await healthRes.json();
  } catch(e) {}

  // Use Groq to analyze and suggest
  let analysis = {};
  if (GROQ_KEY) {
    try {
      const analysisRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 500,
          messages: [
            { role: 'system', content: 'You analyze system health data for a Vercel-hosted SaaS platform. Provide actionable recommendations. Respond in JSON: {"status":"healthy|warning|critical","issues":["issue1"],"recommendations":["rec1"],"priority_action":"most important thing to do"}' },
            { role: 'user', content: `Analyze this system state:\n\nUptime: ${JSON.stringify(uptimeData?.endpoints?.map(e => ({name:e.name,status:e.status,latency:e.latency})) || 'unavailable')}\n\nHealth: ${JSON.stringify(healthData?.services || 'unavailable')}\n\nTotal APIs: 50+\nPlatform: Vercel serverless\nExternal deps: Groq, SuiteDash, 20i, Stripe, Emailit, SMS-iT` }
          ]
        })
      });
      const text = (await analysisRes.json())?.choices?.[0]?.message?.content || '';
      try { analysis = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) {}
    } catch(e) {}
  }

  return res.status(200).json({
    success: true,
    generated: new Date().toISOString(),
    systemState: uptimeData?.overall || 'unknown',
    endpointCount: uptimeData?.endpoints?.length || 0,
    downEndpoints: uptimeData?.endpoints?.filter(e => e.status === 'down').map(e => e.name) || [],
    analysis
  });
}
