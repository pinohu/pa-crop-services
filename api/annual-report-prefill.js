// PA CROP Services — Annual Report Pre-Fill Generator
// POST /api/annual-report-prefill { email, entityName, dosNumber }
// For Pro/Empire: generates pre-filled annual report form data
// Uses entity data from SuiteDash + PA DOS lookup via Groq

import { authenticateRequest } from './services/auth.js';
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  const isAdmin = adminKey === (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE');
  const session = !isAdmin ? await authenticateRequest(req) : { valid: true };
  if (!isAdmin && !session.valid) return res.status(401).json({ error: 'Unauthorized' });

  const { email, entityName, dosNumber, entityType } = req.body || {};
  if (!email || !entityName) return res.status(400).json({ error: 'email and entityName required' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  const DOCUMENTERO_KEY = process.env.DOCUMENTERO_API_KEY;

  // Generate pre-filled form data
  const formData = {
    entity_name: entityName,
    dos_file_number: dosNumber || '',
    entity_type: entityType || 'LLC',
    registered_office: '924 W 23rd St, Erie, PA 16502',
    crop_provider: 'PA Registered Office Services, LLC',
    filing_fee: '$7.00',
    filing_url: 'https://file.dos.pa.gov',
    form_number: entityType?.includes('Foreign') ? 'DSCB:15-532' : 'DSCB:15-530',
    generated_date: new Date().toISOString(),
    client_email: email
  };

  // Use Groq to generate a summary of what the client needs to confirm
  if (GROQ_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 300,
          messages: [
            { role: 'system', content: 'You help PA business owners understand their annual report filing. Be brief and clear.' },
            { role: 'user', content: `Generate a brief checklist (5 items) for filing the PA annual report for ${entityName} (${entityType || 'LLC'}, DOS# ${dosNumber || 'pending'}). Include the form number, fee, and URL.` }
          ]
        })
      });
      const groqData = await groqRes.json();
      formData.checklist = groqData?.choices?.[0]?.message?.content || '';
    } catch (e) { /* continue without checklist */ }
  }

  // Email the pre-filled data to the client
  const emailitKey = process.env.EMAILIT_API_KEY;
  if (emailitKey) {
    await fetch('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'filing@pacropservices.com', to: email,
        subject: `📝 Your annual report is ready to confirm — ${entityName}`,
        html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#0C1220">PA CROP Services</strong></div>
          <h2 style="color:#0C1220">Your Annual Report — Ready to File</h2>
          <p>We've pre-filled your annual report details. Please confirm everything looks correct:</p>
          <div style="background:#FAF9F6;border:1px solid #EBE8E2;border-radius:12px;padding:20px;margin:16px 0">
            <p style="margin:0 0 8px"><strong>Entity:</strong> ${entityName}</p>
            <p style="margin:0 0 8px"><strong>DOS File #:</strong> ${dosNumber || 'We\'ll look this up'}</p>
            <p style="margin:0 0 8px"><strong>Form:</strong> ${formData.form_number}</p>
            <p style="margin:0 0 8px"><strong>Filing Fee:</strong> $7.00 (paid to PA DOS)</p>
            <p style="margin:0"><strong>Registered Office:</strong> 924 W 23rd St, Erie, PA 16502</p>
          </div>
          ${formData.checklist ? `<div style="background:#E8F0E9;border-radius:12px;padding:20px;margin:16px 0"><h3 style="margin:0 0 8px;color:#0C1220">Filing Checklist</h3><div style="font-size:14px;white-space:pre-line">${formData.checklist}</div></div>` : ''}
          <p><strong>Reply to this email with "CONFIRM" and we'll file it for you.</strong></p>
          <p style="font-size:13px;color:#7A7A7A">Your plan includes annual report filing. The $7 state fee is paid from your account.</p>
        </div>`
      })
    }).catch(() => {});
  }

  return res.status(200).json({ success: true, form_data: formData });
}
