// PA CROP Services — Post-Purchase Entity Intake
// POST /api/entity-intake { email, entityName, entityType, entityNumber, address, title }
// Called from welcome page after Stripe checkout to collect entity details

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, entityName, entityType, entityNumber, address, title } = req.body || {};
  if (!email || !entityName) return res.status(400).json({ error: 'email and entityName required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;

  let updated = false;

  if (SD_PUBLIC && SD_SECRET) {
    try {
      // Find the contact by email
      const searchRes = await fetch(
        `https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`,
        { headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Accept': 'application/json' } }
      );
      const searchData = await searchRes.json();
      const contacts = searchData?.data || searchData || [];
      const contact = Array.isArray(contacts) ? contacts[0] : contacts;

      if (contact && contact.id) {
        // Update the contact with entity details
        const updateRes = await fetch(
          `https://app.suitedash.com/secure-api/contacts/${contact.id}`,
          {
            method: 'PUT',
            headers: {
              'X-Public-ID': SD_PUBLIC,
              'X-Secret-Key': SD_SECRET,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              company: entityName,
              custom_fields: {
                entity_type: entityType || 'LLC',
                entity_number: entityNumber || '',
                client_address: address || '',
                client_title: title || 'Owner'
              }
            })
          }
        );
        updated = updateRes.ok;
      }
    } catch (e) {
      console.error('SuiteDash update error:', e.message);
    }
  }

  // Trigger n8n entity verification
  try {
    await fetch('https://n8n.audreysplace.place/webhook/crop-dos-entity-checker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, entityName, entityNumber, entityType })
    });
  } catch (e) {}

  return res.status(200).json({
    success: true,
    updated,
    message: updated ? 'Entity details saved. We will verify with PA DOS.' : 'Entity details received. Manual setup required.'
  });
}
