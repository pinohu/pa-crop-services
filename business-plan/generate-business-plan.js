const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
        BorderStyle, WidthType, ShadingType, PageBreak, PageNumber,
        PositionalTab, PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
        TabStopType, TabStopPosition } = require('docx');

const BLUE = "1B4F8A";
const ACCENT = "534AB7";
const DARK = "2C2C2A";
const GRAY = "888780";
const LIGHT_BG = "F5F4F0";
const WHITE = "FFFFFF";

const border = { style: BorderStyle.SINGLE, size: 1, color: "D3D1C7" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text, bold: true, size: 32, font: "Arial", color: BLUE })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 }, children: [new TextRun({ text, bold: true, size: 26, font: "Arial", color: ACCENT })] });
}
function h3(text) {
  return new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text, bold: true, size: 22, font: "Arial", color: DARK })] });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 }, ...opts, children: [new TextRun({ text, size: 22, font: "Arial", color: opts.color || DARK })] });
}
function pb(label, value) {
  return new Paragraph({ spacing: { after: 80 }, children: [
    new TextRun({ text: label + ": ", bold: true, size: 22, font: "Arial", color: DARK }),
    new TextRun({ text: value, size: 22, font: "Arial", color: DARK })
  ]});
}
function bulletItem(text, ref) {
  return new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text, size: 22, font: "Arial", color: DARK })] });
}
function numItem(text, ref) {
  return new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text, size: 22, font: "Arial", color: DARK })] });
}

function makeRow(cells, isHeader = false) {
  return new TableRow({
    children: cells.map((text, i) => new TableCell({
      borders,
      margins: cellMargins,
      width: { size: Math.floor(9360 / cells.length), type: WidthType.DXA },
      shading: isHeader ? { fill: ACCENT, type: ShadingType.CLEAR } : (i % 2 === 0 ? {} : {}),
      children: [new Paragraph({ children: [new TextRun({ text: String(text), size: 20, font: "Arial", bold: isHeader, color: isHeader ? WHITE : DARK })] })]
    }))
  });
}

