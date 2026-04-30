import { setCors, isAdminRequest } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('email-triage');

// PA CROP Services — AI Email Triage
// POST /api/email-triage { from, subject, body, messageId }
// Classifies email, drafts response, routes to correct handler

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  if (!isAdminRequest(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const { from, subject, body, messageId } = req.body || {};
  if (!body && !subject) return res.status(400).json({ success: false, error: 'subject or body required' });

  const GROQ_KEY = process.env.GROQ_API_KEY;

  const classifyPrompt = `Classify this email and draft a response.

FROM: ${from || 'unknown'}
SUBJECT: ${subject || 'no subject'}
BODY: ${(body || '').slice(0, 2000)}

Respond in JSON format only:
{
  "category": "new_lead|client_support|partner_inquiry|annual_report|service_of_process|billing|spam|other",
  "urgency": "high|medium|low",
  "sentiment": "positive|neutral|negative|angry",
  "isExistingClient": true/false (guess based on email content),
  "summary": "One sentence summary of the email",
  "suggestedAction": "auto_reply|draft_reply|escalate_to_ike|route_to_partners|ignore",
  "draftReply": "Professional reply draft if suggestedAction is auto_reply or draft_reply, otherwise empty string",
  "routeTo": "hello@pacropservices.com|partners@pacropservices.com|ike_direct"
}

CONTEXT: PA CROP Services provides PA registered office services. Plans: $99-$699/year. Address: 924 W 23rd St, Erie, PA 16502. Annual report deadlines: corps June 30, LLCs Sept 30, others Dec 31.`;

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
          { role: 'system', content: 'You are an email triage AI for PA CROP Services. Respond only in valid JSON.' },
          { role: 'user', content: classifyPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || '{}';
    
    let parsed;
    try {
      parsed = JSON.parse(reply);
    } catch {
      parsed = { category: 'other', urgency: 'medium', suggestedAction: 'escalate_to_ike', summary: 'Could not classify' };
    }

    return res.status(200).json({
      success: true,
      messageId,
      from,
      subject,
      ...parsed,
      processedAt: new Date().toISOString()
    });
  } catch (err) {
    log.error('email_triage_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'Triage failed', detail: err.message });
  }
}
