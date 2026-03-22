// PA CROP Services — System Health Check
// GET /api/health
// Tests: Groq AI, SuiteDash CRM, 20i hosting, email deliverability

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const checks = {};
  const start = Date.now();

  // 1. Groq AI
  try {
    const GROQ_KEY = process.env.GROQ_API_KEY;
    const r = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${GROQ_KEY}` }
    });
    checks.groq = { status: r.ok ? 'healthy' : 'degraded', latency: Date.now() - start + 'ms' };
  } catch (e) { checks.groq = { status: 'down', error: e.message }; }

  // 2. SuiteDash CRM
  const sd_start = Date.now();
  try {
    const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
    const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
    if (SD_PUBLIC && SD_SECRET) {
      const r = await fetch('https://app.suitedash.com/secure-api/contacts?limit=1', {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Accept': 'application/json' }
      });
      checks.suitedash = { status: r.ok ? 'healthy' : 'degraded', latency: (Date.now() - sd_start) + 'ms' };
    } else {
      checks.suitedash = { status: 'not_configured' };
    }
  } catch (e) { checks.suitedash = { status: 'down', error: e.message }; }

  // 3. 20i Hosting
  const twi_start = Date.now();
  try {
    const TWI_TOKEN = process.env.TWENTY_I_GENERAL;
    if (TWI_TOKEN) {
      const r = await fetch('https://api.20i.com/package', {
        headers: { 'Authorization': `Bearer ${Buffer.from(TWI_TOKEN).toString('base64')}` }
      });
      checks.twenty_i = { status: r.ok ? 'healthy' : 'degraded', latency: (Date.now() - twi_start) + 'ms' };
    } else {
      checks.twenty_i = { status: 'not_configured' };
    }
  } catch (e) { checks.twenty_i = { status: 'down', error: e.message }; }

  // 4. n8n
  const n8n_start = Date.now();
  try {
    const r = await fetch('https://n8n.audreysplace.place/healthz');
    checks.n8n = { status: r.ok ? 'healthy' : 'degraded', latency: (Date.now() - n8n_start) + 'ms' };
  } catch (e) { checks.n8n = { status: 'down', error: e.message }; }

  // Overall
  const statuses = Object.values(checks).map(c => c.status);
  const overall = statuses.every(s => s === 'healthy' || s === 'not_configured') ? 'healthy' :
    statuses.some(s => s === 'down') ? 'degraded' : 'healthy';

  return res.status(overall === 'healthy' ? 200 : 503).json({
    status: overall,
    timestamp: new Date().toISOString(),
    totalLatency: (Date.now() - start) + 'ms',
    services: checks
  });
}
