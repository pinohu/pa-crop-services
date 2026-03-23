// PA CROP Services — API Uptime Monitor
// GET /api/uptime-monitor?key=ADMIN
// Pings all critical endpoints, reports health status

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
  const endpoints = [
    { name: 'health', path: '/api/health', method: 'GET', critical: true },
    { name: 'chat', path: '/api/chat', method: 'OPTIONS', critical: true },
    { name: 'intake', path: '/api/intake', method: 'OPTIONS', critical: true },
    { name: 'auth', path: '/api/auth', method: 'OPTIONS', critical: true },
    { name: 'provision', path: '/api/provision', method: 'OPTIONS', critical: true },
    { name: 'subscribe', path: '/api/subscribe', method: 'OPTIONS', critical: false },
    { name: 'sms', path: '/api/sms', method: 'OPTIONS', critical: false },
    { name: 'homepage', path: '/', method: 'GET', critical: true },
    { name: 'portal', path: '/portal', method: 'GET', critical: true },
  ];

  const results = { healthy: 0, degraded: 0, down: 0, endpoints: [], timestamp: new Date().toISOString() };

  for (const ep of endpoints) {
    const start = Date.now();
    try {
      const r = await fetch(`${baseUrl}${ep.path}`, { method: ep.method, signal: AbortSignal.timeout(5000) });
      const latency = Date.now() - start;
      const status = r.ok || r.status === 405 || r.status === 401 ? 'healthy' : 'degraded';
      results.endpoints.push({ name: ep.name, status, latency, httpStatus: r.status, critical: ep.critical });
      if (status === 'healthy') results.healthy++; else results.degraded++;
    } catch(e) {
      results.endpoints.push({ name: ep.name, status: 'down', latency: Date.now() - start, error: e.message, critical: ep.critical });
      results.down++;
    }
  }

  // External services
  const services = [
    { name: 'groq', url: 'https://api.groq.com/openai/v1/models', headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` } },
    { name: 'suitedash', url: 'https://app.suitedash.com/secure-api/contacts?limit=1', headers: { 'X-Public-ID': process.env.SUITEDASH_PUBLIC_ID || '', 'X-Secret-Key': process.env.SUITEDASH_SECRET_KEY || '' } },
  ];

  for (const svc of services) {
    const start = Date.now();
    try {
      const r = await fetch(svc.url, { headers: svc.headers, signal: AbortSignal.timeout(8000) });
      results.endpoints.push({ name: svc.name, status: r.ok ? 'healthy' : 'degraded', latency: Date.now() - start, external: true });
      if (r.ok) results.healthy++; else results.degraded++;
    } catch(e) {
      results.endpoints.push({ name: svc.name, status: 'down', latency: Date.now() - start, external: true });
      results.down++;
    }
  }

  results.overall = results.down > 0 ? 'degraded' : results.degraded > 0 ? 'warning' : 'healthy';

  // Alert if any critical endpoint is down
  if (results.endpoints.some(e => e.status === 'down' && e.critical)) {
    const emailitKey = process.env.EMAILIT_API_KEY;
    if (emailitKey) {
      const downList = results.endpoints.filter(e => e.status === 'down').map(e => e.name).join(', ');
      await fetch('https://api.emailit.com/v1/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ops@pacropservices.com', to: 'hello@pacropservices.com',
          subject: `🚨 DOWNTIME: ${downList}`,
          html: `<pre>${JSON.stringify(results, null, 2)}</pre>`
        })
      }).catch(() => {});
    }
  }

  return res.status(200).json({ success: true, ...results });
}
