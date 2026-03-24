// PA CROP Services — API Usage Analytics
// POST /api/api-analytics { endpoint, method, status, latency, ip }
// GET /api/api-analytics?key=ADMIN (view stats)
// In-memory analytics (resets on cold start, sufficient for Vercel)

const STATS = { endpoints: {}, totalRequests: 0, errors: 0, startTime: Date.now() };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {

  // POST: Log a request (called by other APIs or middleware)
  if (req.method === 'POST') {
    const { endpoint, method, status, latency } = req.body || {};
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    if (!STATS.endpoints[endpoint]) STATS.endpoints[endpoint] = { calls: 0, errors: 0, totalLatency: 0, avgLatency: 0 };
    const ep = STATS.endpoints[endpoint];
    ep.calls++;
    if (status >= 400) ep.errors++;
    if (latency) { ep.totalLatency += latency; ep.avgLatency = Math.round(ep.totalLatency / ep.calls); }
    STATS.totalRequests++;
    if (status >= 400) STATS.errors++;
    return res.status(200).json({ logged: true });
  }

  // GET: View analytics
  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) return res.status(401).json({ error: 'Unauthorized' });

  const uptimeMs = Date.now() - STATS.startTime;
  return res.status(200).json({
    success: true,
    uptime: `${Math.round(uptimeMs / 60000)} minutes`,
    totalRequests: STATS.totalRequests,
    errorRate: STATS.totalRequests > 0 ? ((STATS.errors / STATS.totalRequests) * 100).toFixed(1) + '%' : '0%',
    endpoints: Object.entries(STATS.endpoints).sort((a,b) => b[1].calls - a[1].calls).map(([name, data]) => ({ endpoint: name, ...data })),
    note: 'In-memory stats — resets on cold start. For persistent analytics, use Vercel Analytics or external service.'
  });
  } catch (err) {
    console.error("api-analytics error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
