// PA CROP Services — Multi-State Entity Monitoring
// POST /api/multi-state { email, states: [{state, entityName, fileNumber}] }
// GET /api/multi-state?email=x (list monitored states)
// Tracks entity compliance across PA, NJ, NY, DE, OH, MD

const STATE_INFO = {
  PA: { name: 'Pennsylvania', sosUrl: 'https://www.corporations.pa.gov/search/corpsearch', annualReport: true, fee: '$7' },
  NJ: { name: 'New Jersey', sosUrl: 'https://www.njportal.com/DOR/BusinessNameSearch', annualReport: true, fee: '$78' },
  NY: { name: 'New York', sosUrl: 'https://appext20.dos.ny.gov/corp_public/CORPSEARCH.ENTITY_SEARCH_ENTRY', annualReport: false, biennialReport: true, fee: '$9' },
  DE: { name: 'Delaware', sosUrl: 'https://icis.corp.delaware.gov/ecorp/entitysearch/namesearch.aspx', annualReport: true, fee: '$300 (LLC), $225 (Corp)' },
  OH: { name: 'Ohio', sosUrl: 'https://businesssearch.ohiosos.gov/', annualReport: false, note: 'No annual report but biennial commercial activity tax' },
  MD: { name: 'Maryland', sosUrl: 'https://egov.maryland.gov/BusinessExpress/EntitySearch', annualReport: true, fee: '$300' },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const email = req.query?.email || req.body?.email;
  if (!email) return res.status(400).json({ error: 'email required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;

  if (req.method === 'GET') {
    // Return state info + client's monitored states
    if (SD_PUBLIC && SD_SECRET) {
      try {
        const sdRes = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
          headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
        });
        const contact = ((await sdRes.json())?.data || [])[0];
        let states = [];
        try { states = JSON.parse(contact?.custom_fields?.multistate_json || '[]'); } catch(e) {}
        return res.status(200).json({ success: true, monitoredStates: states, availableStates: STATE_INFO });
      } catch(e) { return res.status(500).json({ error: e.message }); }
    }
    return res.status(200).json({ availableStates: STATE_INFO });
  }

  // POST: Add/update monitored states
  const { states } = req.body || {};
  if (!states || !Array.isArray(states)) return res.status(400).json({ error: 'states array required' });

  const enriched = states.map(s => ({
    ...s,
    stateInfo: STATE_INFO[s.state?.toUpperCase()] || null,
    addedDate: new Date().toISOString(),
    lastChecked: null,
    status: 'pending_verification'
  }));

  // Save to SuiteDash
  if (SD_PUBLIC && SD_SECRET) {
    try {
      const sdRes = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
      });
      const contact = ((await sdRes.json())?.data || [])[0];
      if (contact?.id) {
        await fetch(`https://app.suitedash.com/secure-api/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ custom_fields: { multistate_json: JSON.stringify(enriched), multistate_count: String(enriched.length) } })
        });
      }
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  return res.status(200).json({ success: true, monitoredStates: enriched });
}
