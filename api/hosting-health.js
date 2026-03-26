import { setCors, isAdminRequest } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('hosting-health');

// PA CROP Services — 20i Hosting Health Monitor
// GET /api/hosting-health?key=ADMIN
// Checks all client hosting packages: uptime, SSL, disk usage

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const TWENTY_GENERAL = process.env.TWENTY_I_GENERAL || (process.env.TWENTY_I_TOKEN || '').split('+')[0];
  const BEARER = TWENTY_GENERAL ? `Bearer ${Buffer.from(TWENTY_GENERAL).toString('base64')}` : null;
  const TWENTY_RESELLER_ID = process.env.TWENTY_I_RESELLER_ID || '10455';

  if (!BEARER) return res.status(500).json({ success: false, error: '20i not configured' });

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
    log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' });
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
      }).catch(e => log.warn('external_call_failed', { error: e.message }));
    }
  }

  // Check main site SSL + connectivity
  try {
    const siteStart = Date.now();
    const siteRes = await fetch('https://pacropservices.com/', { signal: AbortSignal.timeout(10000) });
    results.mainSite = { status: siteRes.ok ? 'healthy' : 'degraded', latency: Date.now() - siteStart, httpStatus: siteRes.status };
  } catch(e) {
    results.mainSite = { status: 'down', error: e.message };
    results.alerts.push({ domain: 'pacropservices.com', alert: 'Main site unreachable' });
  }

  results.summary = {
    totalPackages: results.packages.length,
    sslIssues: results.alerts.filter(a => a.alert?.includes('SSL')).length,
    totalAlerts: results.alerts.length,
    mainSite: results.mainSite?.status || 'unknown'
  };

  return res.status(200).json({ success: true, ...results });
}
