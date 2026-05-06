// PA CROP Services — Mail Processing (OCR + AI Classification)
// POST /api/mail-process { sender, recipientEntity, imageBase64, textContent, scanDate }
// For physical mail: scan → OCR → classify → route → notify

import { isAdminRequest, setCors } from './services/auth.js';
import { sendEmail, notifyOps } from './services/email.js';
import { createLogger } from './_log.js';

const log = createLogger('mail-process');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { sender, recipientEntity, textContent, scanDate } = req.body || {};
  const GROQ_KEY = process.env.GROQ_API_KEY;
  const adminKey = process.env.ADMIN_SECRET_KEY || '';

  const result = { sender, recipientEntity, scanDate: scanDate || new Date().toISOString() };

  // AI classification
  if (GROQ_KEY && (textContent || sender)) {
    try {
      const classRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 300,
          messages: [
            { role: 'system', content: 'You classify physical mail received at a PA CROP (registered office). Respond ONLY with JSON: {"category":"service_of_process|tax_notice|annual_report_notice|government_correspondence|legal_notice|general_mail|junk","urgency":"critical|high|normal|low","action":"description","notify_client":true|false,"notify_method":"sms_and_email|email_only|portal_only|no_notification","extracted_info":{"court_name":"if legal","case_number":"if legal","deadline":"if any","amount":"if financial"}}' },
            { role: 'user', content: `Mail received at PA CROP office:\nSender: ${sender || 'unknown'}\nRecipient entity: ${recipientEntity || 'unknown'}\nContent/text: ${(textContent || 'not available').slice(0, 1000)}` }
          ]
        })
      });
      const text = (await classRes.json())?.choices?.[0]?.message?.content || '';
      try { result.classification = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) { result.classification = { category: 'general_mail', urgency: 'normal' }; }
    } catch(e) { result.classification = { category: 'unknown', urgency: 'normal' }; }
  }

  // Find client by entity name and notify
  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  if (recipientEntity && SD_PUBLIC && SD_SECRET) {
    try {
      const sdRes = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500&role=client', {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
      });
      const clients = (await sdRes.json())?.data || [];
      const client = clients.find(c => c.custom_fields?.entity_name?.toLowerCase().includes(recipientEntity.toLowerCase()));
      
      if (client) {
        result.clientFound = true;
        result.clientEmail = client.email;
        // Track delivery so admin can see what got through and what didn't.
        // For service_of_process / critical mail, ANY notification failure
        // must escalate — a customer who gets sued and never sees the summons
        // is a legal-liability incident.
        result.delivery = { email: null, sms: null, escalated: false };

        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
        const classification = result.classification || {};
        const notifyMethod = classification.notify_method || 'email_only';
        const isUrgent = classification.urgency === 'critical' || classification.category === 'service_of_process';

        // ── Email notification ──
        if (notifyMethod !== 'no_notification' && notifyMethod !== 'portal_only') {
          const emailResult = await sendEmail({
            from: isUrgent ? 'urgent@pacropservices.com' : 'documents@pacropservices.com',
            to: client.email,
            subject: `${isUrgent ? '🚨 URGENT: ' : '📬 '}Mail received for ${recipientEntity} — ${classification.category?.replace(/_/g,' ')}`,
            html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
              <div style="border-bottom:3px solid ${isUrgent ? '#C44536' : '#C9982A'};padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#0C1220">${isUrgent ? '🚨 URGENT' : '📬'} PA CROP Services</strong></div>
              <p>We received mail at your registered office:</p>
              <div style="background:${isUrgent ? '#FEE2E2' : '#FAF9F6'};border:1px solid ${isUrgent ? '#FCA5A5' : '#EBE8E2'};border-radius:12px;padding:20px;margin:16px 0">
                <p style="margin:0 0 8px"><strong>From:</strong> ${sender || 'unknown'}</p>
                <p style="margin:0 0 8px"><strong>Type:</strong> ${classification.category?.replace(/_/g,' ')}</p>
                <p style="margin:0 0 8px"><strong>Urgency:</strong> ${classification.urgency}</p>
                <p style="margin:0"><strong>Action:</strong> ${classification.action || 'Review in portal'}</p>
                ${classification.extracted_info?.deadline ? `<p style="margin:8px 0 0"><strong>⚠️ Deadline:</strong> ${classification.extracted_info.deadline}</p>` : ''}
              </div>
              <p>View in your portal: <a href="https://pacropservices.com/portal">pacropservices.com/portal</a></p>
            </div>`
          });
          result.delivery.email = emailResult;
        }

        // ── SMS for urgent ──
        // For SoP / critical, force SMS regardless of notify_method preference
        // — single-channel delivery is too risky for legal mail.
        const shouldSendSms = (notifyMethod === 'sms_and_email' && isUrgent) || (isUrgent && result.delivery.email && !result.delivery.email.sent);
        if (shouldSendSms) {
          const phone = client.phone || client.custom_fields?.phone;
          if (phone) {
            try {
              const smsRes = await fetch(`${baseUrl}/api/sms`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
                body: JSON.stringify({ to: phone, type: 'entity_alert', data: { entity: recipientEntity, status: `URGENT mail from ${sender || 'unknown'} — ${classification.category?.replace(/_/g,' ')}` } })
              });
              const smsBody = await smsRes.json().catch(() => ({}));
              result.delivery.sms = { sent: smsRes.ok && smsBody?.success !== false, status: smsRes.status, via: smsBody?.via, error: smsBody?.error };
            } catch (e) {
              log.error('mail_process_sms_threw', { recipientEntity }, e instanceof Error ? e : new Error(String(e)));
              result.delivery.sms = { sent: false, error: e.message };
            }
          } else {
            result.delivery.sms = { sent: false, reason: 'no_phone_on_file' };
          }
        }

        // ── Escalate to ops if urgent + nothing was actually delivered ──
        const emailDelivered = result.delivery.email?.sent === true;
        const smsDelivered = result.delivery.sms?.sent === true;
        if (isUrgent && !emailDelivered && !smsDelivered) {
          await notifyOps(
            `URGENT mail FAILED to notify client (${recipientEntity})`,
            `<h2>Urgent mail received but client was NOT notified</h2>
             <p><strong>Recipient entity:</strong> ${recipientEntity}</p>
             <p><strong>Client:</strong> ${client.email}</p>
             <p><strong>From:</strong> ${sender || 'unknown'}</p>
             <p><strong>Category:</strong> ${classification.category}</p>
             <p><strong>Urgency:</strong> ${classification.urgency}</p>
             <p><strong>Action:</strong> ${classification.action || ''}</p>
             <h3>Delivery attempts</h3>
             <pre>${JSON.stringify(result.delivery, null, 2)}</pre>
             <p>Manually call/email this client immediately. Service of process or critical legal mail may be involved.</p>`
          );
          result.delivery.escalated = true;
        }

        // ── Update SuiteDash — only flip last_mail_date if AT LEAST ONE channel
        //    confirmed delivery (or it wasn't urgent). Otherwise the next mail
        //    arriving for this client overwrites the marker before we've actually
        //    reached them, hiding the silent failure.
        const safeToUpdateMarker = !isUrgent || emailDelivered || smsDelivered;
        if (safeToUpdateMarker) {
          const docCount = parseInt(client.custom_fields?.document_count || '0') + 1;
          const sdUpdate = await fetch(`https://app.suitedash.com/secure-api/contacts/${client.id}`, {
            method: 'PUT',
            headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
            body: JSON.stringify({ custom_fields: { document_count: String(docCount), last_mail_date: new Date().toISOString(), last_mail_type: classification.category || 'unknown' } })
          }).catch(e => { log.warn('mail_process_suitedash_update_failed', { error: e.message }); return null; });
          if (sdUpdate && !sdUpdate.ok) {
            log.warn('mail_process_suitedash_non_ok', { status: sdUpdate.status });
          }
        } else {
          log.warn('mail_process_skipped_marker_update', { reason: 'urgent_mail_undelivered', clientEmail: client.email });
        }
      }
    } catch(e) { result.clientError = e.message; }
  }

  return res.status(200).json({ success: true, ...result });
}
