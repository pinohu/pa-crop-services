// PA CROP Services — Service Agreement PDF Generator
// POST /api/generate-agreement { email, name, entityName, entityType, tier, dosNumber }
// Uses Documentero API to generate branded service agreement PDF

import { isAdminRequest } from './services/auth.js';

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Unauthorized' });

  const { email, name, entityName, entityType, tier, dosNumber, phone } = req.body || {};
  if (!email || !entityName) return res.status(400).json({ error: 'email and entityName required' });

  const DOCUMENTERO_KEY = process.env.DOCUMENTERO_API_KEY;
  const tierLabel = { compliance: 'Compliance Only ($99/yr)', starter: 'Business Starter ($199/yr)', pro: 'Business Pro ($349/yr)', empire: 'Business Empire ($699/yr)' }[tier] || tier;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  
  // Generate agreement content
  const agreementData = {
    client_name: name || 'Client',
    client_email: email,
    client_phone: phone || '',
    entity_name: entityName,
    entity_type: entityType || 'LLC',
    dos_number: dosNumber || 'Pending verification',
    plan_name: tierLabel,
    effective_date: today,
    provider_name: 'PA Registered Office Services, LLC',
    provider_address: '924 W 23rd St, Erie, PA 16502',
    provider_phone: '814-228-2822',
    provider_email: 'hello@pacropservices.com',
    crop_statute: '15 Pa. C.S. § 109',
  };

  try {
    if (DOCUMENTERO_KEY) {
      // Use Documentero API for PDF generation
      const docRes = await fetch('https://app.documentero.com/api', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${DOCUMENTERO_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: 'crop-service-agreement',
          format: 'pdf',
          data: agreementData
        })
      });
      
      if (docRes.ok) {
        const result = await docRes.json();
        return res.status(200).json({ success: true, pdf_url: result.url || result.data?.url, agreement: agreementData });
      }
    }

    // Fallback: generate HTML agreement (can be converted to PDF by client)
    const html = generateAgreementHTML(agreementData);
    return res.status(200).json({ success: true, html, agreement: agreementData, note: 'PDF generation unavailable — HTML agreement returned' });
    
  } catch (e) {
    console.error('Agreement generation error:', e);
    return res.status(500).json({ error: e.message });
  }
}

function generateAgreementHTML(d) {
  return `<!DOCTYPE html><html><head><style>
    body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1C1C1C;line-height:1.6}
    h1{font-size:22px;border-bottom:3px solid #C9982A;padding-bottom:12px}
    h2{font-size:16px;margin-top:24px;color:#0C1220}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:20px 0;padding:16px;background:#FAF9F6;border-radius:8px}
    .sig{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:40px}
    .sig-line{border-top:1px solid #000;padding-top:4px;margin-top:40px;font-size:13px}
  </style></head><body>
    <h1>Commercial Registered Office Provider Service Agreement</h1>
    <p><strong>Effective Date:</strong> ${d.effective_date}</p>
    <div class="parties">
      <div><strong>Provider:</strong><br>${d.provider_name}<br>${d.provider_address}<br>${d.provider_phone}<br>${d.provider_email}<br>Licensed CROP under ${d.crop_statute}</div>
      <div><strong>Client:</strong><br>${d.client_name}<br>${d.client_email}${d.client_phone ? '<br>' + d.client_phone : ''}<br><br><strong>Entity:</strong> ${d.entity_name}<br>Type: ${d.entity_type}<br>DOS#: ${d.dos_number}</div>
    </div>
    <h2>1. Services</h2>
    <p>Provider agrees to serve as the Commercial Registered Office Provider (CROP) for the above entity under the <strong>${d.plan_name}</strong> plan, providing: registered office address at ${d.provider_address}, same-day document scanning and portal notification, annual report deadline reminders, entity status monitoring, and secure client portal access.</p>
    <h2>2. Term & Renewal</h2>
    <p>This agreement begins on ${d.effective_date} and continues for one (1) year. The agreement auto-renews unless cancelled in writing 30 days before the renewal date.</p>
    <h2>3. Fees</h2>
    <p>Client agrees to pay the annual fee for the ${d.plan_name} plan. All fees are non-refundable after the 30-day money-back guarantee period.</p>
    <h2>4. Provider Obligations</h2>
    <p>Provider will: (a) maintain the registered office at the address above during business hours; (b) receive and scan documents same-day; (c) send annual report reminders at 90, 60, 30, 14, and 7 days before deadline; (d) monitor entity status with the PA Department of State.</p>
    <h2>5. Client Obligations</h2>
    <p>Client will: (a) keep contact information current; (b) respond to time-sensitive documents promptly; (c) pay fees when due; (d) file any required PA DOS forms in a timely manner (unless filing is included in Client's plan).</p>
    <h2>6. Limitation of Liability</h2>
    <p>Provider's liability is limited to the annual fee paid. Provider is not liable for consequences of late filings, missed deadlines, or legal process where Provider fulfilled notification obligations under this agreement.</p>
    <h2>7. Governing Law</h2>
    <p>This agreement is governed by the laws of the Commonwealth of Pennsylvania.</p>
    <div class="sig">
      <div><div class="sig-line">Provider: ${d.provider_name}<br>Date: ${d.effective_date}</div></div>
      <div><div class="sig-line">Client: ${d.client_name}<br>Date: _______________</div></div>
    </div>
  </body></html>`;
}
