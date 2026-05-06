import { setCors, authenticateRequest, isAdminRequest } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';
import { isValidEmail } from './_validate.js';

const log = createLogger('document-upload');

// PA CROP Services — Document Upload + Auto-Classification
// POST /api/document-upload { email, fileName, fileType, fileContent (base64), notes }
// Authenticated endpoint — must be called by an admin (mailroom intake) or a
// signed-in client uploading their own documents. Without auth, this endpoint
// would be an open mailer (anyone could trigger urgent-doc emails to any
// address branded as PA CROP).

function escHtml(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  // Auth: admin (mailroom) or authenticated client.
  const isAdmin = isAdminRequest(req);
  const session = !isAdmin ? await authenticateRequest(req) : { valid: true, email: null };
  if (!isAdmin && !session.valid) return res.status(401).json({ success: false, error: 'Unauthorized' });

  // IP rate limit applies to admin and client paths alike (defence in depth).
  const rlResult = await checkRateLimit(getClientIp(req), 'document-upload', 5, '60s');
  if (rlResult) {
    res.setHeader('Retry-After', String(rlResult.retryAfter));
    return res.status(429).json({ success: false, error: 'Too many requests' });
  }

  const { email, fileName, fileType, fileContent, notes } = req.body || {};
  if (!email || !fileName) return res.status(400).json({ success: false, error: 'email and fileName required' });
  if (!isValidEmail(email)) return res.status(400).json({ success: false, error: 'invalid email' });

  // A non-admin client may only upload for their own email (prevent cross-account spoof).
  if (!isAdmin && session.email && email.toLowerCase() !== session.email.toLowerCase()) {
    return res.status(403).json({ success: false, error: 'Email mismatch with session' });
  }

  // File validation: allowed types and size limit
  const ALLOWED_EXTENSIONS = /\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|tif|tiff|txt|csv)$/i;
  if (!ALLOWED_EXTENSIONS.test(fileName)) {
    return res.status(400).json({ success: false, error: 'File type not allowed. Accepted: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, TIF, TXT, CSV' });
  }
  if (fileName.length > 255) return res.status(400).json({ success: false, error: 'fileName too long (max 255)' });
  if (fileContent && fileContent.length > 10_000_000) { // ~7.5MB decoded
    return res.status(413).json({ success: false, error: 'File too large (max 7.5MB)' });
  }

  // Sanitize fileName for use in HTML emails
  const safeFileName = fileName.replace(/[<>"'&]/g, '_');

  const GROQ_KEY = process.env.GROQ_API_KEY;
  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const result = { fileName: safeFileName, classified: false };

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
      // Allowlist the classification category to a known set; LLM output cannot
      // be trusted as HTML.
      const ALLOWED_CATEGORIES = ['service_of_process','tax_notice','annual_report','government_notice','general_correspondence','invoice','unknown'];
      const safeCategory = ALLOWED_CATEGORIES.includes(result.classification.category) ? result.classification.category : 'unknown';
      const safeCategoryLabel = safeCategory.replace(/_/g, ' ');
      const safeAction = escHtml((result.classification.action_needed || 'Review immediately').slice(0, 280));

      // Alert client
      await fetch('https://api.emailit.com/v1/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'urgent@pacropservices.com', to: email,
          subject: `🚨 URGENT: ${safeCategory === 'service_of_process' ? 'Legal Document' : 'Critical Document'} Received — ${safeFileName}`,
          html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <div style="border-bottom:3px solid #C44536;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#C44536">URGENT — PA CROP Services</strong></div>
            <p>We received a document classified as <strong>${escHtml(safeCategoryLabel)}</strong> for your entity.</p>
            <div style="background:#FEE2E2;border:1px solid #FCA5A5;border-radius:12px;padding:20px;margin:16px 0">
              <p style="margin:0 0 8px"><strong>Document:</strong> ${escHtml(safeFileName)}</p>
              <p style="margin:0 0 8px"><strong>Classification:</strong> ${escHtml(safeCategoryLabel)}</p>
              <p style="margin:0"><strong>Action:</strong> ${safeAction}</p>
            </div>
            <p>Log in to your portal immediately: <a href="https://pacropservices.com/portal">pacropservices.com/portal</a></p>
            <p>Or call us: <a href="tel:8142282822">814-228-2822</a></p>
          </div>`
        })
      }).catch(e => log.warn('external_call_failed', { error: e.message }));

      // SMS alert for critical
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
      await fetch(`${baseUrl}/api/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY },
        body: JSON.stringify({ to: email, type: 'entity_alert', data: { entity: fileName, status: 'URGENT document received — check portal immediately' } })
      }).catch(e => log.warn('external_call_failed', { error: e.message }));

      // Alert Ike
      await fetch('https://api.emailit.com/v1/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'urgent@pacropservices.com', to: 'hello@pacropservices.com',
          subject: `🚨 URGENT DOC: ${safeCategory} for ${email}`,
          html: `<p><strong>Client:</strong> ${escHtml(email)}<br><strong>File:</strong> ${escHtml(safeFileName)}<br><strong>Type:</strong> ${escHtml(safeCategoryLabel)}<br><strong>Action:</strong> ${safeAction}</p>`
        })
      }).catch(e => log.warn('external_call_failed', { error: e.message }));
    }
    result.alertsSent = true;
  }

  return res.status(200).json({ success: true, ...result });
}
