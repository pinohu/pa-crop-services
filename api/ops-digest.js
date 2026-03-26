// PA CROP Services — Daily Operations Digest
// GET /api/ops-digest (admin-key required)
// Generates and optionally emails a summary of all activity

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  if (adminKey !== (process.env.ADMIN_SECRET_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const sendEmail = req.query?.send === 'true' || req.body?.send === true;

  const digest = {
    generated: new Date().toISOString(),
    sections: {}
  };

  // 1. Client count by tier
  try {
    if (SD_PUBLIC && SD_SECRET) {
      const sdRes = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500&role=client', {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
      });
      const sdData = await sdRes.json();
      const clients = sdData?.data || [];
      const tiers = {};
      clients.forEach(c => {
        const t = c.custom_fields?.crop_plan || c.tags?.find(t => t.startsWith('crop-'))?.replace('crop-', '') || 'unknown';
        tiers[t] = (tiers[t] || 0) + 1;
      });
      digest.sections.clients = { total: clients.length, by_tier: tiers };
    }
  } catch (e) { digest.sections.clients = { error: e.message }; }

  // 2. System health
  try {
    const services = {};
    // Groq
    const groqStart = Date.now();
    const groqRes = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }
    }).catch(() => null);
    services.groq = { status: groqRes?.ok ? 'healthy' : 'down', latency: Date.now() - groqStart };

    // SuiteDash
    const sdStart = Date.now();
    const sdRes2 = await fetch('https://app.suitedash.com/secure-api/contacts?limit=1', {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    }).catch(() => null);
    services.suitedash = { status: sdRes2?.ok ? 'healthy' : 'down', latency: Date.now() - sdStart };

    // 20i
    const twentyStart = Date.now();
    const TWENTY_GENERAL = process.env.TWENTY_I_GENERAL || (process.env.TWENTY_I_TOKEN || '').split('+')[0];
    const twentyRes = await fetch('https://api.20i.com/reseller/' + (process.env.TWENTY_I_RESELLER_ID || '10455'), {
      headers: { 'Authorization': `Bearer ${TWENTY_GENERAL ? Buffer.from(TWENTY_GENERAL).toString('base64') : ''}` }
    }).catch(() => null);
    services['20i'] = { status: twentyRes?.ok ? 'healthy' : 'degraded', latency: Date.now() - twentyStart };

    digest.sections.system_health = services;
  } catch (e) { digest.sections.system_health = { error: e.message }; }

  // 3. Pending actions
  digest.sections.pending = {
    actions: [
      'Check for new entity intake submissions',
      'Review any domain registration requests',
      'Verify new client entity status on PA DOS',
    ]
  };

  // Email digest if requested
  if (sendEmail) {
    const emailitKey = process.env.EMAILIT_API_KEY;
    if (emailitKey) {
      const healthEmoji = Object.values(digest.sections.system_health || {}).every(s => s.status === 'healthy') ? '✅' : '⚠️';
      const clientInfo = digest.sections.clients || {};
      
      await fetch('https://api.emailit.com/v1/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'ops@pacropservices.com',
          to: 'hello@pacropservices.com',
          subject: `${healthEmoji} PA CROP Daily Digest — ${new Date().toLocaleDateString()}`,
          html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:20px">
              <strong style="font-size:18px;color:#0C1220">PA CROP — Daily Ops Digest</strong>
              <span style="float:right;font-size:13px;color:#7A7A7A">${new Date().toLocaleDateString()}</span>
            </div>
            <h3 style="color:#0C1220">📊 Clients</h3>
            <p>Total: <strong>${clientInfo.total || '?'}</strong></p>
            <p>By tier: ${JSON.stringify(clientInfo.by_tier || {})}</p>
            <h3 style="color:#0C1220">🔧 System Health</h3>
            <pre style="background:#FAF9F6;padding:12px;border-radius:8px;font-size:13px">${JSON.stringify(digest.sections.system_health || {}, null, 2)}</pre>
            <h3 style="color:#0C1220">📋 Pending Actions</h3>
            <ul>${(digest.sections.pending?.actions || []).map(a => '<li>' + a + '</li>').join('')}</ul>
            <p style="margin-top:20px;font-size:13px;color:#7A7A7A">
              <a href="https://pacropservices.com/admin" style="color:#C9982A">Open Admin Dashboard →</a>
            </p>
          </div>`
        })
      }).catch(e => { digest.email_error = e.message; });
      digest.email_sent = true;
    }
  }

  return res.status(200).json({ success: true, ...digest });
}
