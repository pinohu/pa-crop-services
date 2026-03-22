// PA CROP Services — Post-Purchase Entity Intake
// POST /api/entity-intake { email, entityName, entityType, dosFileNumber, foreignState? }
// Called from welcome page or portal to collect entity details after purchase

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, entityName, entityType, dosFileNumber, foreignState } = req.body || {};
  if (!email || !entityName) return res.status(400).json({ error: 'email and entityName required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;

  // Update SuiteDash contact with entity details
  if (SD_PUBLIC && SD_SECRET) {
    try {
      // Find the contact
      const findRes = await fetch(
        `https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`,
        { headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Accept': 'application/json' } }
      );
      if (findRes.ok) {
        const findData = await findRes.json();
        const contacts = findData?.data || findData || [];
        const client = Array.isArray(contacts) ? contacts[0] : contacts;
        
        if (client?.id) {
          // Update with entity details
          await fetch(`https://app.suitedash.com/secure-api/contacts/${client.id}`, {
            method: 'PUT',
            headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              company: entityName,
              custom_fields: {
                entity_type: entityType || 'LLC',
                dos_file_number: dosFileNumber || '',
                foreign_state: foreignState || '',
              }
            })
          });
        }
      }
    } catch (e) {
      console.error('SuiteDash update failed:', e.message);
    }
  }

  // Trigger n8n entity verification workflow if needed
  try {
    await fetch('https://n8n.audreysplace.place/webhook/crop-entity-intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, entityName, entityType, dosFileNumber, foreignState, timestamp: new Date().toISOString() })
    });
  } catch(e) {}

  return res.status(200).json({ success: true, message: 'Entity details saved' });
}
