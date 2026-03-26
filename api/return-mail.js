// PA CROP Services — Return Mail Handling
// POST /api/return-mail { clientEmail, returnedTo, reason }
// When outgoing mail returns undeliverable — flag client, alert, pause

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_SECRET_KEY)) return res.status(401).json({ error: 'Unauthorized' });

  const { clientEmail, returnedTo, reason } = req.body || {};
  if (!clientEmail) return res.status(400).json({ error: 'clientEmail required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const result = { clientEmail, flagged: false };

  // Flag in SuiteDash
  if (SD_PUBLIC && SD_SECRET) {
    try {
      const sdRes = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(clientEmail)}&limit=1`, {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
      });
      const contact = ((await sdRes.json())?.data || [])[0];
      if (contact?.id) {
        await fetch(`https://app.suitedash.com/secure-api/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: ['return-mail-flag'], custom_fields: { return_mail_date: new Date().toISOString(), return_mail_reason: reason || 'undeliverable', return_mail_address: returnedTo || '' } })
        });
        result.flagged = true;
      }
    } catch(e) {}
  }

  // Alert client to update address
  const emailitKey = process.env.EMAILIT_API_KEY;
  if (emailitKey) {
    await fetch('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'hello@pacropservices.com', to: clientEmail,
        subject: '⚠️ Mail returned — please update your address',
        html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#0C1220">PA CROP Services</strong></div>
          <p>We sent mail to your address on file, but it was returned as undeliverable.</p>
          <div style="background:#FEE2E2;border:1px solid #FCA5A5;border-radius:12px;padding:16px;margin:16px 0">
            <p style="margin:0"><strong>Reason:</strong> ${reason || 'Address not found / undeliverable'}</p>
          </div>
          <p>Please update your address in your portal to ensure you receive all compliance-related correspondence.</p>
          <p><a href="https://pacropservices.com/portal" style="background:#0C1220;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Update my address →</a></p>
        </div>`
      })
    }).catch(e => console.error('Silent failure:', e.message));
    result.clientNotified = true;
  }

  return res.status(200).json({ success: true, ...result });
}
