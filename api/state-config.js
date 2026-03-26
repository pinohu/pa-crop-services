// PA CROP Services — Multi-State Platform Config Generator
// GET /api/state-config?state=NJ (returns state-specific platform config)
// GET /api/state-config?all=true (all 6 expansion states)
// Blueprint for cloning PA CROP to other states

const STATES = {
  PA: { name:'Pennsylvania', statute:'15 Pa. C.S. § 109', term:'CROP', sos:'PA DOS', fee:7, reportName:'Annual Report', form:'DSCB:15-530', searchUrl:'https://www.corporations.pa.gov/search/corpsearch', filingUrl:'https://file.dos.pa.gov', implemented:true },
  NJ: { name:'New Jersey', statute:'N.J.S.A. 14A:4-1', term:'Registered Agent', sos:'NJ DORES', fee:78, reportName:'Annual Report', form:'Online only', searchUrl:'https://www.njportal.com/DOR/BusinessNameSearch', filingUrl:'https://www.njportal.com/DOR/BusinessAmendments', implemented:false },
  NY: { name:'New York', statute:'NY BCL § 305', term:'Registered Agent', sos:'NY DOS', fee:9, reportName:'Biennial Statement', form:'DOS-1335', searchUrl:'https://appext20.dos.ny.gov/corp_public/CORPSEARCH.ENTITY_SEARCH_ENTRY', filingUrl:'https://appext20.dos.ny.gov', implemented:false },
  DE: { name:'Delaware', statute:'8 Del. C. § 132', term:'Registered Agent', sos:'DE Division of Corporations', fee:300, reportName:'Annual Report/Franchise Tax', form:'Online', searchUrl:'https://icis.corp.delaware.gov/ecorp/entitysearch/namesearch.aspx', filingUrl:'https://corp.delaware.gov/paytaxes/', implemented:false },
  OH: { name:'Ohio', statute:'ORC § 1701.07', term:'Statutory Agent', sos:'OH SOS', fee:0, reportName:'None (CAT tax instead)', form:'N/A', searchUrl:'https://businesssearch.ohiosos.gov/', filingUrl:'https://businesssearch.ohiosos.gov/', implemented:false },
  MD: { name:'Maryland', statute:'MD Corps & Assns § 2-108', term:'Resident Agent', sos:'MD SDAT', fee:300, reportName:'Annual Report + Personal Property Return', form:'Online', searchUrl:'https://egov.maryland.gov/BusinessExpress/EntitySearch', filingUrl:'https://egov.maryland.gov/BusinessExpress', implemented:false },
};

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {

  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  if (adminKey !== (process.env.ADMIN_SECRET_KEY)) return res.status(401).json({ error: 'Unauthorized' });

  const state = req.query?.state?.toUpperCase();
  const all = req.query?.all === 'true';

  if (state && STATES[state]) {
    const s = STATES[state];
    return res.status(200).json({
      success: true, state, config: s,
      platformBlueprint: {
        domainSuggestion: `${state.toLowerCase()}cropservices.com`,
        pricingAdjustment: s.fee > 100 ? 'Higher base price to cover state fees' : 'Standard PA CROP pricing works',
        apiChanges: [`entity-monitor: change search URL to ${s.searchUrl}`, `annual-report-prefill: change form to ${s.form}`, `provision: update fee to $${s.fee}`],
        complianceChanges: [`Update statute references from 15 Pa. C.S. to ${s.statute}`, `Change terminology from CROP to ${s.term}`, `Update SOS references to ${s.sos}`],
        estimatedSetupTime: '2-3 days for code fork + configuration',
      }
    });
  }

  if (all) {
    return res.status(200).json({ success: true, states: STATES, expansionPriority: ['NJ','NY','DE','MD','OH'], note: 'NJ and NY are highest priority — closest to PA, largest entity counts, most foreign entities needing multi-state service' });
  }

  return res.status(200).json({ success: true, available: Object.keys(STATES), implemented: Object.entries(STATES).filter(([k,v]) => v.implemented).map(([k]) => k) });
  } catch (err) {
    console.error("state-config error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
