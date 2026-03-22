// PA CROP Services — Native Service Agreement PDF Generator
// POST /api/generate-agreement
// Generates a professional PDF service agreement using pdf-lib (no external services)
// Called from: admin dashboard, portal, n8n onboarding workflow

import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Auth: admin key or internal n8n call
  const adminKey = req.headers['x-admin-key'] || req.body?.adminKey;
  const isInternal = req.headers['x-internal-key'] === process.env.ADMIN_SECRET_KEY;
  if (!isInternal && adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    client_name = '',
    entity_name = '',
    entity_type = 'LLC',
    entity_number = '',
    client_address = '',
    client_email = '',
    client_title = 'Authorized Representative',
    service_tier = 'compliance_only',
    annual_fee = '$99',
    effective_date = new Date().toISOString().split('T')[0],
    agreement_number = `CROP-${Date.now().toString(36).toUpperCase().slice(-8)}`
  } = req.body || {};

  if (!client_name || !entity_name) {
    return res.status(400).json({ error: 'client_name and entity_name required' });
  }

  // Tier labels and included services
  const tierMap = {
    compliance_only: { label: 'Compliance Only', fee: '$99/year', services: 'Registered office address, same-day document scanning, annual report reminders, client portal access.' },
    business_starter: { label: 'Business Starter', fee: '$199/year', services: 'All Compliance Only services, plus: web hosting with SSL, business email address, StackCP hosting dashboard.' },
    business_pro: { label: 'Business Pro', fee: '$349/year', services: 'All Business Starter services, plus: annual report filing included, priority document handling, turbo hosting.' },
    business_empire: { label: 'Business Empire', fee: '$699/year', services: 'All Business Pro services, plus: daily backups, entity formation assistance, dedicated compliance advisor, multi-entity management.' }
  };
  const tier = tierMap[service_tier] || tierMap.compliance_only;
  const feeDisplay = annual_fee.startsWith('$') ? annual_fee : tier.fee;

  try {
    const doc = await PDFDocument.create();
    const helvetica = await doc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const helveticaOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

    const blue = rgb(0.106, 0.31, 0.541);     // #1B4F8A
    const accent = rgb(0.325, 0.29, 0.718);    // #534AB7
    const dark = rgb(0.118, 0.137, 0.2);       // #1E2333
    const gray = rgb(0.42, 0.45, 0.5);         // #6B7280
    const lightBg = rgb(0.969, 0.965, 0.953);  // #F7F6F3

    const pageW = 612; // US Letter
    const pageH = 792;
    const marginL = 60;
    const marginR = 60;
    const contentW = pageW - marginL - marginR;

    // Helper: draw text and return new Y position
    function drawText(page, text, x, y, opts = {}) {
      const font = opts.bold ? helveticaBold : (opts.italic ? helveticaOblique : helvetica);
      const size = opts.size || 10;
      const color = opts.color || dark;
      const maxW = opts.maxWidth || contentW;

      // Word wrap
      const words = text.split(' ');
      let lines = [];
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word;
        if (font.widthOfTextAtSize(testLine, size) > maxW && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      let currentY = y;
      for (const line of lines) {
        if (currentY < 60) {
          page = doc.addPage([pageW, pageH]);
          currentY = pageH - 60;
        }
        page.drawText(line, { x, y: currentY, size, font, color });
        currentY -= size * 1.5;
      }
      return { y: currentY, page };
    }

    // Helper: draw a horizontal line
    function drawLine(page, y, color = gray, thickness = 0.5) {
      page.drawLine({ start: { x: marginL, y }, end: { x: pageW - marginR, y }, thickness, color });
    }

    // ── PAGE 1 ──────────────────────────────────────────────────
    let page = doc.addPage([pageW, pageH]);
    let y = pageH - 50;

    // Header
    page.drawText('PA REGISTERED OFFICE SERVICES, LLC', { x: marginL, y, size: 14, font: helveticaBold, color: blue });
    y -= 18;
    page.drawText('924 W 23rd St, Erie, PA 16502  |  814-480-0989  |  hello@pacropservices.com', { x: marginL, y, size: 8, font: helvetica, color: gray });
    y -= 12;
    page.drawText('PA DOS File #0015295203  |  EIN: 41-5024472', { x: marginL, y, size: 8, font: helvetica, color: gray });
    y -= 8;
    drawLine(page, y, blue, 1.5);
    y -= 30;

    // Title
    page.drawText('COMMERCIAL REGISTERED OFFICE PROVIDER', { x: marginL, y, size: 16, font: helveticaBold, color: blue });
    y -= 22;
    page.drawText('SERVICE AGREEMENT', { x: marginL, y, size: 14, font: helveticaBold, color: blue });
    y -= 30;

    // Agreement info block
    const infoFields = [
      ['Agreement Date:', effective_date],
      ['Agreement Number:', agreement_number],
      ['Service Tier:', tier.label],
      ['Annual Fee:', feeDisplay],
    ];
    for (const [label, value] of infoFields) {
      page.drawText(label, { x: marginL, y, size: 10, font: helveticaBold, color: dark });
      page.drawText(value, { x: marginL + 130, y, size: 10, font: helvetica, color: dark });
      y -= 16;
    }
    y -= 16;

    // PARTIES
    page.drawText('PARTIES', { x: marginL, y, size: 12, font: helveticaBold, color: blue });
    y -= 20;

    let result;

    result = drawText(page, `Provider: PA Registered Office Services, LLC, a Pennsylvania limited liability company, licensed as a Commercial Registered Office Provider under 15 Pa. C.S. \u00A7 109, with its principal office at 924 W 23rd St, Erie, PA 16502 ("Provider").`, marginL, y, { size: 10 });
    y = result.y - 10; page = result.page;

    result = drawText(page, `Client: ${client_name}, on behalf of ${entity_name}, a ${entity_type} registered with the Pennsylvania Department of State under File Number ${entity_number || '[pending]'}, with a mailing address at ${client_address || '[to be provided]'} ("Client").`, marginL, y, { size: 10 });
    y = result.y - 20; page = result.page;

    // SECTIONS
    const sections = [
      {
        title: '1. SCOPE OF SERVICES',
        text: `Provider agrees to furnish the following services for the Client\u2019s entity during the term of this Agreement:\n\n\u2022 Registered Office Address: Provider shall serve as the Commercial Registered Office Provider (CROP) for Client\u2019s entity, maintaining the address 924 W 23rd St, Erie, PA 16502 as the entity\u2019s registered office on file with the Pennsylvania Department of State.\n\n\u2022 Document Receipt and Forwarding: Provider shall receive all service of process, government correspondence, and official mail delivered to the registered office address and forward scanned copies to Client via the client portal within one (1) business day of receipt.\n\n\u2022 Annual Report Reminders: Provider shall send automated compliance reminders at 90, 60, 30, 14, and 7 days prior to the September 30 annual report filing deadline.\n\n\u2022 Client Portal Access: Provider shall maintain a secure online portal for Client to view received documents, compliance status, and account information.\n\nAdditional services included in the ${tier.label} plan: ${tier.services}`
      },
      {
        title: '2. TERM AND RENEWAL',
        text: `This Agreement shall commence on ${effective_date} and continue for a period of one (1) year (the "Initial Term"). This Agreement shall automatically renew for successive one-year periods (each a "Renewal Term") unless either party provides written notice of non-renewal at least thirty (30) days prior to the expiration of the then-current term.`
      },
      {
        title: '3. FEES AND PAYMENT',
        text: `Client shall pay Provider an annual fee of ${feeDisplay} for the services described in Section 1. Payment is due upon execution of this Agreement and upon each annual renewal date thereafter. All fees are non-refundable except as required by applicable law.`
      },
      {
        title: '4. CLIENT OBLIGATIONS',
        text: `Client shall: (a) promptly notify Provider of any change in entity name, entity type, mailing address, or contact information; (b) maintain its entity in good standing with the Pennsylvania Department of State, including timely filing of annual reports; (c) promptly retrieve and review all documents forwarded by Provider through the client portal; and (d) not use Provider\u2019s registered office address for any purpose other than as the entity\u2019s registered office with the PA Department of State.`
      },
      {
        title: '5. PROVIDER OBLIGATIONS',
        text: `Provider shall: (a) maintain a physical office at 924 W 23rd St, Erie, PA 16502, staffed during normal business hours (Monday\u2013Friday, 9:00 AM\u20135:00 PM Eastern); (b) accept service of process and official mail on behalf of Client\u2019s entity and forward scanned copies within one (1) business day; (c) maintain its license as a Commercial Registered Office Provider under 15 Pa. C.S. \u00A7 109; and (d) maintain reasonable security measures to protect Client\u2019s documents and personal information.`
      },
      {
        title: '6. LIMITATION OF LIABILITY',
        text: `Provider\u2019s total liability under this Agreement shall not exceed the annual fee paid by Client for the then-current term. Provider shall not be liable for any indirect, incidental, consequential, or punitive damages arising from or related to this Agreement, including but not limited to delays caused by postal service, courier, or government agency processing times.`
      },
      {
        title: '7. TERMINATION',
        text: `Either party may terminate this Agreement by providing thirty (30) days\u2019 written notice to the other party. Upon termination, Client shall promptly file DSCB:15-108 (Statement of Change of Registered Office) with the PA Department of State to designate a new registered office. Provider shall continue to forward documents received after termination for a period of sixty (60) days.`
      },
      {
        title: '8. GOVERNING LAW',
        text: `This Agreement shall be governed by the laws of the Commonwealth of Pennsylvania. Any dispute arising under this Agreement shall be resolved in the courts of Erie County, Pennsylvania.`
      },
      {
        title: '9. ENTIRE AGREEMENT',
        text: `This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements, understandings, and representations, whether written or oral. This Agreement may not be amended except by written instrument signed by both parties.`
      }
    ];

    for (const section of sections) {
      if (y < 100) {
        page = doc.addPage([pageW, pageH]);
        y = pageH - 60;
      }
      page.drawText(section.title, { x: marginL, y, size: 11, font: helveticaBold, color: blue });
      y -= 18;

      // Split on \n\n for paragraph breaks, handle bullet points
      const paragraphs = section.text.split('\n\n');
      for (const para of paragraphs) {
        result = drawText(page, para.replace(/\n/g, ' '), marginL, y, { size: 10 });
        y = result.y - 8; page = result.page;
      }
      y -= 8;
    }

    // ── SIGNATURE BLOCK ────────────────────────────────────────
    if (y < 200) {
      page = doc.addPage([pageW, pageH]);
      y = pageH - 60;
    }
    drawLine(page, y, blue, 1.5);
    y -= 30;

    // Provider signature
    page.drawText('PROVIDER:', { x: marginL, y, size: 10, font: helveticaBold, color: dark });
    page.drawText('CLIENT:', { x: marginL + 260, y, size: 10, font: helveticaBold, color: dark });
    y -= 16;
    page.drawText('PA Registered Office Services, LLC', { x: marginL, y, size: 10, font: helvetica, color: dark });
    page.drawText(entity_name, { x: marginL + 260, y, size: 10, font: helvetica, color: dark });
    y -= 30;
    page.drawText('________________________________', { x: marginL, y, size: 10, font: helvetica, color: gray });
    page.drawText('________________________________', { x: marginL + 260, y, size: 10, font: helvetica, color: gray });
    y -= 16;
    page.drawText('Ikechukwu P.N. Ohu, PhD', { x: marginL, y, size: 10, font: helvetica, color: dark });
    page.drawText(client_name, { x: marginL + 260, y, size: 10, font: helvetica, color: dark });
    y -= 14;
    page.drawText('Managing Member', { x: marginL, y, size: 9, font: helvetica, color: gray });
    page.drawText(client_title, { x: marginL + 260, y, size: 9, font: helvetica, color: gray });
    y -= 18;
    page.drawText(`Date: ${effective_date}`, { x: marginL, y, size: 10, font: helvetica, color: dark });
    page.drawText('Date: _______________', { x: marginL + 260, y, size: 10, font: helvetica, color: dark });
    y -= 40;

    // Footer
    page.drawText('PA CROP Services  \u2022  pacropservices.com  \u2022  814-480-0989', {
      x: pageW / 2 - 130, y: 30, size: 8, font: helvetica, color: gray
    });

    // Serialize
    const pdfBytes = await doc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    const filename = `CROP_Service_Agreement_${entity_name.replace(/[^a-zA-Z0-9]/g, '_')}_${effective_date}.pdf`;

    // Return as downloadable or base64 depending on accept header
    if (req.headers.accept === 'application/pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(Buffer.from(pdfBytes));
    }

    return res.status(200).json({
      success: true,
      filename,
      agreement_number,
      pdf_base64: pdfBase64,
      size_bytes: pdfBytes.length
    });

  } catch (err) {
    console.error('PDF generation error:', err);
    return res.status(500).json({ error: 'Failed to generate PDF', detail: err.message });
  }
}
