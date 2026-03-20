const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
        BorderStyle, WidthType, ShadingType, PageNumber, PageBreak } = require('docx');

const DARK = "2C2C2A";
const GRAY = "888780";
const border = { style: BorderStyle.SINGLE, size: 1, color: "D3D1C7" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function h(text, level = 1) {
  const sizes = { 1: 28, 2: 24 };
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: sizes[level], font: "Times New Roman", color: DARK })]
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 276 },
    ...opts,
    children: Array.isArray(text) ? text : [new TextRun({ text, size: 22, font: "Times New Roman", color: DARK })]
  });
}
function bold(text) { return new TextRun({ text, size: 22, font: "Times New Roman", color: DARK, bold: true }); }
function normal(text) { return new TextRun({ text, size: 22, font: "Times New Roman", color: DARK }); }
function bItem(text, ref) {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 80, line: 276 },
    children: Array.isArray(text) ? text : [new TextRun({ text, size: 22, font: "Times New Roman", color: DARK })]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Times New Roman", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Times New Roman" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Times New Roman" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
    ]
  },
  numbering: {
    config: [
      { reference: "alpha", levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "(%1)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "alpha2", levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "(%1)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "alpha3", levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "(%1)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "alpha4", levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "(%1)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "alpha5", levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "(%1)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "alpha6", levels: [{ level: 0, format: LevelFormat.LOWER_LETTER, text: "(%1)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "CROP Service Agreement \u2014 CONFIDENTIAL", size: 18, font: "Times New Roman", color: GRAY, italics: true })] })] })
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Page ", size: 18, font: "Times New Roman", color: GRAY }), new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Times New Roman", color: GRAY })] })] })
    },
    children: [
      // TITLE
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "COMMERCIAL REGISTERED OFFICE PROVIDER", size: 32, bold: true, font: "Times New Roman", color: DARK })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "SERVICE AGREEMENT", size: 28, bold: true, font: "Times New Roman", color: DARK })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: "[TEMPLATE \u2014 FOR ATTORNEY REVIEW BEFORE USE]", size: 22, font: "Times New Roman", color: "CC0000", italics: true })] }),

      // PREAMBLE
      p([bold("This Commercial Registered Office Provider Service Agreement"), normal(" (\u201CAgreement\u201D) is entered into as of _________________ (\u201CEffective Date\u201D) by and between:")]),
      p([bold("Provider: "), normal("Dynasty Compliance Services, LLC, a Pennsylvania limited liability company, with its principal office located at [ADDRESS], Erie, Pennsylvania 16501 (\u201CProvider\u201D or \u201CCROP\u201D)")]),
      p([bold("Client: "), normal("__________________________________________, a _________________________ (entity type) organized under the laws of _________________________ (state/jurisdiction), with entity number _________________ (\u201CClient\u201D)")]),
      p("Provider and Client are collectively referred to as the \u201CParties\u201D and individually as a \u201CParty.\u201D"),

      // SECTION 1
      h("1. Appointment and Scope of Services"),
      p([normal("1.1 "), bold("Appointment. "), normal("Client hereby appoints Provider as its Commercial Registered Office Provider pursuant to 15 Pa.C.S. \u00A7 109 of the Pennsylvania Consolidated Statutes. Provider accepts such appointment and agrees to perform the services described herein.")]),
      p([normal("1.2 "), bold("Registered Office Address. "), normal("Provider shall maintain a registered office address in the Commonwealth of Pennsylvania at the address on file with the Pennsylvania Department of State, Bureau of Corporations and Charitable Organizations. Provider\u2019s name may be listed on any filing with the Department of State in lieu of a registered office address, as permitted by law.")]),
      p([normal("1.3 "), bold("Core Services. "), normal("Provider shall:")]),
      bItem("Maintain a physical office in Pennsylvania during normal business hours for the receipt of service of process and official correspondence on behalf of Client;", "alpha"),
      bItem("Accept and promptly forward all service of process, legal documents, and official government correspondence received on behalf of Client;", "alpha"),
      bItem("Provide Client with access to a secure online portal for viewing scanned documents and managing account information;", "alpha"),
      bItem("Send reminders regarding Pennsylvania annual report filing deadlines applicable to Client\u2019s entity type;", "alpha"),
      bItem("Perform such additional services as described in the selected Service Tier (Exhibit A).", "alpha"),

      p([normal("1.4 "), bold("Limitations. "), normal("This Agreement does not authorize Client to use Provider\u2019s address as Client\u2019s principal place of business or mailing address, except as specifically provided in the selected Service Tier. Provider\u2019s services do not include and shall not be construed as legal advice, tax advice, or the practice of law. Provider is not acting as Client\u2019s attorney, accountant, or fiduciary.")]),

      // SECTION 2
      h("2. Client Obligations"),
      p("Client agrees to:"),
      bItem("Maintain a valid and binding contract with Provider before listing Provider\u2019s name on any filing with the Department of State, as required by 15 Pa.C.S. \u00A7 109;", "alpha2"),
      bItem("Provide Provider with accurate and current contact information, including email address, mailing address, and phone number;", "alpha2"),
      bItem("Promptly notify Provider of any changes to Client\u2019s entity name, entity type, jurisdiction of formation, or contact information;", "alpha2"),
      bItem("Pay all fees when due in accordance with Section 3 of this Agreement;", "alpha2"),
      bItem("Comply with all applicable laws and regulations of the Commonwealth of Pennsylvania regarding the use of a Commercial Registered Office Provider.", "alpha2"),

      // SECTION 3
      h("3. Fees and Payment"),
      p([normal("3.1 "), bold("Annual Fee. "), normal("Client shall pay Provider an annual service fee as specified in Exhibit A (\u201CAnnual Fee\u201D), payable in advance upon the Effective Date and each anniversary thereof.")]),
      p([normal("3.2 "), bold("Payment Method. "), normal("Payment shall be made via credit card, ACH transfer, or other electronic payment method accepted by Provider. Client authorizes Provider to charge the payment method on file for the Annual Fee and any applicable add-on service fees.")]),
      p([normal("3.3 "), bold("Auto-Renewal. "), normal("The Annual Fee shall be automatically charged to Client\u2019s payment method on file on each anniversary of the Effective Date, unless Client cancels the service in accordance with Section 6.")]),
      p([normal("3.4 "), bold("Late Payment. "), normal("If payment is not received within fifteen (15) days of the due date, Provider may suspend services until payment is received. If payment is not received within sixty (60) days, Provider may terminate this Agreement in accordance with Section 6.")]),
      p([normal("3.5 "), bold("Additional Services. "), normal("Fees for additional services (annual report filing, notarization, mail forwarding, etc.) shall be as listed in Exhibit A or as separately agreed in writing.")]),
      p([normal("3.6 "), bold("Refunds. "), normal("Annual Fees are non-refundable. If Client terminates this Agreement before the end of a service year, no prorated refund shall be issued.")]),

      // SECTION 4
      h("4. Service of Process and Document Handling"),
      p([normal("4.1 "), bold("Receipt and Forwarding. "), normal("Upon receipt of service of process or legal documents addressed to Client, Provider shall: (i) scan the documents and upload them to Client\u2019s secure online portal; (ii) send an email notification to Client\u2019s email address on file; and (iii) forward the original documents to Client\u2019s mailing address on file within two (2) business days.")]),
      p([normal("4.2 "), bold("Timeliness. "), normal("Provider shall process and notify Client of received service of process within one (1) business day of receipt. Provider\u2019s obligation is limited to receipt and forwarding; Provider is not responsible for Client\u2019s failure to respond to any legal process.")]),
      p([normal("4.3 "), bold("General Mail. "), normal("Provider may, at its discretion, open general mail that appears to be unsolicited commercial mail to determine whether it should be forwarded to Client. Government and legal mail shall be forwarded unopened.")]),

      // SECTION 5
      h("5. Limitation of Liability"),
      p([normal("5.1 "), bold("Limited Liability. "), normal("Provider\u2019s total liability to Client for any claims arising out of or related to this Agreement, whether in contract, tort, or otherwise, shall not exceed the total Annual Fee paid by Client in the twelve (12) months preceding the claim.")]),
      p([normal("5.2 "), bold("No Consequential Damages. "), normal("In no event shall Provider be liable for any indirect, incidental, special, consequential, or punitive damages, including lost profits, lost business, or litigation costs, arising out of or related to this Agreement.")]),
      p([normal("5.3 "), bold("Force Majeure. "), normal("Provider shall not be liable for any delay or failure to perform its obligations under this Agreement due to causes beyond its reasonable control, including natural disasters, postal service disruptions, government actions, or technology failures.")]),

      // SECTION 6
      h("6. Term and Termination"),
      p([normal("6.1 "), bold("Term. "), normal("This Agreement shall commence on the Effective Date and continue for a period of one (1) year (\u201CInitial Term\u201D). Thereafter, this Agreement shall automatically renew for successive one-year periods (\u201CRenewal Terms\u201D) unless terminated by either Party.")]),
      p([normal("6.2 "), bold("Termination by Client. "), normal("Client may terminate this Agreement at any time by providing thirty (30) days\u2019 written notice to Provider. Upon termination, Client is responsible for filing a Change of Registered Office (Form DSCB:15-143) with the Pennsylvania Department of State and paying the applicable filing fee ($70 as of 2026).")]),
      p([normal("6.3 "), bold("Termination by Provider. "), normal("Provider may terminate this Agreement: (i) upon sixty (60) days\u2019 written notice; (ii) immediately upon Client\u2019s failure to pay fees within sixty (60) days of the due date; or (iii) immediately if Client uses Provider\u2019s services in connection with any illegal activity.")]),
      p([normal("6.4 "), bold("Post-Termination Obligations. "), normal("Upon termination, Provider shall: (i) forward any documents received on behalf of Client for a period of ninety (90) days following termination; (ii) provide Client\u2019s last known contact information to the Department of State if required by law; and (iii) retain copies of all documents handled on behalf of Client for a period of one (1) year.")]),

      // SECTION 7
      h("7. Confidentiality"),
      p("Provider shall maintain the confidentiality of all Client information received in connection with this Agreement and shall not disclose such information to third parties except as required by law, court order, or as necessary to perform the services described herein."),

      // SECTION 8
      h("8. Indemnification"),
      p("Client shall indemnify, defend, and hold harmless Provider from and against any and all claims, damages, losses, and expenses (including reasonable attorneys\u2019 fees) arising out of or related to: (i) Client\u2019s failure to respond to service of process or legal documents forwarded by Provider; (ii) Client\u2019s listing of Provider as its CROP without a valid agreement; or (iii) Client\u2019s violation of any applicable law or regulation."),

      // SECTION 9
      h("9. General Provisions"),
      p([normal("9.1 "), bold("Governing Law. "), normal("This Agreement shall be governed by and construed in accordance with the laws of the Commonwealth of Pennsylvania, without regard to its conflict of laws provisions.")]),
      p([normal("9.2 "), bold("Dispute Resolution. "), normal("Any dispute arising out of or related to this Agreement shall be resolved through binding arbitration in Erie County, Pennsylvania, in accordance with the rules of the American Arbitration Association.")]),
      p([normal("9.3 "), bold("No Attorney-Client Relationship. "), normal("This Agreement does not create an attorney-client relationship between Provider and Client. Provider is not providing legal advice and is not covered by any privilege from disclosure.")]),
      p([normal("9.4 "), bold("Entire Agreement. "), normal("This Agreement, including Exhibit A, constitutes the entire agreement between the Parties and supersedes all prior agreements and understandings.")]),
      p([normal("9.5 "), bold("Amendment. "), normal("This Agreement may be amended only by a written instrument signed by both Parties or by Provider\u2019s update to its standard terms with thirty (30) days\u2019 notice to Client.")]),
      p([normal("9.6 "), bold("Severability. "), normal("If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.")]),
      p([normal("9.7 "), bold("Assignment. "), normal("Client may not assign this Agreement without Provider\u2019s prior written consent. Provider may assign this Agreement to any successor entity.")]),

      // SIGNATURE BLOCK
      new Paragraph({ children: [new PageBreak()] }),
      h("Signatures"),
      p("IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date."),
      new Paragraph({ spacing: { before: 400 } }),
      p([bold("PROVIDER:"), normal(" Dynasty Compliance Services, LLC")]),
      new Paragraph({ spacing: { before: 300 } }),
      p("By: ________________________________________"),
      p("Name: ________________________________________"),
      p("Title: ________________________________________"),
      p("Date: ________________________________________"),
      new Paragraph({ spacing: { before: 400 } }),
      p([bold("CLIENT:"), normal(" ________________________________________")]),
      new Paragraph({ spacing: { before: 300 } }),
      p("By: ________________________________________"),
      p("Name: ________________________________________"),
      p("Title: ________________________________________"),
      p("Date: ________________________________________"),
      p("Entity Number: ________________________________________"),
      p("Email: ________________________________________"),

      // EXHIBIT A
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "EXHIBIT A", size: 28, bold: true, font: "Times New Roman" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: "Service Tier and Fee Schedule", size: 24, font: "Times New Roman" })] }),

      p([bold("Selected Service Tier"), normal(" (check one):")]),
      new Paragraph({ spacing: { before: 200 } }),
      p("\u25A1  STARTER \u2014 $79.00 per year"),
      p("     PA registered office address, mail forwarding (via mail), annual report email reminders, online portal access, email support"),
      new Paragraph({ spacing: { before: 100 } }),
      p("\u25A1  PROFESSIONAL \u2014 $179.00 per year"),
      p("     All Starter features plus: same-day document scanning, compliance calendar with alerts, annual report filing assistance ($50 add-on), business mailing address, priority email support"),
      new Paragraph({ spacing: { before: 100 } }),
      p("\u25A1  PREMIUM \u2014 $299.00 per year"),
      p("     All Professional features plus: annual report filed on your behalf (included), unlimited mail forwarding, business identity package, notarization (2 per year included), phone support with dedicated representative"),
      new Paragraph({ spacing: { before: 200 } }),

      p([bold("Add-On Services (available with any tier):")]),
      bItem("Annual report filing service: $50.00 per filing (plus $7.00 state fee)", "alpha5"),
      bItem("Change of Registered Office filing: $120.00 (includes $70.00 state fee)", "alpha5"),
      bItem("LLC/Corporation formation package: $500.00\u2013$800.00 (includes state filing fees)", "alpha5"),
      bItem("Notarization: $25.00 per document (beyond included allotment, if any)", "alpha5"),
      bItem("Virtual mailbox add-on: $15.00 per month ($180.00 per year)", "alpha5"),
      bItem("Compliance monitoring add-on: $10.00 per month ($120.00 per year)", "alpha5"),
      bItem("Expedited document forwarding (next-day): $15.00 per occurrence", "alpha5"),

      new Paragraph({ spacing: { before: 300 } }),
      p([bold("Payment Method:")]),
      p("\u25A1  Credit Card     \u25A1  ACH/Bank Transfer     \u25A1  Check"),
      new Paragraph({ spacing: { before: 200 } }),
      p("Client Initials: ______     Date: ________________"),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/claude/PA-CROP-Service-Agreement.docx", buffer);
  console.log("Service agreement created");
});
