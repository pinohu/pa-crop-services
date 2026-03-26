// PA CROP Services — Directory Business Lead-Gen Page Generator
// GET /api/directory-generator?key=ADMIN&type=crop|services|attorneys
// Generates directory page content using Brilliant Directories framework

const DIRECTORIES = {
  crop: { name:'FindMyCROP.com', desc:'Directory of all PA CROPs', listings:'~65 PA CROPs', revenue:'Premium listings $49/mo', leadGen:'Captures clients who find other CROPs but want to compare', bdLicense:1 },
  services: { name:'PABusinessServices.com', desc:'PA business service provider directory', listings:'Accountants, attorneys, CROPs, tax preparers, notaries', revenue:'Basic free, Featured $29/mo, Premium $99/mo', leadGen:'Cross-referral ecosystem feeds all Dynasty businesses', bdLicense:1 },
  attorneys: { name:'PABusinessAttorney.com', desc:'PA business attorneys directory', listings:'Business attorneys, corporate counsel, startup lawyers', revenue:'Free listing, Premium $79/mo with leads', leadGen:'Attorneys refer clients who need CROP services', bdLicense:1 },
  accountants: { name:'PABusinessCPA.com', desc:'PA accountants/CPAs directory', listings:'CPAs, bookkeepers, tax preparers', revenue:'Free listing, Premium $59/mo', leadGen:'CPAs recommend CROP to their business clients', bdLicense:1 },
};

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const type = req.query?.type;
  if (!type) return res.status(200).json({ success: true, directories: DIRECTORIES, totalBDLicensesNeeded: 4, bdLicensesAvailable: 100 });

  const dir = DIRECTORIES[type];
  if (!dir) return res.status(400).json({ success: false, error: `Type not found. Use: ${Object.keys(DIRECTORIES).join(', ')}` });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  let content = {};
  if (GROQ_KEY) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 600,
          messages: [
            { role: 'system', content: 'Generate homepage content for a PA business directory. Include: H1, value proposition, how it works (3 steps), listing tiers. Respond in JSON: {"h1":"headline","subheadline":"tagline","how_it_works":[{"step":1,"title":"title","desc":"description"}],"tiers":[{"name":"tier name","price":"price","features":["f1","f2"]}],"seo_title":"page title","seo_description":"meta description"}' },
            { role: 'user', content: `Generate content for: ${dir.name} — ${dir.desc}. Listings: ${dir.listings}. Revenue model: ${dir.revenue}` }
          ]
        })
      });
      const text = (await r.json())?.choices?.[0]?.message?.content || '';
      try { content = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) {}
    } catch(e) {}
  }

  return res.status(200).json({ success: true, directory: dir, content, bdSetup: {
    license: `Use 1 of 100 Brilliant Directories licenses`,
    domain: dir.name.toLowerCase(),
    steps: ['Register domain', 'Install BD on 20i hosting', 'Import directory template', 'Configure listing tiers + Stripe', 'Add initial 10-20 seed listings', 'Launch SEO + Google Ads campaign']
  }});
}
