// PA CROP Services — Document Upload + Auto-Classification
// POST /api/document-upload { email, fileName, fileType, fileContent (base64), notes }
// Classifies document via Groq, stores metadata in SuiteDash, sends alerts for urgent docs

const _rl = new Map();
function _rateLimit(req, res, max, win) {
  const ip = (req.headers['x-forwarded-for']||'').split(',')[0].trim()||'unknown';
  const k = ip+':'+(req.url||'').split('?')[0]; const now = Date.now();
  let d = _rl.get(k); if(!d||now-d.s>win){_rl.set(k,{c:1,s:now});return false;}
  d.c++; if(d.c>max){res.setHeader('Retry-After',String(Math.ceil((d.s+win-now)/1000)));res.status(429).json({error:'Too many requests'});return true;} return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (_rateLimit(req, res, 5, 60000)) return;

  const { email, fileName, fileType, notes } = req.body || {};
  if (!email || !fileName) return res.status(400).json({ error: 'email and fileName required' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const result = { fileName, classified: false };

  // Step 1: Classify document
  if (GROQ_KEY) {
    try {
      const classRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 150,
          messages: [
            { role: 'system', content: 'Classify this document for a PA CROP (registered office) service. Respond ONLY with JSON: {"category":"service_of_process|tax_notice|annual_report|government_notice|general_correspondence|invoice|unknown","urgency":"critical|high|normal|low","action_needed":"description of action"}' },
            { role: 'user', content: `File name: ${fileName}\nFile type: ${fileType || 'unknown'}\nNotes: ${notes || 'none'}` }
          ]
        })
      });
      const classData = await classRes.json();
      const text = classData?.choices?.[0]?.message?.content || '';
      try {
        result.classification = JSON.parse(text.replace(/```json|```/g, '').trim());
        result.classified = true;
      } catch (e) {
        result.classification = { category: 'unknown', urgency: 'normal', action_needed: 'Manual review needed' };
      }
    } catch (e) { result.classification = { category: 'unknown', urgency: 'normal' }; }
  }

  // Step 2: Log in SuiteDash
  if (SD_PUBLIC && SD_SECRET) {
    try {
      const sdSearch = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
      });
      const contacts = (await sdSearch.json())?.data || [];
      if (contacts[0]?.id) {
        const docCount = parseInt(contacts[0].custom_fields?.document_count || '0') + 1;
        await fetch(`https://app.suitedash.com/secure-api/contacts/${contacts[0].id}`, {
          method: 'PUT',
          headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ custom_fields: {
            document_count: String(docCount),
            last_document: fileName,
            last_document_date: new Date().toISOString(),
            last_document_type: result.classification?.category || 'unknown'
          }})
        });
      }
    } catch (e) { /* continue */ }
  }

  // Step 3: Alert for urgent documents
  if (result.classification?.urgency === 'critical' || result.classification?.category === 'service_of_process') {
    const emailitKey = process.env.EMAILIT_API_KEY;
    if (emailitKey) {
      // Alert client
      await fetch('https://api.emailit.com/v1/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'urgent@pacropservices.com', to: email,
          subject: `🚨 URGENT: ${result.classification.category === 'service_of_process' ? 'Legal Document' : 'Critical Document'} Received — ${fileName}`,
          html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <div style="border-bottom:3px solid #C44536;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#C44536">URGENT — PA CROP Services</strong></div>
            <p>We received a document classified as <strong>${result.classification.category.replace(/_/g,' ')}</strong> for your entity.</p>
            <div style="background:#FEE2E2;border:1px solid #FCA5A5;border-radius:12px;padding:20px;margin:16px 0">
              <p style="margin:0 0 8px"><strong>Document:</strong> ${fileName}</p>
              <p style="margin:0 0 8px"><strong>Classification:</strong> ${result.classification.category.replace(/_/g,' ')}</p>
              <p style="margin:0"><strong>Action:</strong> ${result.classification.action_needed || 'Review immediately'}</p>
            </div>
            <p>Log in to your portal immediately: <a href="https://pacropservices.com/portal">pacropservices.com/portal</a></p>
            <p>Or call us: <a href="tel:8142282822">814-228-2822</a></p>
          </div>`
        })
      }).catch(() => {});

      // SMS alert for critical
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
      await fetch(`${baseUrl}/api/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE' },
        body: JSON.stringify({ to: email, type: 'entity_alert', data: { entity: fileName, status: 'URGENT document received — check portal immediately' } })
      }).catch(() => {});

      // Alert Ike
      await fetch('https://api.emailit.com/v1/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'urgent@pacropservices.com', to: 'hello@pacropservices.com',
          subject: `🚨 URGENT DOC: ${result.classification.category} for ${email}`,
          html: `<p><strong>Client:</strong> ${email}<br><strong>File:</strong> ${fileName}<br><strong>Type:</strong> ${result.classification.category}<br><strong>Action:</strong> ${result.classification.action_needed}</p>`
        })
      }).catch(() => {});
    }
    result.alertsSent = true;
  }

  return res.status(200).json({ success: true, ...result });
}
