// PA CROP Services — /api/client-hosting
// Returns 20i hosting package details for a specific client
// POST { email, suitedashId }


// ── Rate Limiter ──
const _rl = new Map();
function _rateLimit(req, res, max, win) {
  const ip = (req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.headers['x-real-ip'] || 'unknown';
  const k = ip + ':' + (req.url||'').split('?')[0];
  const now = Date.now();
  let d = _rl.get(k);
  if (!d || now - d.s > win) { _rl.set(k, {c:1,s:now,w:win}); return false; }
  d.c++;
  if (d.c > max) { res.setHeader('Retry-After', String(Math.ceil((d.s+win-now)/1000))); res.status(429).json({error:'Too many requests'}); return true; }
  return false;
}

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  // Rate limit: 15/min
  if (_rateLimit(req, res, 15, 60000)) return;


  const { email, suitedashId } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });

  // 20i requires base64-encoded general API key as bearer token
  const TWENTY_GENERAL = process.env.TWENTY_I_GENERAL || process.env.TWENTY_I_TOKEN?.split('+')[0];
  const BEARER = TWENTY_GENERAL ? `Bearer ${Buffer.from(TWENTY_GENERAL).toString('base64')}` : null;
  if (!BEARER) return res.status(200).json({ package: null, message: '20i not configured' });

  try {
    // Get all packages and find one matching this client
    const packagesRes = await fetch('https://api.20i.com/package', {
      headers: { 'Authorization': BEARER }
    });
    const packages = await packagesRes.json();

    // Match by email slug (account slug starts with email username)
    const emailSlug = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 15);
    let matchedPkg = null;
    let matchedId = null;

    const pkgList = Array.isArray(packages) ? packages : [];
    for (const pkg of pkgList) {
      const id = pkg.id;
      const name = (pkg.name || '').toLowerCase();
      if (name.includes(emailSlug) || (pkg.names || []).some(n => typeof n === 'string' && n.includes(emailSlug))) {
        matchedPkg = pkg;
        matchedId = id;
        break;
      }
    }

    if (!matchedPkg) return res.status(200).json({ package: null, message: 'No hosting package found for this account' });

    // Get detailed package info
    const detailRes = await fetch(`https://api.20i.com/package/${matchedId}`, {
      headers: { 'Authorization': BEARER }
    }).catch(() => null);
    const detail = detailRes ? await detailRes.json().catch(() => ({})) : {};

    return res.status(200).json({
      package: {
        id: matchedId,
        name: matchedPkg.name || matchedId,
        domain: matchedPkg.domain || detail.domain || '',
        status: matchedPkg.active ? 'active' : 'suspended',
        emails: matchedPkg.emailCount || detail.emailCount || 0,
        ssl: !!(matchedPkg.ssl || detail.ssl),
        turbo: !!(matchedPkg.turbo || detail.turbo),
        backups: !!(matchedPkg.backups || detail.backups),
        diskUsed: matchedPkg.diskUsage || detail.diskUsage || 0,
        diskLimit: matchedPkg.diskLimit || detail.diskLimit || 0,
        stackcpUrl: 'https://my.20i.com',
      }
    });
  } catch (err) {
    console.error('client-hosting error:', err);
    return res.status(200).json({ package: null, error: err.message });
  }
}
