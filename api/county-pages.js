// PA CROP Services — PA County Landing Page Generator
// GET /api/county-pages?key=ADMIN&county=Adams (single)
// GET /api/county-pages?key=ADMIN&all=true (generate all 67)
// Generates SEO landing pages for each PA county

const PA_COUNTIES = [
  'Adams','Allegheny','Armstrong','Beaver','Bedford','Berks','Blair','Bradford','Bucks','Butler',
  'Cambria','Cameron','Carbon','Centre','Chester','Clarion','Clearfield','Clinton','Columbia','Crawford',
  'Cumberland','Dauphin','Delaware','Elk','Erie','Fayette','Forest','Franklin','Fulton','Greene',
  'Huntingdon','Indiana','Jefferson','Juniata','Lackawanna','Lancaster','Lawrence','Lebanon','Lehigh','Luzerne',
  'Lycoming','McKean','Mercer','Mifflin','Monroe','Montgomery','Montour','Northampton','Northumberland','Perry',
  'Philadelphia','Pike','Potter','Schuylkill','Snyder','Somerset','Sullivan','Susquehanna','Tioga','Union',
  'Venango','Warren','Washington','Wayne','Westmoreland','Wyoming','York'
];

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_SECRET_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const GROQ_KEY = process.env.GROQ_API_KEY;
  const county = req.query?.county;
  const all = req.query?.all === 'true';

  if (!county && !all) {
    return res.status(200).json({ counties: PA_COUNTIES, total: PA_COUNTIES.length, usage: '?county=Erie or ?all=true' });
  }

  const counties = all ? PA_COUNTIES : [county];
  const results = { generated: [], errors: [] };

  for (const c of counties.slice(0, 5)) { // Cap at 5 per request to avoid timeout
    try {
      if (GROQ_KEY) {
        const genRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile', max_tokens: 600,
            messages: [
              { role: 'system', content: 'Write a concise (200 word) landing page paragraph for a PA CROP (registered office) service targeting businesses in a specific PA county. Include: county-specific business environment, why they need a CROP, connection to Erie PA office. Professional, helpful tone. Do NOT make up statistics.' },
              { role: 'user', content: `Write for ${c} County, Pennsylvania businesses needing a registered office provider.` }
            ]
          })
        });
        const genData = await genRes.json();
        const content = genData?.choices?.[0]?.message?.content || '';
        const slug = `registered-office-${c.toLowerCase().replace(/\s+/g, '-')}-county-pa`;
        
        results.generated.push({ county: c, slug, contentLength: content.length, preview: content.slice(0, 150) + '...' });
      }
    } catch (e) {
      results.errors.push({ county: c, error: e.message });
    }
  }

  return res.status(200).json({ success: true, ...results, remaining: all ? PA_COUNTIES.length - 5 : 0 });
}
