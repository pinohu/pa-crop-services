const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
        BorderStyle, WidthType, ShadingType, PageNumber, PageBreak } = require('docx');

const DARK = "2C2C2A";
const GRAY = "888780";
const ACCENT = "534AB7";
const border = { style: BorderStyle.SINGLE, size: 1, color: "D3D1C7" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

// ============================================================
// HELPERS
// ============================================================
function p(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [new TextRun({ text, size: 24, font: "Times New Roman", color: DARK })];
  return new Paragraph({ spacing: { after: 120, line: 276 }, ...opts, children: runs });
}
function b(text) { return new TextRun({ text, size: 24, font: "Times New Roman", color: DARK, bold: true }); }
function n(text) { return new TextRun({ text, size: 24, font: "Times New Roman", color: DARK }); }
function u(text) { return new TextRun({ text, size: 24, font: "Times New Roman", color: DARK, underline: {} }); }
function fillLine(label) {
  return p([b(label + ": "), n("________________________________________")]);
}
function blank() { return new Paragraph({ spacing: { after: 60 } }); }
function checkbox(text) {
  return new Paragraph({ spacing: { after: 80 }, children: [n("\u25A1  " + text)] });
}
function section(text) {
  return new Paragraph({ spacing: { before: 300, after: 150 }, children: [new TextRun({ text, size: 28, bold: true, font: "Times New Roman", color: DARK })] });
}
function h1(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text, size: 28, bold: true, font: "Times New Roman", color: DARK })] });
}
function center(text, size = 24, bold = false) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text, size, bold, font: "Times New Roman", color: DARK })] });
}
function nItem(text, ref) {
  return new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 80, line: 276 },
    children: Array.isArray(text) ? text : [n(text)] });
}

const pageProps = {
  page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
};

// ============================================================
// DOCUMENT 1: COVER LETTER TO BUREAU OF CORPORATIONS
// ============================================================
const doc1 = new Document({
  styles: { default: { document: { run: { font: "Times New Roman", size: 24 } } } },
  numbering: { config: [
    { reference: "nums", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
  ]},
  sections: [{
    properties: pageProps,
    children: [
      // DATE
      p("[YOUR NAME]"),
      p("[YOUR ADDRESS]"),
      p("[CITY, STATE ZIP]"),
      p("[PHONE NUMBER]"),
      p("[EMAIL ADDRESS]"),
      blank(),
      p(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })),
      blank(),
      p("Bureau of Corporations and Charitable Organizations"),
      p("Pennsylvania Department of State"),
      p("P.O. Box 8722"),
      p("Harrisburg, PA 17105-8722"),
      blank(),
      p([b("Re: Application to be Listed as a Commercial Registered Office Provider")]),
      p([b("Entity: "), n("[ENTITY NAME, e.g., Dynasty Compliance Services, LLC]")]),
      p([b("Entity Number: "), n("[ENTITY NUMBER — from your Certificate of Organization]")]),
      blank(),
      p("Dear Bureau of Corporations and Charitable Organizations:"),
      blank(),
      p("Pursuant to 15 Pa.C.S. \u00A7 109 (relating to name of commercial registered office provider in lieu of registered address) and 19 Pa. Code \u00A7 19.3, the undersigned respectfully requests that the above-referenced entity be added to the Department of State\u2019s official list of Commercial Registered Office Providers (CROPs) authorized to provide registered office services to Pennsylvania business entities."),
      blank(),
      p("The entity referenced above is a domestic limited liability company duly organized and in good standing under the laws of the Commonwealth of Pennsylvania. The entity maintains a physical office address in Erie County, Pennsylvania, which is open during normal business hours and staffed by a responsible adult authorized to accept service of process and official correspondence on behalf of client entities."),
      blank(),
      p([b("Statement of Address of Commercial Registered Office:")]),
      blank(),
      p([n("The address of the commercial registered office to be provided by the above-referenced entity is:")]),
      blank(),
      p([b("[YOUR STREET ADDRESS]")]),
      p([b("[ERIE, PA ZIP CODE]")]),
      p([b("County: Erie")]),
      blank(),
      p("Enclosed with this letter please find:"),
      nItem("This cover letter requesting CROP listing", "nums"),
      nItem("A completed Statement of Address of Commercial Registered Office Provider", "nums"),
      nItem("A check payable to the \u201CCommonwealth of Pennsylvania\u201D in the amount of $70.00 for the filing fee (if applicable)", "nums"),
      blank(),
      p("The undersigned affirms that the above-referenced entity will comply with all obligations of a Commercial Registered Office Provider under Pennsylvania law, including but not limited to:"),
      blank(),
      p("\u2022  Maintaining a physical office at the stated address during normal business hours;"),
      p("\u2022  Having a responsible person available to accept service of process and official correspondence;"),
      p("\u2022  Entering into written service agreements with all client entities before their filings reference this entity as their CROP;"),
      p("\u2022  Promptly forwarding all received documents to the applicable client entities."),
      blank(),
      p("If additional information, forms, or fees are required to complete this registration, please contact the undersigned at the address or phone number above."),
      blank(),
      p("Thank you for your prompt attention to this request."),
      blank(),
      blank(),
      p("Respectfully submitted,"),
      blank(),
      blank(),
      blank(),
      p("________________________________________"),
      p("[YOUR FULL NAME]"),
      p("Authorized Member/Manager"),
      p("[ENTITY NAME]"),
      blank(),
      blank(),
      p([n("Enclosures: (1) Statement of Address of Commercial Registered Office Provider")]),
      p([n("            (2) Filing fee (check)")]),
    ]
  }]
});

