// PA CROP Services — Monthly Newsletter Auto-Generator
// GET /api/newsletter-generate?key=ADMIN&send=true
// Generates monthly compliance newsletter via Groq, sends via Acumbamail

import { isAdminRequest } from './services/auth.js';

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Unauthorized' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'Groq not configured' });

  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  try {
    // Generate newsletter content
    const genRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', max_tokens: 1000,
        messages: [
          { role: 'system', content: 'Write a monthly compliance newsletter for PA business owners. Include: 1) A brief compliance tip, 2) Important upcoming deadlines, 3) A FAQ answer, 4) A brief update about PA CROP Services. Respond in JSON: {"subject":"email subject","tip_title":"title","tip_body":"2-3 sentences","deadlines":["deadline1","deadline2"],"faq_q":"question","faq_a":"answer","update":"1-2 sentences about the service"}' },
          { role: 'user', content: `Generate the ${month} newsletter for PA business owners. Make it timely and actionable.` }
        ]
      })
    });
    const genData = await genRes.json();
    const text = genData?.choices?.[0]?.message?.content || '';
    let content;
    try { content = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) {
      return res.status(500).json({ error: 'Failed to generate newsletter content' });
    }

    // Build HTML
    const html = `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#FAF9F6">
      <div style="border-bottom:3px solid #C9982A;padding-bottom:16px;margin-bottom:24px">
        <strong style="font-size:20px;color:#0C1220">PA CROP Services</strong>
        <span style="float:right;font-size:13px;color:#7A7A7A">${month} Newsletter</span>
      </div>
      <h2 style="color:#0C1220;margin:0 0 8px">💡 ${content.tip_title}</h2>
      <p style="color:#4A4A4A;line-height:1.6">${content.tip_body}</p>
      <div style="background:#fff;border:1px solid #EBE8E2;border-radius:12px;padding:20px;margin:20px 0">
        <h3 style="color:#0C1220;margin:0 0 12px">📅 Upcoming Deadlines</h3>
        ${(content.deadlines||[]).map(d => `<p style="margin:4px 0;color:#4A4A4A">• ${d}</p>`).join('')}
      </div>
      <div style="background:#E8F0E9;border-radius:12px;padding:20px;margin:20px 0">
        <h3 style="color:#0C1220;margin:0 0 8px">❓ ${content.faq_q}</h3>
        <p style="color:#4A4A4A;margin:0">${content.faq_a}</p>
      </div>
      <p style="color:#4A4A4A">${content.update}</p>
      <p style="text-align:center;margin:24px 0">
        <a href="https://pacropservices.com/portal" style="background:#0C1220;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600">Log in to your portal →</a>
      </p>
      <div style="border-top:1px solid #EBE8E2;padding-top:16px;margin-top:24px;font-size:12px;color:#7A7A7A;text-align:center">
        PA Registered Office Services, LLC · 924 W 23rd St, Erie, PA 16502<br>
        <a href="https://pacropservices.com" style="color:#C9982A">pacropservices.com</a> · 814-228-2822
      </div>
    </div>`;

    const result = { subject: content.subject || `PA Compliance Update — ${month}`, content, html };

    // Send via Acumbamail if requested
    if (req.query?.send === 'true') {
      const acuKey = process.env.ACUMBAMAIL_API_KEY;
      try {
        const sendRes = await fetch('https://acumbamail.com/api/1/sendOne/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auth_token: acuKey,
            list_id: '1267324',
            subject: result.subject,
            body: html,
            from_name: 'PA CROP Services',
            from_email: 'hello@pacropservices.com',
            response_type: 'json'
          })
        });
        result.sent = true;
        result.sendResult = await sendRes.json().catch(() => ({}));
      } catch(e) { result.sendError = e.message; }
    }

    return res.status(200).json({ success: true, ...result });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
