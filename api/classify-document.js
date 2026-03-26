// PA CROP Services — Document Classifier
// POST /api/classify-document { text, filename, clientEmail }
// Classifies scanned documents and generates plain-English summaries

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Internal-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const internalKey = req.headers['x-internal-key'];
  if (internalKey !== (process.env.ADMIN_SECRET_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { text, filename, clientEmail, ocrText } = req.body || {};
  const docText = text || ocrText || '';
  if (!docText) return res.status(400).json({ error: 'text or ocrText required' });

  const GROQ_KEY = process.env.GROQ_API_KEY;

  const classifyPrompt = `Classify this document received at a PA registered office and generate a plain-English summary for the client.

DOCUMENT TEXT (OCR):
${docText.slice(0, 3000)}

FILENAME: ${filename || 'unknown'}

Respond in JSON:
{
  "documentType": "service_of_process|government_correspondence|tax_notice|annual_report_reminder|court_filing|irs_notice|pa_dos_notice|business_correspondence|advertising|junk_mail|unknown",
  "urgency": "critical|high|medium|low|none",
  "actionRequired": true/false,
  "summary": "Plain-English 2-3 sentence summary of what this document is and what it means for the business owner",
  "recommendedAction": "What the client should do (if anything)",
  "deadlineDetected": "YYYY-MM-DD or null if no deadline found",
  "senderName": "Who sent this document",
  "isLegalProcess": true/false,
  "tags": ["list", "of", "relevant", "tags"]
}`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are a document classification AI for a Pennsylvania registered office service. Be accurate about legal documents. Respond only in valid JSON.' },
          { role: 'user', content: classifyPrompt }
        ],
        temperature: 0.1,
        max_tokens: 600,
        response_format: { type: 'json_object' }
      })
    });

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || '{}';
    
    let parsed;
    try {
      parsed = JSON.parse(reply);
    } catch {
      parsed = { documentType: 'unknown', urgency: 'medium', summary: 'Document requires manual review' };
    }

    return res.status(200).json({
      success: true,
      clientEmail,
      filename,
      ...parsed,
      classifiedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Classify error:', err);
    return res.status(500).json({ error: 'Classification failed' });
  }
}
