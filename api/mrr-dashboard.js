// PA CROP Services — MRR/Revenue Dashboard
// GET /api/mrr-dashboard?key=ADMIN
// Calculates MRR, ARR, client counts by tier, growth metrics

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;

  const TIER_PRICES = { compliance: 99, starter: 199, pro: 349, empire: 699 };
  const metrics = { mrr: 0, arr: 0, clients: { total: 0, by_tier: {} }, arpu: 0, ltv_estimate: 0 };

  try {
    if (SD_PUBLIC && SD_SECRET) {
      const sdRes = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500&role=client', {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
      });
      const clients = (await sdRes.json())?.data || [];
      
      let totalRevenue = 0;
      clients.forEach(c => {
        const tier = c.custom_fields?.crop_plan || 'compliance';
        const isActive = c.tags?.some(t => t.includes('crop-active'));
        if (!isActive) return;
        
        metrics.clients.total++;
        metrics.clients.by_tier[tier] = (metrics.clients.by_tier[tier] || 0) + 1;
        totalRevenue += TIER_PRICES[tier] || 99;
      });

      metrics.arr = totalRevenue;
      metrics.mrr = Math.round(totalRevenue / 12 * 100) / 100;
      metrics.arpu = metrics.clients.total > 0 ? Math.round(totalRevenue / metrics.clients.total * 100) / 100 : 0;
      metrics.ltv_estimate = Math.round(metrics.arpu * 3.2 * 100) / 100; // Assume 3.2yr avg retention

      // Revenue breakdown
      metrics.revenue_breakdown = {};
      Object.entries(metrics.clients.by_tier).forEach(([tier, count]) => {
        metrics.revenue_breakdown[tier] = { clients: count, annual: count * (TIER_PRICES[tier] || 99), monthly: Math.round(count * (TIER_PRICES[tier] || 99) / 12 * 100) / 100 };
      });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  return res.status(200).json({ success: true, generated: new Date().toISOString(), ...metrics });
}
