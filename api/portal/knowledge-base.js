// PA CROP Services — Knowledge Base
// 25 real articles covering every question a PA business owner has.
// Served statically — no database needed. Searchable by the portal.

import { setCors } from '../services/auth.js';

const ARTICLES = [
  {
    id: 'what-is-crop',
    category: 'basics',
    title: 'What is a CROP (Commercial Registered Office Provider)?',
    summary: 'A CROP is a licensed service provider that serves as your registered office address in Pennsylvania.',
    content: 'Under 15 Pa. C.S. § 109, a Commercial Registered Office Provider (CROP) is a licensed entity that provides registered office addresses for Pennsylvania business entities. Think of it as Pennsylvania\'s version of a "registered agent" — but with specific licensing requirements. Every PA business entity must maintain a registered office address where it can receive legal documents and government notices. A CROP handles this for you professionally, ensuring nothing gets missed. PA CROP Services holds this license and operates from 924 W 23rd St, Erie, PA 16502.',
    tags: ['crop', 'registered agent', 'registered office', 'basics']
  },
  {
    id: 'annual-report-overview',
    category: 'annual-reports',
    title: 'PA Annual Report: Everything You Need to Know',
    summary: 'Starting in 2025, all PA business entities must file an annual report. Here\'s what you need to know.',
    content: 'Act 122 of 2022 introduced annual reporting requirements for Pennsylvania business entities, effective starting in 2025. Every domestic and foreign business entity — corporations, LLCs, LPs, LLPs, professional associations, and business trusts — must file an annual report with the PA Department of State. The filing fee is $7 for most entities. Nonprofit corporations and entities with a not-for-profit purpose are exempt from the fee but must still file. File online at file.dos.pa.gov using form DSCB:15-146.',
    tags: ['annual report', 'filing', 'act 122', 'requirements']
  },
  {
    id: 'deadlines-by-entity',
    category: 'annual-reports',
    title: 'Annual Report Deadlines by Entity Type',
    summary: 'Corporations: June 30. LLCs: September 30. LPs, LLPs, trusts: December 31.',
    content: 'Pennsylvania annual report deadlines vary by entity type. Corporations (domestic and foreign, business and nonprofit) must file by June 30 each year. LLCs (domestic and foreign) must file by September 30. All other entities — limited partnerships, limited liability partnerships, professional associations, and business trusts — must file by December 31. These deadlines apply every year starting in 2025. There is no extension process. Source: PA Department of State, 15 Pa. C.S. § 146.',
    tags: ['deadline', 'due date', 'corporation', 'llc', 'lp', 'entity type']
  },
  {
    id: 'what-happens-miss-deadline',
    category: 'enforcement',
    title: 'What Happens If You Miss Your Annual Report Deadline?',
    summary: 'Starting with 2027 reports, missing the deadline leads to dissolution, termination, or cancellation.',
    content: 'For the 2025 and 2026 reporting years, PA DOS has indicated there will be a grace period — no enforcement action for late filing. Starting with the 2027 reporting year, failure to file will result in administrative action approximately six months after the entity-type deadline. For domestic entities, this means administrative dissolution — but you can reinstate. For foreign entities, this means administrative termination of authority to do business in PA, and you CANNOT reinstate. Foreign entities would need to re-register as a new foreign entity, losing continuity. This makes compliance especially critical for foreign-registered entities.',
    tags: ['missed deadline', 'dissolution', 'termination', 'enforcement', 'penalty', 'reinstatement']
  },
  {
    id: 'filing-fee',
    category: 'annual-reports',
    title: 'How Much Does the Annual Report Cost?',
    summary: 'The filing fee is $7 for most entities. Nonprofits are exempt from the fee.',
    content: 'The Pennsylvania annual report filing fee is $7 for all entity types. Nonprofit corporations and LLCs/LPs with a not-for-profit purpose are exempt from the fee, but they must still file the report. There are no additional processing fees when filing online at file.dos.pa.gov. PA CROP Services does not charge extra for filing reminders — they are included in every plan.',
    tags: ['fee', 'cost', 'price', '$7', 'nonprofit', 'exempt']
  },
  {
    id: 'how-to-file',
    category: 'annual-reports',
    title: 'How to File Your PA Annual Report (Step by Step)',
    summary: 'File online at file.dos.pa.gov in about 5 minutes. Here are the exact steps.',
    content: 'Step 1: Go to file.dos.pa.gov. Step 2: Search for your entity by name or Department of State file number. Step 3: Select "Annual Report" as the filing type. Step 4: Verify your entity information — especially your registered office address. Step 5: Pay the $7 filing fee by credit card. Step 6: Save your confirmation number immediately. The entire process takes about 5 minutes. If your plan includes managed filing (Business Pro or Empire), we handle this for you automatically.',
    tags: ['how to file', 'steps', 'instructions', 'file.dos.pa.gov']
  },
  {
    id: 'service-of-process',
    category: 'legal',
    title: 'What is Service of Process and Why Does It Matter?',
    summary: 'Service of process is the legal delivery of court documents. Missing it can result in a default judgment.',
    content: 'Service of process is the formal delivery of legal documents (like a lawsuit) to a business entity. In Pennsylvania, these documents are delivered to the entity\'s registered office address. If you miss a service of process, you may not know you\'re being sued, and the court can enter a default judgment against you — meaning you lose without ever getting to present your side. This is why having a reliable registered office provider is critical. PA CROP Services scans and classifies all incoming documents, and service of process triggers an immediate critical alert with same-day notification.',
    tags: ['service of process', 'lawsuit', 'legal', 'court', 'default judgment']
  },
  {
    id: 'domestic-vs-foreign',
    category: 'entity-types',
    title: 'Domestic vs. Foreign Entity: What\'s the Difference?',
    summary: 'Domestic = formed in PA. Foreign = formed elsewhere but registered to do business in PA.',
    content: 'A domestic entity is one that was originally formed (incorporated, organized, etc.) in Pennsylvania. A foreign entity is one that was formed in another state or country but has registered to do business in Pennsylvania. This distinction matters for compliance because: (1) deadlines are the same for both domestic and foreign versions of the same entity type, (2) enforcement consequences differ — domestic entities face dissolution but CAN reinstate, while foreign entities face termination and CANNOT reinstate. Foreign entities would need to re-register as a new entity, losing continuity of registration.',
    tags: ['domestic', 'foreign', 'entity type', 'difference', 'reinstatement']
  },
  {
    id: 'change-registered-office',
    category: 'registered-office',
    title: 'How to Change Your Registered Office Address',
    summary: 'File a change of registered office form with PA DOS, or let us handle the paperwork.',
    content: 'To change your registered office to PA CROP Services (or to any new address), you need to file a Statement of Change of Registered Office (DSCB:15-108/8108) with the PA Department of State. The filing fee is $70. You can file online at file.dos.pa.gov. Once filed, your entity record will reflect the new registered office address. If you sign up for PA CROP Services, we handle this filing for you as part of the onboarding process — the address changes to 924 W 23rd St, Erie, PA 16502.',
    tags: ['change address', 'registered office', 'move', 'DSCB:15-108']
  },
  {
    id: 'reinstatement',
    category: 'enforcement',
    title: 'How to Reinstate a Dissolved PA Entity',
    summary: 'Domestic entities can reinstate after dissolution. Foreign entities cannot — they must re-register.',
    content: 'If your domestic Pennsylvania entity has been administratively dissolved for failure to file, you can apply for reinstatement by filing the required annual reports and paying all outstanding fees. The reinstatement process is handled through the PA Department of State. However, foreign entities that have been administratively terminated CANNOT reinstate. If your foreign entity is terminated, you must re-register as a new foreign entity, which means a new registration date and potential gaps in your authority to do business. This is why compliance is especially important for foreign-registered entities.',
    tags: ['reinstatement', 'reinstate', 'dissolved', 'terminated', 'restore']
  },
  {
    id: 'what-plans-include',
    category: 'plans',
    title: 'What\'s Included in Each PA CROP Plan?',
    summary: 'Every plan includes a registered office address and compliance monitoring. Higher tiers add filing, hosting, and more.',
    content: 'Compliance Only ($99/yr): Registered office address, mail handling, 5 deadline reminders, entity monitoring, compliance dashboard, AI assistant. Business Starter ($199/yr): Everything above plus a domain name, 5 email mailboxes, website hosting with SSL, a 1-page business website. Business Pro ($349/yr): Everything above plus managed annual report filing (we file for you), up to 3 entities, direct phone line, 5-page website. Business Empire ($699/yr): Everything above plus up to 10 entities, dedicated VPS hosting, 3 websites, 2 free notarizations per year.',
    tags: ['plans', 'pricing', 'what is included', 'features', 'tiers']
  },
  {
    id: 'grace-period',
    category: 'enforcement',
    title: 'Is There a Grace Period for Annual Reports?',
    summary: 'Yes — 2025 and 2026 reports have a grace period. Enforcement begins with 2027 reports.',
    content: 'The PA Department of State has indicated that for the 2025 and 2026 reporting years, there will be no enforcement action for late filings. This grace period gives entities time to adjust to the new annual reporting requirement. However, starting with the 2027 reporting year, entities that fail to file will face administrative action — dissolution for domestic entities, termination for foreign entities — approximately six months after the entity-type deadline. We strongly recommend filing on time even during the grace period to establish good compliance habits.',
    tags: ['grace period', '2025', '2026', '2027', 'enforcement', 'no penalty']
  },
  {
    id: 'what-is-dos-number',
    category: 'basics',
    title: 'What is a PA DOS File Number?',
    summary: 'Your DOS file number is your entity\'s unique identifier with the PA Department of State.',
    content: 'When you form or register a business entity in Pennsylvania, the Department of State assigns it a unique file number (also called an entity number). This number is used to look up your entity, file annual reports, and track your compliance status. You can find your DOS number on your original formation documents, on the PA DOS business entity search at file.dos.pa.gov, or in your PA CROP portal.',
    tags: ['dos number', 'file number', 'entity number', 'lookup']
  },
  {
    id: 'llc-annual-report',
    category: 'annual-reports',
    title: 'PA LLC Annual Report Guide',
    summary: 'Pennsylvania LLCs must file by September 30 each year. Fee: $7.',
    content: 'If you have a domestic or foreign LLC registered in Pennsylvania, your annual report deadline is September 30 each year, starting in 2025. The filing fee is $7 (exempt for not-for-profit LLCs). File online at file.dos.pa.gov. The report confirms your entity\'s basic information: name, registered office address, and other details. Starting with the 2027 reporting year, failure to file could lead to administrative dissolution (domestic) or termination (foreign).',
    tags: ['llc', 'september 30', 'filing', 'limited liability company']
  },
  {
    id: 'corporation-annual-report',
    category: 'annual-reports',
    title: 'PA Corporation Annual Report Guide',
    summary: 'Pennsylvania corporations must file by June 30 each year. Fee: $7 (nonprofits exempt).',
    content: 'If you have a domestic or foreign corporation registered in Pennsylvania — whether business or nonprofit — your annual report deadline is June 30 each year, starting in 2025. The filing fee is $7 for business corporations. Nonprofit corporations are exempt from the fee but must still file. File online at file.dos.pa.gov. Starting with the 2027 reporting year, failure to file could lead to administrative dissolution (domestic) or termination (foreign).',
    tags: ['corporation', 'corp', 'june 30', 'nonprofit', 'business corporation']
  },
  {
    id: 'lp-llp-annual-report',
    category: 'annual-reports',
    title: 'PA LP/LLP Annual Report Guide',
    summary: 'Limited partnerships and LLPs must file by December 31 each year. Fee: $7.',
    content: 'If you have a limited partnership (LP), limited liability partnership (LLP), professional association, or business trust registered in Pennsylvania, your annual report deadline is December 31 each year, starting in 2025. The filing fee is $7. File online at file.dos.pa.gov. These entity types have the latest deadline of the three groups (corps June 30, LLCs Sept 30, all others Dec 31).',
    tags: ['lp', 'llp', 'limited partnership', 'december 31', 'professional association', 'business trust']
  },
  {
    id: 'document-types',
    category: 'documents',
    title: 'Types of Documents We Receive at Your Registered Office',
    summary: 'We handle service of process, government notices, tax notices, and general business mail.',
    content: 'As your registered office provider, we receive and process several types of documents on your behalf: Service of Process (lawsuits, subpoenas, court orders) — these get CRITICAL urgency and immediate notification. Government Correspondence (PA DOS notices, Secretary of State communications) — HIGH urgency. Tax Notices (IRS notices, PA Department of Revenue) — HIGH urgency. Annual Report Reminders — MEDIUM urgency. General Business Mail — NORMAL urgency. Every document is scanned, AI-classified, and uploaded to your portal within one business day.',
    tags: ['documents', 'mail', 'service of process', 'tax notice', 'government', 'types']
  },
  {
    id: 'act-122',
    category: 'legal',
    title: 'Understanding Act 122 of 2022',
    summary: 'Act 122 created the annual reporting requirement and modernized PA entity law.',
    content: 'Act 122 of 2022 (signed into law November 2022) is the most significant update to Pennsylvania business entity law in decades. Key changes: (1) New annual reporting requirement for all business entities starting 2025. (2) Modernized the Associations Code (Title 15). (3) Created entity-type-specific deadlines (June 30 for corps, Sept 30 for LLCs, Dec 31 for others). (4) Established dissolution/termination as enforcement for non-filing starting 2027. (5) Set the filing fee at $7. The full text is codified at 15 Pa. C.S. § 146.',
    tags: ['act 122', 'law', 'legislation', '2022', 'associations code', 'title 15']
  },
  {
    id: 'managed-filing',
    category: 'plans',
    title: 'How Does Managed Filing Work?',
    summary: 'On Business Pro and Empire plans, we file your annual report for you. Here\'s the process.',
    content: 'If you are on the Business Pro or Business Empire plan, your annual report filing is included in your subscription. Here is how it works: (1) We gather your entity information from PA DOS records. (2) We prepare the filing using your current registered office address and entity details. (3) We submit the filing at file.dos.pa.gov and pay the $7 fee. (4) We upload the confirmation to your portal. (5) You receive a notification confirming the filing is complete. The entire process is tracked in your portal\'s Filing Progress section so you can see exactly where things stand.',
    tags: ['managed filing', 'we file for you', 'pro plan', 'empire plan', 'included']
  },
  {
    id: 'registered-office-vs-principal',
    category: 'registered-office',
    title: 'Registered Office vs. Principal Office: What\'s the Difference?',
    summary: 'Your registered office receives legal documents. Your principal office is where you actually work.',
    content: 'These are two different addresses that serve different purposes. Your registered office is the address on file with PA DOS where legal documents (service of process, government notices) are delivered. It does not need to be where you physically work. Your principal office (or principal place of business) is where you actually conduct business operations. Many business owners use their home address as their principal office but use a CROP like PA CROP Services as their registered office for privacy, reliability, and professional handling of legal documents.',
    tags: ['registered office', 'principal office', 'address', 'difference', 'home address']
  },
  {
    id: 'privacy-benefits',
    category: 'registered-office',
    title: 'Privacy Benefits of Using a CROP',
    summary: 'Keep your home address off public records by using our registered office address.',
    content: 'When you use PA CROP Services as your registered office, our address (924 W 23rd St, Erie, PA 16502) appears on your public PA DOS filing instead of your personal home address. This provides several benefits: (1) Your home address is not in the public business entity database. (2) Process servers deliver documents to our office, not your home. (3) Government notices come to us for professional handling. (4) Your personal information is better protected. This is especially valuable for home-based businesses and solo practitioners.',
    tags: ['privacy', 'home address', 'public records', 'personal information']
  },
  {
    id: 'switching-to-crop',
    category: 'getting-started',
    title: 'How to Switch to PA CROP Services',
    summary: 'Sign up, we file the change of address, and you\'re covered in about a week.',
    content: 'Switching to PA CROP Services is straightforward: (1) Sign up for a plan at pacropservices.com. (2) Provide your entity details (name, DOS number, entity type). (3) We file the change of registered office with PA DOS ($70 fee included in onboarding). (4) PA DOS processes the change (typically 3-5 business days). (5) Your entity record now shows our address. (6) We start receiving and processing your mail and legal documents. You can monitor everything in your client portal from day one.',
    tags: ['switch', 'sign up', 'onboarding', 'getting started', 'change provider']
  },
  {
    id: 'what-if-sued',
    category: 'legal',
    title: 'What Happens When Your Entity Gets Sued?',
    summary: 'We receive the service of process, classify it as critical, and notify you immediately.',
    content: 'If someone files a lawsuit against your entity, the legal documents (complaint and summons) are served at your registered office address. Here is what happens with PA CROP Services: (1) We receive the service of process at our office. (2) Our system immediately classifies it as CRITICAL urgency. (3) You receive an immediate notification by email (and SMS if on Pro/Empire). (4) The documents are scanned and uploaded to your portal within hours. (5) A red alert appears on your dashboard with "Contact your attorney" guidance. (6) The response deadline is tracked in your portal. We do NOT provide legal advice — our job is to ensure you know immediately so you can engage your attorney.',
    tags: ['sued', 'lawsuit', 'service of process', 'what to do', 'attorney', 'critical']
  },
  {
    id: 'tax-notices',
    category: 'documents',
    title: 'Tax Notices Received at Your Registered Office',
    summary: 'IRS and PA Revenue notices sometimes come to your registered office. We flag them as high priority.',
    content: 'While most tax notices go to your principal business address or your CPA, some may arrive at your registered office — especially if your entity formation documents list it as a correspondence address. When we receive a tax notice, it is classified as HIGH urgency and you are notified promptly. We recommend keeping your CPA or tax advisor informed. If you would like tax notices routed directly to your accountant, you can set this up in your Communication Preferences in the portal.',
    tags: ['tax notice', 'irs', 'pa revenue', 'accountant', 'cpa']
  },
  {
    id: 'multi-entity-management',
    category: 'plans',
    title: 'Managing Multiple Entities with PA CROP',
    summary: 'Business Pro supports 3 entities, Empire supports 10. All share one portal.',
    content: 'If you operate multiple Pennsylvania business entities, PA CROP Services can serve as the registered office for all of them from a single portal. Business Pro plan supports up to 3 entities. Business Empire plan supports up to 10 entities. Each entity gets its own compliance tracking, obligation timeline, document inbox, and health score. You can switch between entities using the entity selector in the portal sidebar. All entities share the same account login and billing. This is particularly valuable for holding companies, real estate investors, and professionals with multiple business lines.',
    tags: ['multi-entity', 'multiple entities', 'holding company', 'portfolio', 'pro plan', 'empire plan']
  }
];

