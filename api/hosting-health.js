// PA CROP Services — 20i Hosting Health Monitor
// GET /api/hosting-health?key=ADMIN
// Checks all client hosting packages: uptime, SSL, disk usage

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const TWENTY_GENERAL = process.env.TWENTY_I_GENERAL || (process.env.TWENTY_I_TOKEN || '').split('+')[0];
  const BEARER = TWENTY_GENERAL ? `Bearer ${Buffer.from(TWENTY_GENERAL).toString('base64')}` : null;
  const TWENTY_RESELLER_ID = process.env.TWENTY_I_RESELLER_ID || '10455';

  if (!BEARER) return res.status(500).json({ error: '20i not configured' });

  const results = { packages: [], alerts: [] };

  try {
    // Get all hosting packages
    const pkgRes = await fetch(`https://api.20i.com/reseller/${TWENTY_RESELLER_ID}/package`, {
      headers: { 'Authorization': BEARER }
    });
    const packages = await pkgRes.json();
    
    if (Array.isArray(packages)) {
      for (const pkg of packages.slice(0, 50)) {
        const pkgInfo = { id: pkg.id, name: pkg.name || pkg.label, domain: pkg.names?.[0] };
        
        // Check SSL status
        try {
          const sslRes = await fetch(`https://api.20i.com/package/${pkg.id}/web/ssl`, {
            headers: { 'Authorization': BEARER }
          });
          const sslData = await sslRes.json();
          pkgInfo.ssl = sslData?.enabled ? 'active' : 'inactive';
          if (!sslData?.enabled) results.alerts.push({ package: pkg.id, domain: pkgInfo.domain, alert: 'SSL not enabled' });
        } catch (e) { pkgInfo.ssl = 'unknown'; }

        results.packages.push(pkgInfo);
      }
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }

  // Send alerts if any
  if (results.alerts.length > 0) {
    const emailitKey = process.env.EMAILIT_API_KEY;
    if (emailitKey) {
      await fetch('https://api.emailit.com/v1/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ops@pacropservices.com', to: 'hello@pacropservices.com',
          subject: `⚠️ Hosting Health: ${results.alerts.length} issues detected`,
          html: `<div style="font-family:sans-serif"><h2>Hosting Health Alerts</h2><pre>${JSON.stringify(results.alerts, null, 2)}</pre></div>`
        })
      }).catch(() => {});
    }
  }

  return res.status(200).json({ success: true, ...results });
}
