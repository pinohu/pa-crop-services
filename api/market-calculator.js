// PA CROP Services — Market Size Calculator by PA County
// GET /api/market-calculator?county=Erie (or ?all=true for summary)
// Estimates addressable market using PA entity density data

const PA_COUNTY_DATA = {
  'Adams':8200,'Allegheny':95000,'Armstrong':4500,'Beaver':11000,'Bedford':3200,
  'Berks':28000,'Blair':8500,'Bradford':4000,'Bucks':52000,'Butler':14000,
  'Cambria':9000,'Cameron':350,'Carbon':4200,'Centre':11000,'Chester':48000,
  'Clarion':2500,'Clearfield':5000,'Clinton':2400,'Columbia':4500,'Crawford':5500,
  'Cumberland':22000,'Dauphin':24000,'Delaware':42000,'Elk':2200,'Erie':18000,
  'Fayette':8000,'Forest':350,'Franklin':10000,'Fulton':900,'Greene':2200,
  'Huntingdon':2800,'Indiana':5500,'Jefferson':2800,'Juniata':1500,'Lackawanna':16000,
  'Lancaster':42000,'Lawrence':6000,'Lebanon':10000,'Lehigh':28000,'Luzerne':21000,
  'Lycoming':7500,'McKean':2800,'Mercer':7500,'Mifflin':2800,'Monroe':11000,
  'Montgomery':72000,'Montour':1200,'Northampton':22000,'Northumberland':5500,'Perry':3000,
  'Philadelphia':145000,'Pike':4000,'Potter':1100,'Schuylkill':8500,'Snyder':2500,
  'Somerset':4800,'Sullivan':400,'Susquehanna':2800,'Tioga':2800,'Union':3200,
  'Venango':3500,'Warren':2800,'Washington':14000,'Wayne':3500,'Westmoreland':24000,
  'Wyoming':1800,'York':34000
};

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {

  const county = req.query?.county;
  const all = req.query?.all === 'true';
  const CROP_ADOPTION_RATE = 0.02; // ~2% of entities use CROP services
  const AVG_REV_PER_CLIENT = 220;  // Blended average across tiers

  if (!county && !all) {
    return res.status(200).json({ counties: Object.keys(PA_COUNTY_DATA).sort(), total: Object.keys(PA_COUNTY_DATA).length });
  }

  if (county) {
    const entities = PA_COUNTY_DATA[county];
    if (!entities) return res.status(404).json({ error: `County "${county}" not found` });
    const cropMarket = Math.round(entities * CROP_ADOPTION_RATE);
    return res.status(200).json({
      success: true, county,
      estimatedEntities: entities,
      cropAdoptionRate: `${(CROP_ADOPTION_RATE * 100).toFixed(1)}%`,
      addressableMarket: cropMarket,
      potentialRevenue: cropMarket * AVG_REV_PER_CLIENT,
      competitorEstimate: Math.max(1, Math.round(cropMarket / 50)),
      marketNote: 'Estimates based on PA DOS filing data patterns. Actual numbers may vary.'
    });
  }

  // All counties summary
  const totalEntities = Object.values(PA_COUNTY_DATA).reduce((s,v) => s+v, 0);
  const totalMarket = Math.round(totalEntities * CROP_ADOPTION_RATE);
  const top10 = Object.entries(PA_COUNTY_DATA).sort((a,b) => b[1]-a[1]).slice(0,10).map(([name, count]) => ({
    county: name, entities: count, cropMarket: Math.round(count * CROP_ADOPTION_RATE), potential: Math.round(count * CROP_ADOPTION_RATE) * AVG_REV_PER_CLIENT
  }));

  return res.status(200).json({
    success: true,
    statewide: { totalEntities, totalCROPMarket: totalMarket, totalPotentialRevenue: totalMarket * AVG_REV_PER_CLIENT, counties: 67 },
    top10Markets: top10,
    note: 'Based on PA DOS filing patterns. Philadelphia alone represents ~15% of the addressable market.'
  });
  } catch (err) {
    console.error("market-calculator error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