function makeTable(headers, rows) {
  const colW = Math.floor(9360 / headers.length);
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: headers.map(() => colW),
    rows: [makeRow(headers, true), ...rows.map(r => makeRow(r))]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: ACCENT },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers2", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers3", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets2", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets3", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets4", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets5", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets6", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets7", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [
    // COVER PAGE
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      children: [
        new Paragraph({ spacing: { before: 3000 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "DYNASTY EMPIRE", size: 48, bold: true, font: "Arial", color: ACCENT })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Pennsylvania CROP Business", size: 56, bold: true, font: "Arial", color: BLUE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: "Complete 360-Degree Business Plan", size: 32, font: "Arial", color: GRAY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 1 } }, children: [] }),
        new Paragraph({ spacing: { before: 200 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Commercial Registered Office Provider", size: 28, font: "Arial", color: DARK })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "A Recurring Revenue Compliance Business", size: 24, font: "Arial", color: GRAY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: "Target: $600K+ Annual Recurring Revenue", size: 26, bold: true, font: "Arial", color: ACCENT })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Prepared: March 2026", size: 22, font: "Arial", color: GRAY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Confidential \u2014 Dynasty Empire Holdings", size: 22, font: "Arial", color: GRAY })] }),
      ]
    },
    // MAIN CONTENT
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "PA CROP Business Plan \u2014 Dynasty Empire", size: 18, font: "Arial", color: GRAY, italics: true })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Page ", size: 18, font: "Arial", color: GRAY }), new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: GRAY })]
          })]
        })
      },
      children: [
        // 1. EXECUTIVE SUMMARY
        h1("1. Executive Summary"),
        p("This business plan details the launch of a Pennsylvania Commercial Registered Office Provider (CROP) business under the Dynasty Empire portfolio. A CROP is a state-registered entity that provides official registered office addresses for Pennsylvania business entities, serving as their point of contact with the Department of State for service of process and legal correspondence."),
        p("The opportunity is driven by three converging forces: Pennsylvania\u2019s 3.8 million registered business entities, the new annual reporting requirement effective January 2025 (replacing the former decennial report), and the 2027 dissolution deadline that threatens administrative dissolution for non-compliant entities. With only approximately 65 CROPs currently listed with the PA Department of State, the market is significantly undersupplied relative to demand."),
        p("Leveraging Dynasty Empire\u2019s existing technology infrastructure (136 SuiteDash licenses, 100 Brilliant Directories licenses, and 200+ automation tools), this business can operate at near-zero marginal cost per client with approximately 15 minutes of human labor per client per year. The target is $600K+ annual recurring revenue within 24 months through a multi-tier pricing strategy and white-label CPA/Attorney partnership program."),

        // 2. MARKET ANALYSIS
        h1("2. Market Analysis"),
        h2("2.1 Market Size and Dynamics"),
        p("Pennsylvania has over 3.8 million companies authorized to conduct business in the state, with approximately 170,000 new business applications filed annually. Every business entity registered with the PA Department of State must maintain either a physical registered office address or contract with a Commercial Registered Office Provider."),
        p("The total addressable market (TAM) for CROP services in Pennsylvania represents every registered entity that does not maintain its own physical office suitable for receiving service of process during business hours. Conservative estimates suggest 20-30% of all PA entities could benefit from CROP services, representing 760,000 to 1.14 million potential customers."),

        h2("2.2 The 2027 Catalyst"),
        p("Act 122 of 2022, signed by Governor Wolf on November 3, 2022, replaced Pennsylvania\u2019s decennial reporting requirement with annual reporting effective January 2025. This creates a multi-phase opportunity:"),
        bulletItem("2025-2026 (Grace Period): Entities must file annual reports but face no dissolution penalties for non-compliance. This is the education and acquisition window.", "bullets"),
        bulletItem("2027 (Enforcement): Entities that fail to file annual reports will be subject to administrative dissolution, termination, or cancellation six months after the due date. Foreign entities that fail to file cannot reinstate and must re-register under a new name.", "bullets"),
        bulletItem("Filing deadlines by entity type: Corporations by June 30, LLCs by September 30, all others by December 31.", "bullets"),
        p("This regulatory change creates urgency-driven demand for compliance services, and positions a CROP provider as a natural solution for businesses seeking to maintain good standing with minimal effort."),

        h2("2.3 Competitive Landscape"),
        p("The PA CROP market is fragmented across three segments:"),
        makeTable(
          ["Segment", "Examples", "Pricing", "Strengths", "Weaknesses"],
          [
            ["National players", "Northwest, Harbor, CT Corp", "$99-300/yr", "Multi-state, brand recognition", "Impersonal, no PA expertise, no bundles"],
            ["Local boutiques", "PACrop.com, law firms", "$49-200/yr", "PA-specific, affordable", "No technology, outdated sites, no portal"],
            ["Our position", "Dynasty CROP", "$79-299/yr", "Tech-first, partner program, bundles", "New entrant, building brand"],
          ]
        ),
        new Paragraph({ spacing: { after: 120 } }),
        p("The key gap in the market: no existing PA CROP provider offers a self-service client portal, automated compliance monitoring, white-label partner programs for CPAs/attorneys, or bundled services (notary, tax, formation). This is the Dynasty CROP positioning."),

        // 3. LEGAL AND REGULATORY FRAMEWORK
        new Paragraph({ children: [new PageBreak()] }),
        h1("3. Legal and Regulatory Framework"),
        h2("3.1 CROP Requirements Under PA Law"),
        p("Under 15 Pa.C.S. \u00A7 109, entities required to provide a registered office address may contract with a CROP and list the CROP\u2019s name in lieu of a registered office address. Key legal requirements:"),
        bulletItem("The CROP must file a Statement of Address of Commercial Registered Office with the PA Department of State.", "bullets2"),
        bulletItem("The CROP must maintain a physical street address in Pennsylvania (P.O. boxes are not acceptable).", "bullets2"),
        bulletItem("The CROP must be available during normal business hours to accept service of process.", "bullets2"),
        bulletItem("Prior to listing a CROP, the association must enter into a contract with the provider. Listing without a contract subjects the filer to civil and criminal penalties.", "bullets2"),
        bulletItem("CROPs may not be used for filings requiring a principal place of business (e.g., Fictitious Name registrations).", "bullets2"),
        bulletItem("A CROP is distinct from a Registered Agent. PA does not require designation of a Registered Agent, but a CROP may also serve as an agent authorized to receive service of process.", "bullets2"),

        h2("3.2 Entity Structure"),
        p("The CROP business will operate under an existing or new Pennsylvania LLC within the Dynasty Empire structure:"),
        pb("Operating entity", "New PA LLC (e.g., \u201CPA Registered Office Services, LLC\u201D)"),
        pb("Holding structure", "Wyoming holding company \u2192 PA operating LLC"),
        pb("Tax election", "S-Corp election once revenue exceeds $80K (self-employment tax savings)"),
        pb("Physical address", "Erie, PA (existing address)"),
        pb("State filing fee", "~$70-200 for CROP registration with PA DOS"),
        pb("Annual maintenance", "~$70-100/year CROP renewal + $7 annual report fee"),

        h2("3.3 Compliance Obligations"),
        makeTable(
          ["Obligation", "Frequency", "Deadline", "Penalty"],
          [
            ["PA Annual Report", "Annual", "Sept 30 (LLC)", "Dissolution after 2027"],
            ["CROP statement renewal", "As needed", "Update on address change", "Removal from list"],
            ["Service of process handling", "Ongoing", "During business hours", "Client exposure to default judgment"],
            ["Federal tax returns", "Annual", "March 15 (S-Corp)", "Failure-to-file penalties"],
            ["PA state tax", "Annual", "April 15", "Interest + penalties"],
          ]
        ),

        // 4. PRODUCTS AND PRICING
        new Paragraph({ children: [new PageBreak()] }),
        h1("4. Products and Pricing Strategy"),
        h2("4.1 Core Service Tiers"),
        makeTable(
          ["Feature", "Starter ($79/yr)", "Professional ($179/yr)", "Premium ($299/yr)", "Partner ($99/client/yr)"],
          [
            ["PA registered office address", "Yes", "Yes", "Yes", "Yes"],
            ["Service of process forwarding", "Mail", "Same-day scan", "Same-day scan", "Same-day scan"],
            ["Online client portal", "Yes", "Yes", "Yes", "White-label"],
            ["Annual report reminders", "Email only", "Email + SMS", "Email + SMS + call", "Automated"],
            ["Annual report filing", "No", "Assist ($50)", "Included", "Included"],
            ["Compliance calendar", "No", "Yes", "Yes", "Yes"],
            ["Business mailing address", "No", "Yes", "Yes", "Yes"],
            ["Mail forwarding", "No", "No", "Unlimited", "Add-on"],
            ["Notarization services", "No", "No", "2/year free", "Add-on"],
            ["Dedicated support", "Email", "Priority email", "Phone + rep", "Account manager"],
            ["Partner branding", "No", "No", "No", "Full white-label"],
          ]
        ),

        new Paragraph({ spacing: { after: 120 } }),
        h2("4.2 Add-On Revenue Streams"),
        makeTable(
          ["Service", "Price", "Cost", "Margin", "Volume Estimate (Year 1)"],
          [
            ["Annual report filing", "$50-100/entity", "$7 state fee", "86-93%", "400 filings"],
            ["Change of registered office", "$120", "$70 state fee", "42%", "50 changes"],
            ["LLC formation package", "$500-800", "$125 state fee", "75-84%", "30 formations"],
            ["Notarization", "$25/document", "$5 notary fee", "80%", "200 documents"],
            ["Virtual mailbox add-on", "$15/month", "~$2/month", "87%", "100 subscribers"],
            ["Compliance monitoring", "$10/month", "~$0 (automated)", "~100%", "200 subscribers"],
          ]
        ),

        new Paragraph({ spacing: { after: 120 } }),
        h2("4.3 Pricing Strategy Rationale"),
        p("Pricing is positioned in the mid-market: above the cheapest local providers ($49-100/yr) but significantly below national enterprise players ($200-300+/yr). The Professional tier at $179/yr is the anchor price, designed to be the most popular option through the decoy effect (Starter lacks key features, Premium costs significantly more). The Partner tier at $99/client/yr creates volume through CPA/attorney channels at a lower per-client price but higher aggregate revenue."),

        // 5. TECHNOLOGY AND AUTOMATION
        new Paragraph({ children: [new PageBreak()] }),
        h1("5. Technology and Automation Architecture"),
        h2("5.1 Technology Stack (Zero Marginal Cost)"),
        p("Every technology component leverages existing Dynasty Empire licenses, resulting in zero additional software costs:"),
        makeTable(
          ["Component", "Tool", "License Status", "Function"],
          [
            ["Client Portal + CRM", "SuiteDash", "136 licenses owned", "Onboarding, billing, tickets, e-sign, project management"],
            ["Marketing Website", "Vercel + Dynasty Developer", "Owned", "SEO-optimized marketing site with conversion funnels"],
            ["SEO Directory Layer", "Brilliant Directories", "100 licenses owned", "Search engine visibility and listing management"],
            ["Workflow Automation", "n8n", "Self-hosted", "Stripe webhooks, email sequences, deadline tracking"],
            ["Payment Processing", "Stripe", "Standard account", "Recurring billing, invoicing, partner payouts"],
            ["AI Operations", "Flint Agent", "Self-hosted", "Task routing, support triage, content generation"],
            ["Email Marketing", "SuiteDash + Acumbamail", "Owned", "Drip campaigns, newsletters, renewal reminders"],
            ["Document Management", "SuiteDash", "Included", "Scanned mail storage, e-signatures, contracts"],
          ]
        ),

        new Paragraph({ spacing: { after: 120 } }),
        h2("5.2 Client Lifecycle Automation"),
        h3("Onboarding Flow (Fully Automated)"),
        numItem("Customer visits website and selects pricing tier", "numbers"),
        numItem("Stripe processes payment and triggers SuiteDash webhook via n8n", "numbers"),
        numItem("SuiteDash creates client record, portal account, and sends welcome email with login credentials", "numbers"),
        numItem("Contract is auto-generated and presented for e-signature in the portal", "numbers"),
        numItem("Upon signing, client receives CROP information packet with instructions for updating their PA DOS filing", "numbers"),
        numItem("8-email onboarding sequence fires over 30 days (profile completion, filing guide, feature tutorials, feedback request)", "numbers"),
        numItem("Compliance calendar activates with deadline tracking based on entity type", "numbers"),
        numItem("Annual report reminders begin at 90/60/30/14/7 days before deadline", "numbers"),

        h3("Ongoing Operations (15 Minutes Per Client Per Year)"),
        p("The operational model is designed for extreme efficiency. The only manual touchpoints are: (1) receiving and scanning physical mail/service of process at the Erie office, (2) escalating complex compliance questions to the support team, and (3) quarterly review of partner account performance. Everything else is automated."),
        bulletItem("Mail receipt: Physical mail arrives at Erie office. Staff scans documents and uploads to SuiteDash portal. Client receives instant email notification with secure link.", "bullets3"),
        bulletItem("Annual report filing: For Premium tier clients, the system auto-populates the PA DOS online form with stored client data. Staff reviews and submits. Client receives confirmation.", "bullets3"),
        bulletItem("Renewal billing: Stripe processes annual renewals automatically. Failed payments trigger a 5-step dunning sequence (day 1, 3, 7, 14, 21).", "bullets3"),
        bulletItem("Partner onboarding: White-label partners bulk-upload client lists via CSV. n8n processes and creates SuiteDash accounts with partner branding.", "bullets3"),

        h2("5.3 SuiteDash Portal Configuration"),
        p("Each client gets a branded self-service portal with the following modules:"),
        bulletItem("Dashboard: Entity status, upcoming deadlines, recent documents, account summary", "bullets4"),
        bulletItem("Documents: Scanned mail, contracts, formation documents, annual report confirmations", "bullets4"),
        bulletItem("Compliance Calendar: All filing deadlines with countdown timers and reminder settings", "bullets4"),
        bulletItem("Tickets: Support request system with SLA tracking (24hr response for Premium)", "bullets4"),
        bulletItem("Billing: Invoice history, payment methods, plan upgrade/downgrade", "bullets4"),
        bulletItem("Knowledge Base: Self-service articles on PA compliance, annual reports, formation guides", "bullets4"),

        // 6. CUSTOMER ACQUISITION
        new Paragraph({ children: [new PageBreak()] }),
        h1("6. Customer Acquisition Strategy"),
        h2("6.1 Channel Mix and Priorities"),
        makeTable(
          ["Channel", "% of Clients (Target)", "CAC Estimate", "Timeline to Impact", "Priority"],
          [
            ["CPA/Attorney partnerships", "40%", "$10-20", "Months 2-4", "Highest"],
            ["SEO / organic search", "25%", "$0-15", "Months 4-8", "High"],
            ["Google Ads", "15%", "$30-50", "Immediate", "Medium"],
            ["Direct outreach", "12%", "$5-15", "Months 1-3", "Medium"],
            ["Referral program", "8%", "$15-25", "Months 3+", "Ongoing"],
          ]
        ),

        new Paragraph({ spacing: { after: 120 } }),
        h2("6.2 CPA/Attorney Partnership Program (Primary Channel)"),
        p("This is the single highest-leverage acquisition channel. The strategy:"),
        numItem("Identify 200+ CPA firms and business attorneys across Pennsylvania using LinkedIn, PA CPA Society directory, and PA Bar Association.", "numbers2"),
        numItem("Create a compelling white-label partner deck: \u201CAdd registered agent services to your practice with zero overhead. We handle everything, you keep the relationship.\u201D", "numbers2"),
        numItem("Offer: $99/client/year with the partner\u2019s branding on the client portal. Partner can mark up to their clients at $149-199 and pocket the difference.", "numbers2"),
        numItem("Provide co-marketing materials: email templates, social media posts, website badge, and client-facing FAQ.", "numbers2"),
        numItem("Onboard partner firms through a dedicated portal with bulk client upload, reporting dashboard, and commission tracking.", "numbers2"),
        p("Target: 10 partner firms in Year 1, each bringing 50-100 clients. At 10 firms x 75 avg clients x $99 = $74,250/year from partnerships alone. By Year 2 with 25 firms: $185,625."),

        h2("6.3 SEO Strategy"),
        p("Content pillars targeting high-intent keywords with minimal competition:"),
        bulletItem("Primary: \u201CPennsylvania registered agent\u201D, \u201CPA CROP service\u201D, \u201CPennsylvania registered office provider\u201D", "bullets5"),
        bulletItem("Urgency: \u201CPA annual report requirement 2025\u201D, \u201CPennsylvania business dissolution 2027\u201D, \u201CPA annual report filing deadline\u201D", "bullets5"),
        bulletItem("Long-tail: \u201CHow to file PA annual report\u201D, \u201CChange registered office Pennsylvania\u201D, \u201CPA LLC registered agent requirements\u201D", "bullets5"),
        bulletItem("Location: 67 county pages (\u201CRegistered agent in Erie County PA\u201D, \u201CAllegheny County CROP service\u201D, etc.)", "bullets5"),
        p("Content volume: 25 pillar articles (2,000+ words each) in months 1-3, then 4 articles/month ongoing. Expected organic traffic: 500+ visits/month by month 6, 2,000+/month by month 12."),

        h2("6.4 Google Ads Strategy"),
        makeTable(
          ["Campaign", "Keywords", "Monthly Budget", "Target CPA", "Expected Clients/Mo"],
          [
            ["High intent", "PA registered agent, PA CROP", "$200", "$40", "5"],
            ["Annual report urgency", "PA annual report filing", "$150", "$30", "5"],
            ["Remarketing", "Site visitors 7-30 days", "$100", "$20", "5"],
            ["Competitor targeting", "[competitor] + registered agent PA", "$50", "$50", "1"],
          ]
        ),

        new Paragraph({ spacing: { after: 120 } }),
        h2("6.5 Direct Outreach Strategy"),
        p("Leverage the PA DOS public database to identify entities without CROP coverage. Strategy:"),
        bulletItem("Scrape entities registered with self-designated addresses (home addresses, non-commercial locations)", "bullets6"),
        bulletItem("Send targeted email campaigns: \u201CYour PA business faces new annual reporting requirements. Starting in 2027, failure to file means automatic dissolution. We handle compliance for $79/year.\u201D", "bullets6"),
        bulletItem("LinkedIn outreach to business owners and formation attorneys", "bullets6"),
        bulletItem("Target: 5,000 contacts/month, 2% conversion rate = 100 new clients/month at scale", "bullets6"),

        // 7. FINANCIAL PROJECTIONS
        new Paragraph({ children: [new PageBreak()] }),
        h1("7. Financial Projections"),
        h2("7.1 Startup Costs"),
        makeTable(
          ["Item", "Cost", "Notes"],
          [
            ["PA LLC filing (if new entity)", "$125", "One-time, PA DOS"],
            ["CROP registration with PA DOS", "$70-200", "One-time filing"],
            ["Domain registration", "$12-50", "Annual"],
            ["Professional liability insurance", "$500-1,000", "Annual, E&O policy"],
            ["Initial Google Ads budget", "$500", "Month 1 testing"],
            ["Legal review of service agreement", "$500-1,000", "One-time, attorney review"],
            ["Office supplies (scanner, etc.)", "$200-500", "One-time"],
            ["Technology stack", "$0", "All existing Dynasty licenses"],
            ["TOTAL STARTUP", "$1,900-3,375", "Leveraging existing infrastructure"],
          ]
        ),

        new Paragraph({ spacing: { after: 120 } }),
        h2("7.2 Monthly Operating Costs"),
        makeTable(
          ["Item", "Monthly Cost", "Notes"],
          [
            ["Office overhead (allocated)", "$200", "Portion of existing Erie office"],
            ["Google Ads", "$500", "Scaling with revenue"],
            ["Stripe processing (2.9% + $0.30)", "Variable", "~3% of revenue"],
            ["Postage and mail forwarding", "$50-200", "Scales with client count"],
            ["Part-time staff (mail handling)", "$500-1,000", "Needed at 200+ clients"],
            ["Insurance", "$50-80", "Monthly amortized"],
            ["Miscellaneous", "$100", "Supplies, printing"],
            ["TOTAL MONTHLY (at 500 clients)", "~$1,600-2,200", "Before Stripe fees"],
          ]
        ),

        new Paragraph({ spacing: { after: 120 } }),
        h2("7.3 Revenue Projections (24 Months)"),
        makeTable(
          ["Month", "New Clients", "Total Clients", "MRR", "ARR Run Rate", "Notes"],
          [
            ["Month 3", "50", "50", "$620", "$7,440", "Soft launch, founding clients"],
            ["Month 6", "75", "225", "$2,800", "$33,600", "SEO traction, first partners"],
            ["Month 9", "100", "475", "$5,900", "$70,800", "Partners scaling, ads optimized"],
            ["Month 12", "125", "800", "$10,000", "$120,000", "Year 1 milestone"],
            ["Month 18", "150", "1,500", "$18,750", "$225,000", "Partner program at scale"],
            ["Month 24", "175", "2,500", "$31,250", "$375,000", "2027 urgency peak approaching"],
          ]
        ),

        new Paragraph({ spacing: { after: 120 } }),
        p("Note: These projections assume a blended average revenue per client of $150/year across all tiers and add-ons. The 2027 dissolution deadline will create an acceleration in months 18-30 as businesses scramble to ensure compliance. The conservative scenario above does not factor in the full urgency spike."),

        h2("7.4 Path to $600K ARR"),
        p("The $600K target requires approximately 4,000 clients at $150 average revenue, or 2,000 clients at $300 average (achievable with higher Professional/Premium mix and add-on adoption). Key assumptions:"),
        bulletItem("25 active CPA/attorney partners averaging 80 clients each = 2,000 partner clients at $99/client = $198,000", "bullets7"),
        bulletItem("1,200 direct clients at $179 average (60% Professional tier) = $214,800", "bullets7"),
        bulletItem("400 Premium clients at $299 = $119,600", "bullets7"),
        bulletItem("Annual report filing services: 1,500 filings at $50 = $75,000", "bullets7"),
        bulletItem("Total: $607,400 ARR", "bullets7"),

        h2("7.5 Unit Economics"),
        makeTable(
          ["Metric", "Value", "Benchmark"],
          [
            ["Customer Acquisition Cost (blended)", "$20-30", "Target <$50"],
            ["Lifetime Value (avg 5-year retention)", "$750", "5 x $150 avg"],
            ["LTV:CAC Ratio", "25-37:1", "Target >3:1"],
            ["Gross Margin", "85-92%", "SaaS benchmark: 70-80%"],
            ["Annual Churn Rate", "5-8%", "Target <10%"],
            ["Payback Period", "< 1 month", "Target <6 months"],
            ["Human Labor per Client per Year", "15 minutes", "Fully automated"],
          ]
        ),

        // 8. OPERATIONS
        new Paragraph({ children: [new PageBreak()] }),
        h1("8. Operations Manual"),
        h2("8.1 Daily Operations Checklist"),
        numItem("Check Erie office mail (physical mailbox check, 1x daily)", "numbers3"),
        numItem("Scan and upload any received service of process or legal documents to SuiteDash", "numbers3"),
        numItem("Review SuiteDash ticket queue for support requests (24hr SLA)", "numbers3"),
        numItem("Monitor Stripe dashboard for failed payments and chargebacks", "numbers3"),
        numItem("Review new client signups and verify onboarding completion", "numbers3"),

        h2("8.2 Service of Process Handling Protocol"),
        p("When service of process is received at the Erie office:"),
        numItem("Immediately log receipt: date, time, entity served, serving party, case details", "numbers3"),
        numItem("Scan document at 300 DPI minimum, save as PDF", "numbers3"),
        numItem("Upload to client\u2019s SuiteDash portal in \u201CLegal Documents\u201D folder", "numbers3"),
        numItem("Send immediate email notification to client with secure portal link", "numbers3"),
        numItem("For Premium clients: follow up with phone call within 2 hours", "numbers3"),
        numItem("If client unreachable after 48 hours: send certified mail to address on file", "numbers3"),
        numItem("Document all actions taken in SuiteDash activity log for liability protection", "numbers3"),

        h2("8.3 Staffing Plan"),
        makeTable(
          ["Client Count", "Staff Needed", "Roles", "Monthly Labor Cost"],
          [
            ["0-200", "Owner only", "All functions", "$0 (owner time)"],
            ["200-500", "1 part-time VA", "Mail handling, scanning, basic support", "$500-800"],
            ["500-1,000", "1 full-time + 1 part-time", "Operations manager + mail handler", "$3,000-4,000"],
            ["1,000-2,500", "2 full-time", "Ops manager + support specialist", "$5,000-7,000"],
            ["2,500+", "3 full-time", "Ops manager + support + partner manager", "$8,000-10,000"],
          ]
        ),

        // 9. RISK ANALYSIS
        new Paragraph({ children: [new PageBreak()] }),
        h1("9. Risk Analysis and Mitigation"),
        makeTable(
          ["Risk", "Probability", "Impact", "Mitigation"],
          [
            ["Missed service of process", "Low", "High", "Same-day scanning protocol, backup notification system, documented handling procedures"],
            ["PA changes CROP regulations", "Very Low", "Medium", "Monitor legislative changes, maintain attorney relationship, diversify services"],
            ["National player enters PA aggressively", "Medium", "Medium", "Differentiate on technology + local expertise + partner program + bundled services"],
            ["Client data breach", "Low", "High", "SuiteDash SOC 2 compliance, encrypted storage, regular security audits"],
            ["Key person dependency (owner)", "Medium", "High", "Document all SOPs, train backup staff, automate everything possible"],
            ["Slow client acquisition", "Medium", "Medium", "Multiple acquisition channels, adjust pricing, increase ad spend, expand partner outreach"],
            ["2027 deadline changes", "Very Low", "Medium", "Build sustainable value beyond compliance urgency, diversify into formation and tax services"],
          ]
        ),

        // 10. EXIT STRATEGY
        new Paragraph({ spacing: { before: 200 } }),
        h1("10. Exit Strategy and Long-Term Vision"),
        h2("10.1 Exit Multiples"),
        p("Registered agent and compliance service businesses trade at 3-5x annual recurring revenue due to their predictable cash flows, high margins, low churn, and minimal capital requirements. At $600K ARR, the business would be valued at $1.8M to $3.0M for acquisition by national compliance companies such as CSC Global, CT Corporation, Wolters Kluwer, or private equity roll-ups in the compliance space."),

        h2("10.2 Long-Term Empire Integration"),
        p("The CROP business is not a standalone venture \u2014 it is the compliance layer of the Dynasty Empire directory portfolio. Integration opportunities include:"),
        bulletItem("Cross-sell CROP services to every directory client who has a PA business entity", "bullets2"),
        bulletItem("Bundle CROP with directory membership as a premium value-add", "bullets2"),
        bulletItem("Use CROP client relationships to drive referrals into other Dynasty businesses (TaxEar, Notroom, ToriMedia)", "bullets2"),
        bulletItem("Expand CROP services to neighboring states (Ohio, New York, New Jersey, Delaware) using the same technology infrastructure", "bullets2"),
        bulletItem("Build a national registered agent service by adding one state at a time, leveraging the SuiteDash/n8n automation that scales horizontally", "bullets2"),

        h2("10.3 The Endgame"),
        p("The PA CROP business represents the first proof-of-concept for a national compliance automation platform. The technology stack (SuiteDash + n8n + Flint AI) can serve registered agent functions in all 50 states with minimal incremental investment. At 10,000 clients across 5 states at $150 average, the business generates $1.5M ARR and commands a $4.5-7.5M exit valuation. This is a dynasty-scale asset that compounds over time with minimal ongoing capital requirements."),

        // APPENDIX
        new Paragraph({ children: [new PageBreak()] }),
        h1("Appendix A: CROP Service Agreement Template"),
        p("The following is an outline of the key terms for the CROP service agreement. This should be reviewed and finalized by a Pennsylvania business attorney before use."),
        bulletItem("Parties: PA Registered Office Services, LLC (\u201CProvider\u201D) and the Client Entity", "bullets3"),
        bulletItem("Services: Provider agrees to serve as Commercial Registered Office Provider under 15 Pa.C.S. \u00A7 109", "bullets3"),
        bulletItem("Address: Provider\u2019s registered office address in Erie, Pennsylvania", "bullets3"),
        bulletItem("Term: One (1) year from the effective date, auto-renewing unless cancelled 30 days prior to renewal", "bullets3"),
        bulletItem("Fee: As specified in the selected service tier, payable annually in advance", "bullets3"),
        bulletItem("Mail handling: Provider will forward or scan and upload all mail received on behalf of Client within one (1) business day", "bullets3"),
        bulletItem("Service of process: Provider will forward service of process immediately upon receipt via email notification and portal upload", "bullets3"),
        bulletItem("Limitation of liability: Provider\u2019s sole liability is limited to refunding the annual fee charged", "bullets3"),
        bulletItem("Not legal advice: This agreement does not constitute an attorney-client relationship", "bullets3"),
        bulletItem("Termination: Either party may terminate with 30 days written notice. Client is responsible for filing Change of Registered Office with PA DOS", "bullets3"),
        bulletItem("Governing law: Commonwealth of Pennsylvania", "bullets3"),

        new Paragraph({ spacing: { before: 200 } }),
        h1("Appendix B: First 30 Days Action Checklist"),
        numItem("Register domain name for CROP business website", "numbers2"),
        numItem("File CROP Statement of Address with PA Department of State", "numbers2"),
        numItem("Set up Stripe account with recurring billing enabled", "numbers2"),
        numItem("Configure SuiteDash: client portal, onboarding workflow, e-sign templates, ticket system", "numbers2"),
        numItem("Deploy marketing website on Vercel with Dynasty Developer theme", "numbers2"),
        numItem("Write and publish 5 foundational SEO articles (PA CROP explained, annual report guide, 2027 deadline, how to change registered office, CROP vs registered agent)", "numbers2"),
        numItem("Create service agreement template (attorney review)", "numbers2"),
        numItem("Design and print CROP service brochure for CPA/attorney outreach", "numbers2"),
        numItem("Set up Google Search Console and Analytics for the website", "numbers2"),
        numItem("Build n8n workflows: Stripe webhook \u2192 SuiteDash onboarding \u2192 email sequence", "numbers2"),
        numItem("Create partner program deck and outreach email templates", "numbers2"),
        numItem("Contact first 10 CPA firms in Erie/Pittsburgh/Philadelphia for partner conversations", "numbers2"),
        numItem("Set up Google Ads account with initial $500 budget across 3 campaigns", "numbers2"),
        numItem("Onboard first 5 founding clients from personal/professional network", "numbers2"),
        numItem("Submit CROP business to PA DOS published list of providers", "numbers2"),

        new Paragraph({ spacing: { before: 400 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 1 } }, children: [] }),
        new Paragraph({ spacing: { before: 200 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "End of Business Plan", size: 24, italics: true, font: "Arial", color: GRAY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Dynasty Empire \u2014 Building Generational Wealth Through Compliance Automation", size: 20, font: "Arial", color: ACCENT })] }),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/claude/pa-crop-business-plan.docx", buffer);
  console.log("Document created successfully: pa-crop-business-plan.docx");
});