// ============================================================
// DOCUMENT 2: STATEMENT OF ADDRESS OF COMMERCIAL REGISTERED OFFICE
// ============================================================
const doc2 = new Document({
  styles: { default: { document: { run: { font: "Times New Roman", size: 24 } } } },
  sections: [{
    properties: pageProps,
    children: [
      center("COMMONWEALTH OF PENNSYLVANIA", 24, true),
      center("DEPARTMENT OF STATE", 24, true),
      center("BUREAU OF CORPORATIONS AND CHARITABLE ORGANIZATIONS", 20, true),
      blank(),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: DARK, space: 1 } }, children: [] }),
      blank(),
      center("STATEMENT OF ADDRESS OF", 28, true),
      center("COMMERCIAL REGISTERED OFFICE PROVIDER", 28, true),
      center("Pursuant to 15 Pa.C.S. \u00A7 109", 20),
      blank(),
      blank(),

      // Section 1
      p([b("1. Name of Entity Providing Commercial Registered Office Services:")]),
      blank(),
      p([n("   ___________________________________________________________________")]),
      p([n("   (Entity name exactly as registered with the Department of State)")]),
      blank(),

      // Section 2
      p([b("2. Entity Number: "), n("___________________________")]),
      blank(),

      // Section 3
      p([b("3. Entity Type (check one):")]),
      checkbox("Domestic Limited Liability Company"),
      checkbox("Domestic Business Corporation"),
      checkbox("Domestic Nonprofit Corporation"),
      checkbox("Foreign Limited Liability Company"),
      checkbox("Foreign Business Corporation"),
      checkbox("Other: ___________________________"),
      blank(),

      // Section 4
      p([b("4. Address of Commercial Registered Office:")]),
      blank(),
      p([n("   Street Address: ___________________________________________________")]),
      blank(),
      p([n("   City: ________________________  State: PA  ZIP: ___________________")]),
      blank(),
      p([n("   County: ___________________________")]),
      blank(),
      p([n("   (Must be an actual street address in Pennsylvania. P.O. boxes are not acceptable")]),
      p([n("    per 15 Pa.C.S. \u00A7 135(c).)")]),
      blank(),

      // Section 5
      p([b("5. Business Phone Number: "), n("(________) ________-____________")]),
      blank(),

      // Section 6
      p([b("6. Contact Email: "), n("___________________________________________________")]),
      blank(),

      // Section 7
      p([b("7. The undersigned entity affirms that:")]),
      blank(),
      p("   (a) The entity is duly organized and in good standing under the laws of the Commonwealth of Pennsylvania or is duly registered to do business in Pennsylvania;"),
      blank(),
      p("   (b) The entity maintains a physical office at the address stated above;"),
      blank(),
      p("   (c) The office is open during normal business hours with a responsible person available to accept service of process and official correspondence;"),
      blank(),
      p("   (d) The entity will enter into a written agreement with each client entity before that client lists this entity as its CROP on any filing with the Department of State;"),
      blank(),
      p("   (e) The entity will promptly forward all documents received on behalf of client entities."),
      blank(),
      blank(),

      // Signature
      p([b("IN TESTIMONY WHEREOF"), n(", the undersigned entity has caused this Statement to be executed by a duly authorized officer, member, or manager thereof this _______ day of _________________, 20_____.")]),
      blank(),
      blank(),
      blank(),
      p("________________________________________"),
      p("Name of Entity"),
      blank(),
      blank(),
      p("By: ________________________________________"),
      p("     Signature of Authorized Person"),
      blank(),
      p("Name (print): ________________________________________"),
      blank(),
      p("Title: ________________________________________"),
      blank(),
      blank(),

      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, border: { top: { style: BorderStyle.SINGLE, size: 2, color: GRAY, space: 1 } }, children: [] }),
      blank(),
      center("Mail completed form with filing fee to:", 20),
      center("Bureau of Corporations and Charitable Organizations", 20),
      center("P.O. Box 8722, Harrisburg, PA 17105-8722", 20),
      center("Phone: (717) 787-1057", 20),
    ]
  }]
});

