// PA CROP Services — Tax-Ready Revenue Export
// GET /api/tax-export?key=ADMIN&quarter=Q1&year=2026
// Exports revenue data in CSV format for tax preparation

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
  const quarter = req.query?.quarter || 'Q1';
  const year = req.query?.year || new Date().getFullYear();

  const quarterMonths = { Q1: [0,1,2], Q2: [3,4,5], Q3: [6,7,8], Q4: [9,10,11] };
  const months = quarterMonths[quarter] || quarterMonths.Q1;

  try {
    let clients = [];
    if (SD_PUBLIC && SD_SECRET) {
      const sdRes = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500&role=client', {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
      });
      clients = (await sdRes.json())?.data || [];
    }

    // Build CSV
    let csv = 'Date,Client Email,Client Name,Plan,Amount,Category,Tax Category\n';
    let totalRevenue = 0;

    clients.forEach(c => {
      const since = c.custom_fields?.crop_since ? new Date(c.custom_fields.crop_since) : null;
      if (!since) return;
      const tier = c.custom_fields?.crop_plan || 'compliance';
      const amount = TIER_PRICES[tier] || 99;
      
      // Check if signup falls in this quarter
      if (since.getFullYear() == year && months.includes(since.getMonth())) {
        csv += `${since.toISOString().split('T')[0]},${c.email},"${c.first_name || ''} ${c.last_name || ''}",${tier},${amount},Service Revenue,1099-MISC\n`;
        totalRevenue += amount;
      }
    });

    const summary = {
      quarter: `${quarter} ${year}`,
      totalRevenue,
      clientCount: clients.filter(c => {
        const s = c.custom_fields?.crop_since ? new Date(c.custom_fields.crop_since) : null;
        return s && s.getFullYear() == year && months.includes(s.getMonth());
      }).length,
      csv
    };

    // Return as JSON with CSV embedded, or as CSV file
    if (req.query?.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="pacrop-revenue-${quarter}-${year}.csv"`);
      return res.status(200).send(csv);
    }

    return res.status(200).json({ success: true, ...summary });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