const CATEGORIES = {
  basics: { label: 'Getting Started', icon: '📘' },
  'annual-reports': { label: 'Annual Reports', icon: '📋' },
  enforcement: { label: 'Enforcement & Penalties', icon: '⚠️' },
  'entity-types': { label: 'Entity Types', icon: '🏢' },
  'registered-office': { label: 'Registered Office', icon: '📬' },
  legal: { label: 'Legal Topics', icon: '⚖️' },
  documents: { label: 'Documents & Mail', icon: '📄' },
  plans: { label: 'Plans & Services', icon: '💼' },
  'getting-started': { label: 'Getting Started', icon: '🚀' }
};

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q, category, id } = req.query;

  // Single article by ID
  if (id) {
    const article = ARTICLES.find(a => a.id === id);
    if (!article) return res.status(404).json({ success: false, error: 'not_found' });
    return res.status(200).json({ success: true, article });
  }

  let results = [...ARTICLES];

  // Filter by category
  if (category) {
    results = results.filter(a => a.category === category);
  }

  // Search by query
  if (q) {
    const terms = q.toLowerCase().split(/\s+/);
    results = results.filter(a => {
      const text = `${a.title} ${a.summary} ${a.content} ${a.tags.join(' ')}`.toLowerCase();
      return terms.every(t => text.includes(t));
    });
  }

  // Full article objects (including content) are returned so the portal can
  // render them inline per CLAUDE.md ("rendered inline on the portal — no
  // external links or popups"). 25 articles is small enough to ship in one
  // response; revisit if the catalog grows past ~50.
  return res.status(200).json({
    success: true,
    data: { articles: results, categories: CATEGORIES },
    articles: results,
    categories: CATEGORIES,
    total: results.length
  });
}

export { ARTICLES, CATEGORIES };