// ============================================================
// DOCUMENT 3: FILING CHECKLIST AND INSTRUCTIONS
// ============================================================
const doc3 = new Document({
  styles: { default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: ACCENT },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 0 } },
    ]
  },
  numbering: { config: [
    { reference: "steps", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "steps2", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "steps3", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ]},
  sections: [{
    properties: pageProps,
    children: [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "PA CROP Registration \u2014 Complete Filing Guide", bold: true, size: 32, font: "Arial", color: ACCENT })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Everything you need to do, in order, to get on the official CROP list", size: 22, font: "Arial", color: GRAY })] }),

      // DECISION POINT
      new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "STEP 0: Do You Already Have a PA LLC?", size: 26, bold: true, font: "Arial", color: DARK })] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "If YES (you have an existing PA LLC you want to use as the CROP entity):", size: 22, font: "Arial", color: DARK })] }),
      new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "\u2192 Skip to Step 2. Fill in your existing entity name and entity number on all documents.", size: 22, font: "Arial", color: "059669" })] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "If NO (you need to form a new LLC first):", size: 22, font: "Arial", color: DARK })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "\u2192 Start at Step 1. Form the LLC first, wait for confirmation, then proceed to Step 2.", size: 22, font: "Arial", color: "DC2626" })] }),

      // STEP 1
      new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "STEP 1: Form the PA LLC (Skip if using existing entity)", size: 26, bold: true, font: "Arial", color: DARK })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps", level: 0 }, children: [new TextRun({ text: "Go to file.dos.pa.gov and log in with your Keystone Login account", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps", level: 0 }, children: [new TextRun({ text: "Click \u201CInitial Forms\u201D tab \u2192 \u201CCertificate of Organization \u2014 Domestic LLC\u201D (Form DSCB:15-8821)", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps", level: 0 }, children: [new TextRun({ text: "Entity name: Dynasty Compliance Services, LLC (or your chosen name)", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps", level: 0 }, children: [new TextRun({ text: "Registered office: YOUR Erie street address (Option A \u2014 your own address, since the LLC itself needs a registered office)", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps", level: 0 }, children: [new TextRun({ text: "County of venue: Erie", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps", level: 0 }, children: [new TextRun({ text: "Organizer: Your full name", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps", level: 0 }, children: [new TextRun({ text: "Complete the Docketing Statement (DSCB:15-134A) \u2014 the online system will prompt you", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps", level: 0 }, children: [new TextRun({ text: "Pay the $125 filing fee online", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps", level: 0 }, children: [new TextRun({ text: "Submit. Online filings are processed automatically \u2014 you\u2019ll get confirmation within minutes.", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 200 }, numbering: { reference: "steps", level: 0 }, children: [new TextRun({ text: "Save your Entity Number from the confirmation. You\u2019ll need it for Step 2.", size: 22, font: "Arial", bold: true })] }),

      // STEP 2
      new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "STEP 2: File the CROP Registration with the Bureau", size: 26, bold: true, font: "Arial", color: DARK })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "This is the filing that gets you on the official CROP list. You have two options:", size: 22, font: "Arial" })] }),
      blank(),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "OPTION A \u2014 By Mail (recommended for first-time CROP registration):", size: 22, bold: true, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps2", level: 0 }, children: [new TextRun({ text: "Fill out the enclosed \u201CStatement of Address of Commercial Registered Office Provider\u201D", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps2", level: 0 }, children: [new TextRun({ text: "Fill out the enclosed Cover Letter", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps2", level: 0 }, children: [new TextRun({ text: "Write a check for $70 payable to \u201CCommonwealth of Pennsylvania\u201D (preclearance/filing fee)", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps2", level: 0 }, children: [new TextRun({ text: "Mail all three items to:", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 40 }, indent: { left: 1080 }, children: [new TextRun({ text: "Bureau of Corporations and Charitable Organizations", size: 22, font: "Arial", bold: true })] }),
      new Paragraph({ spacing: { after: 40 }, indent: { left: 1080 }, children: [new TextRun({ text: "Pennsylvania Department of State", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 40 }, indent: { left: 1080 }, children: [new TextRun({ text: "P.O. Box 8722", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 100 }, indent: { left: 1080 }, children: [new TextRun({ text: "Harrisburg, PA 17105-8722", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 200 }, numbering: { reference: "steps2", level: 0 }, children: [new TextRun({ text: "Processing time: 5-10 business days by mail. The Bureau will add your entity to the published CROP list.", size: 22, font: "Arial" })] }),

      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "OPTION B \u2014 By Phone/Email (faster, less formal):", size: 22, bold: true, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps3", level: 0 }, children: [new TextRun({ text: "Call the Bureau at (717) 787-1057 or toll-free (888) 659-9962", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps3", level: 0 }, children: [new TextRun({ text: "Tell them: \u201CI have a Pennsylvania LLC and I want to register as a Commercial Registered Office Provider under 15 Pa.C.S. \u00A7 109.\u201D", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, numbering: { reference: "steps3", level: 0 }, children: [new TextRun({ text: "They will tell you the exact filing procedure and any fees. Follow their instructions precisely.", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 200 }, numbering: { reference: "steps3", level: 0 }, children: [new TextRun({ text: "Then mail whatever they request, plus the enclosed documents as backup.", size: 22, font: "Arial" })] }),

      // STEP 3
      new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "STEP 3: Confirm Your Listing", size: 26, bold: true, font: "Arial", color: DARK })] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "After filing, check the official CROP list to confirm your entity appears:", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "https://www.pa.gov/agencies/dos/programs/business/information-services/commercial-registered-office-providers", size: 20, font: "Arial", color: "1B4F8A" })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "Once you see your entity name on this list, you are officially authorized to accept clients as a CROP.", size: 22, font: "Arial", bold: true })] }),

      // COST SUMMARY
      new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "Total Filing Costs", size: 26, bold: true, font: "Arial", color: DARK })] }),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [6000, 3360],
        rows: [
          new TableRow({ children: [
            new TableCell({ borders, margins: cellMargins, width: { size: 6000, type: WidthType.DXA }, shading: { fill: ACCENT, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Item", bold: true, size: 22, font: "Arial", color: "FFFFFF" })] })] }),
            new TableCell({ borders, margins: cellMargins, width: { size: 3360, type: WidthType.DXA }, shading: { fill: ACCENT, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Fee", bold: true, size: 22, font: "Arial", color: "FFFFFF" })] })] }),
          ]}),
          ...[
            ["PA LLC formation (if new entity)", "$125"],
            ["CROP registration / Statement of Address filing", "$70"],
            ["Total (new entity)", "$195"],
            ["Total (existing entity)", "$70"],
          ].map(([item, fee]) => new TableRow({ children: [
            new TableCell({ borders, margins: cellMargins, width: { size: 6000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: item, size: 22, font: "Arial" })] })] }),
            new TableCell({ borders, margins: cellMargins, width: { size: 3360, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: fee, size: 22, font: "Arial", bold: fee.includes("195") || fee.includes("$70") })] })] }),
          ]})),
        ]
      }),

      // WHAT TO PRINT CHECKLIST
      new Paragraph({ spacing: { before: 300, after: 100 }, children: [new TextRun({ text: "Print-and-Mail Checklist", size: 26, bold: true, font: "Arial", color: DARK })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "\u25A1  Cover Letter (Document 1) \u2014 signed", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "\u25A1  Statement of Address (Document 2) \u2014 signed and dated", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "\u25A1  Check for $70 payable to \u201CCommonwealth of Pennsylvania\u201D", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "\u25A1  Envelope addressed to: Bureau of Corporations, P.O. Box 8722, Harrisburg, PA 17105-8722", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "\u25A1  Return address on envelope with your Erie, PA address", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "\u25A1  Send via USPS Certified Mail with Return Receipt (recommended for proof of filing)", size: 22, font: "Arial" })] }),

      // PRO TIP
      new Paragraph({ spacing: { before: 300, after: 100 }, children: [new TextRun({ text: "Pro Tip: Call First", size: 26, bold: true, font: "Arial", color: DARK })] }),
      new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Before mailing, call the Bureau at (717) 787-1057 and say:", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 100 }, indent: { left: 720 }, children: [new TextRun({ text: "\u201CI have a Pennsylvania LLC in Erie County and I want to register as a Commercial Registered Office Provider under 15 Pa.C.S. \u00A7 109. I have a cover letter and statement of address prepared. Is there a specific form I should use, or will these documents suffice? What is the exact filing fee?\u201D", size: 22, font: "Arial", italics: true })] }),
      new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: "The Bureau staff are helpful. They\u2019ll confirm the exact process and fee. This call takes 5 minutes and can save you a round trip of mail if they have a specific form they prefer.", size: 22, font: "Arial" })] }),

      // TIMELINE
      new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "Expected Timeline", size: 26, bold: true, font: "Arial", color: DARK })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Day 1: Form LLC online (if needed) \u2014 instant confirmation", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Day 1: Call Bureau to confirm CROP filing procedure", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Day 2: Mail the CROP registration packet via Certified Mail", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Day 5-7: Mail arrives at Harrisburg", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Day 7-14: Bureau processes and adds you to the CROP list", size: 22, font: "Arial" })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Day 14-21: Confirm your listing on the DOS website", size: 22, font: "Arial", bold: true })] }),
      new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "Day 21+: Start onboarding clients", size: 22, font: "Arial", bold: true, color: "059669" })] }),
    ]
  }]
});

// ============================================================
// SAVE ALL THREE DOCUMENTS
// ============================================================
async function saveAll() {
  const buf1 = await Packer.toBuffer(doc1);
  fs.writeFileSync("/home/claude/CROP-01-Cover-Letter.docx", buf1);
  console.log("1/3 Cover Letter created");

  const buf2 = await Packer.toBuffer(doc2);
  fs.writeFileSync("/home/claude/CROP-02-Statement-of-Address.docx", buf2);
  console.log("2/3 Statement of Address created");

  const buf3 = await Packer.toBuffer(doc3);
  fs.writeFileSync("/home/claude/CROP-03-Filing-Guide.docx", buf3);
  console.log("3/3 Filing Guide created");
}

saveAll();
