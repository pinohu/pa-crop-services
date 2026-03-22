// PA CROP Services — Entity Status Monitor
// POST /api/entity-monitor (called by n8n cron)
// Checks PA DOS for all client entity statuses, flags changes

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key, X-Internal-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'] || req.headers['x-internal-key'];
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { entityName, entityNumber, clientEmail } = req.body || {};

  // PA DOS business search scrape
  const dosUrl = `https://www.corporations.pa.gov/search/corpsearch`;
  
  try {
    // Use PA DOS API-like search
    const searchUrl = `https://www.corporations.pa.gov/api/Search/GetSearchResults`;
    const searchRes = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        searchType: entityNumber ? 'EntityNumber' : 'EntityName',
        searchValue: entityNumber || entityName,
        stateOfIncorporation: 'PA',
        entityType: '',
        pageNumber: 1,
        pageSize: 5
      })
    });

    let status = 'unknown';
    let details = {};
    
    if (searchRes.ok) {
      const data = await searchRes.json();
      const entities = data?.results || data || [];
      const match = Array.isArray(entities) ? entities.find(e => 
        (entityNumber && String(e.entityNumber) === String(entityNumber)) ||
        (entityName && (e.entityName || '').toLowerCase().includes(entityName.toLowerCase()))
      ) : null;

      if (match) {
        status = (match.status || match.entityStatus || 'active').toLowerCase();
        details = {
          entityName: match.entityName || entityName,
          entityNumber: match.entityNumber || entityNumber,
          entityType: match.entityType || '',
          status: status,
          statusDate: match.statusDate || '',
          creationDate: match.creationDate || '',
          state: match.stateOfIncorporation || 'PA'
        };
      }
    }

    // Determine if status is concerning
    const isGood = ['active', 'good standing', 'current'].some(s => status.includes(s));
    const isBad = ['dissolved', 'cancelled', 'revoked', 'suspended', 'delinquent', 'forfeited'].some(s => status.includes(s));
    
    const alertLevel = isBad ? 'critical' : (isGood ? 'ok' : 'warning');

    return res.status(200).json({
      success: true,
      entityName: entityName || details.entityName,
      entityNumber: entityNumber || details.entityNumber,
      clientEmail,
      status,
      alertLevel,
      details,
      checkedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Entity monitor error:', err);
    return res.status(200).json({
      success: true,
      entityName, entityNumber, clientEmail,
      status: 'check_failed',
      alertLevel: 'warning',
      error: err.message,
      checkedAt: new Date().toISOString()
    });
  }
}
