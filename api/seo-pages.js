// PA CROP Services — Programmatic SEO Page Generator
// GET /api/seo-pages?key=ADMIN&type=entity_types|services|questions
// Generates long-tail SEO page content for programmatic indexing

const PAGE_TYPES = {
  entity_types: [
    { title: 'PA LLC Registered Office Service', slug: 'llc-registered-office-pa', keywords: ['PA LLC registered office', 'LLC CROP service Pennsylvania'] },
    { title: 'PA Corporation Registered Office', slug: 'corporation-registered-office-pa', keywords: ['PA corporation registered office', 'corporate CROP service'] },
    { title: 'Foreign LLC Registered Office in PA', slug: 'foreign-llc-registered-office-pa', keywords: ['foreign LLC PA registered office', 'out of state LLC PA'] },
    { title: 'PA Limited Partnership Registered Office', slug: 'lp-registered-office-pa', keywords: ['LP registered office PA', 'limited partnership CROP'] },
    { title: 'PA Nonprofit Registered Office', slug: 'nonprofit-registered-office-pa', keywords: ['PA nonprofit registered office', 'nonprofit CROP service'] },
  ],
  services: [
    { title: 'Annual Report Filing Service PA', slug: 'annual-report-filing-service-pa', keywords: ['PA annual report filing', 'file annual report Pennsylvania'] },
    { title: 'PA Entity Compliance Monitoring', slug: 'entity-compliance-monitoring-pa', keywords: ['PA entity monitoring', 'compliance monitoring service'] },
    { title: 'Service of Process Forwarding PA', slug: 'service-of-process-pa', keywords: ['service of process PA', 'legal document forwarding'] },
    { title: 'PA Business Mail Scanning Service', slug: 'business-mail-scanning-pa', keywords: ['PA mail scanning', 'registered office mail forwarding'] },
  ],
  questions: [
    { title: 'What is a CROP in Pennsylvania?', slug: 'what-is-crop-pennsylvania', keywords: ['what is CROP PA', 'commercial registered office provider'] },
    { title: 'How to Change Your PA Registered Office', slug: 'change-registered-office-pa', keywords: ['change registered office PA', 'DSCB 15-108'] },
    { title: 'PA Annual Report Filing Deadline Guide', slug: 'pa-annual-report-deadline', keywords: ['PA annual report deadline', 'when is annual report due PA'] },
    { title: 'What Happens When a PA Entity is Dissolved', slug: 'pa-entity-dissolution-guide', keywords: ['PA entity dissolution', 'what happens dissolved LLC PA'] },
    { title: 'PA Registered Office vs Registered Agent', slug: 'registered-office-vs-agent-pa', keywords: ['registered office vs agent PA', 'CROP vs registered agent'] },
  ]
};

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_SECRET_KEY)) return res.status(401).json({ error: 'Unauthorized' });

  const type = req.query?.type;
  const generate = req.query?.generate === 'true';
  const GROQ_KEY = process.env.GROQ_API_KEY;

  if (!type) return res.status(200).json({ success: true, types: Object.keys(PAGE_TYPES), totalPages: Object.values(PAGE_TYPES).flat().length });

  const pages = PAGE_TYPES[type];
  if (!pages) return res.status(400).json({ error: `Invalid type. Use: ${Object.keys(PAGE_TYPES).join(', ')}` });

  if (!generate) return res.status(200).json({ success: true, type, pages, count: pages.length });

  // Generate content for first 3 pages
  const generated = [];
  for (const page of pages.slice(0, 3)) {
    if (GROQ_KEY) {
      try {
        const genRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile', max_tokens: 600,
            messages: [
              { role: 'system', content: 'Write SEO-optimized content for a PA CROP service page. 300 words. Include: H1, intro paragraph, 3 key points, CTA. Professional and authoritative. Include relevant PA statutes.' },
              { role: 'user', content: `Page: "${page.title}"\nKeywords: ${page.keywords.join(', ')}` }
            ]
          })
        });
        const content = (await genRes.json())?.choices?.[0]?.message?.content || '';
        generated.push({ ...page, content: content.slice(0, 2000), wordCount: content.split(/\s+/).length });
      } catch(e) { generated.push({ ...page, error: e.message }); }
    }
  }

  return res.status(200).json({ success: true, type, generated, remaining: Math.max(0, pages.length - 3) });
}
