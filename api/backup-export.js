// PA CROP Services — Database Backup Export
// GET /api/backup-export?key=ADMIN&type=clients|config|all
// Exports all client data, configuration, and system state as JSON

export default async function handler(req, res) {
  // No CORS on backup export — admin API only
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Admin key from header only — never query params (they leak in logs)
  const adminKey = req.headers['x-admin-key'];
  const expectedKey = process.env.ADMIN_SECRET_KEY;
  if (!adminKey || !expectedKey || adminKey !== expectedKey) return res.status(401).json({ error: 'Unauthorized' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const type = req.query?.type || 'all';
  const backup = { generated: new Date().toISOString(), type, data: {} };

  try {
    if ((type === 'clients' || type === 'all') && SD_PUBLIC && SD_SECRET) {
      const sdRes = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500', {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
      });
      backup.data.contacts = (await sdRes.json())?.data || [];
      backup.data.contactCount = backup.data.contacts.length;
    }

    if (type === 'config' || type === 'all') {
      backup.data.config = {
        envVarsConfigured: ['GROQ_API_KEY','SUITEDASH_PUBLIC_ID','SUITEDASH_SECRET_KEY','TWENTY_I_TOKEN','ACUMBAMAIL_API_KEY','ADMIN_SECRET_KEY','DOCUMENTERO_API_KEY'].filter(k => !!process.env[k]),
        envVarsMissing: ['EMAILIT_API_KEY','STRIPE_WEBHOOK_SECRET','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN'].filter(k => !process.env[k]),
        platform: { apis: 55, pages: 36, automations: 72 },
        stripeProducts: {
          compliance: { price: 9900, link: 'buy.stripe.com/6oU9AUcheaD173I2Ys6sw0c' },
          starter: { price: 19900, link: 'buy.stripe.com/28E7sM80YdPdewa42w6sw09' },
          pro: { price: 34900, link: 'buy.stripe.com/7sY4gAepm12rbjYaqU6sw0a' },
          empire: { price: 69900, link: 'buy.stripe.com/cNi4gAgxueTh9bQaqU6sw0b' },
        }
      };
    }

    // Optionally email backup
    if (req.query?.email === 'true') {
      const emailitKey = process.env.EMAILIT_API_KEY;
      if (emailitKey) {
        await fetch('https://api.emailit.com/v1/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'ops@pacropservices.com', to: 'hello@pacropservices.com',
            subject: `📦 PA CROP Backup — ${new Date().toLocaleDateString()}`,
            html: `<pre style="font-size:11px;max-height:500px;overflow:auto">${JSON.stringify(backup, null, 2).slice(0, 50000)}</pre>`
          })
        }).catch(() => {});
        backup.emailed = true;
      }
    }

    return res.status(200).json({ success: true, ...backup });
  } catch(e) { return res.status(500).json({ error: e.message }); }
}
