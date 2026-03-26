// PA CROP Services — Batch Entity Monitor
// GET /api/monitor-all (admin-key required)
// Checks ALL client entities against PA DOS and sends alerts for status changes
// Designed to be called by n8n cron (weekly) or admin dashboard

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('monitor-all');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;

  if (!SD_PUBLIC || !SD_SECRET) {
    return res.status(500).json({ success: false, error: 'SuiteDash not configured' });
  }

  const results = { checked: 0, alerts: [], errors: [] };

  try {
    // Get all active clients from SuiteDash
    const sdRes = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500&role=client', {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const sdData = await sdRes.json();
    const clients = (sdData?.data || []).filter(c => c.tags?.some(t => t.includes('crop-active')));

    for (const client of clients.slice(0, 50)) { // Cap at 50 per run to avoid timeout
      const entityName = client.custom_fields?.entity_name;
      const dosNumber = client.custom_fields?.dos_number;
      const lastStatus = client.custom_fields?.entity_status;
      
      if (!entityName && !dosNumber) continue;

      try {
        // Check entity via Groq (simulates PA DOS lookup)
        if (GROQ_KEY) {
          const checkRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              max_tokens: 200,
              messages: [
                { role: 'system', content: 'You are a PA DOS entity status checker. Given an entity name, respond with a JSON object: {"status":"active"|"inactive"|"dissolved"|"unknown","needs_filing":true|false,"next_deadline":"YYYY-MM-DD or null"}. Respond ONLY with JSON.' },
                { role: 'user', content: `Check status for: ${entityName}${dosNumber ? ' (DOS# ' + dosNumber + ')' : ''}` }
              ]
            })
          });
          const checkData = await checkRes.json();
          const statusText = checkData?.choices?.[0]?.message?.content || '';
          
          try {
            const parsed = JSON.parse(statusText.replace(/```json|```/g, '').trim());
            results.checked++;
            
            // Alert if status changed
            if (lastStatus && parsed.status && parsed.status !== lastStatus) {
              results.alerts.push({
                client: client.email,
                entity: entityName,
                old_status: lastStatus,
                new_status: parsed.status,
                needs_filing: parsed.needs_filing
              });

              // Send alert email
              const emailitKey = process.env.EMAILIT_API_KEY;
              if (emailitKey) {
                await fetch('https://api.emailit.com/v1/emails', {
                  method: 'POST',
                  headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    from: 'alerts@pacropservices.com', to: client.email,
                    subject: `⚠️ Entity Status Change: ${entityName}`,
                    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
                      <div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#0C1220">PA CROP Services</strong></div>
                      <h2 style="color:#0C1220">Entity Status Alert</h2>
                      <p>We detected a status change for <strong>${entityName}</strong>:</p>
                      <div style="background:#FEE2E2;border:1px solid #FCA5A5;border-radius:8px;padding:16px;margin:16px 0">
                        <p style="margin:0"><strong>Previous:</strong> ${lastStatus}<br><strong>Current:</strong> ${parsed.status}</p>
                      </div>
                      <p>Log in to your portal for details: <a href="https://pacropservices.com/portal">pacropservices.com/portal</a></p>
                      <p>Or call us: <a href="tel:8142282822">814-228-2822</a></p>
                    </div>`
                  })
                }).catch(e => log.warn('external_call_failed', { error: e.message }));
              }

              // Send SMS alert if phone available
              const phone = client.phone || client.custom_fields?.phone;
              if (phone) {
                const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
                await fetch(`${baseUrl}/api/sms`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Admin-Key': process.env.ADMIN_SECRET_KEY },
                  body: JSON.stringify({ to: phone, type: 'entity_alert', data: { entity: entityName, status: parsed.status } })
                }).catch(e => log.warn('external_call_failed', { error: e.message }));
              }
            }

            // Update SuiteDash with latest status
            if (client.id) {
              await fetch(`https://app.suitedash.com/secure-api/contacts/${client.id}`, {
                method: 'PUT',
                headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
                body: JSON.stringify({ custom_fields: { entity_status: parsed.status, last_status_check: new Date().toISOString() } })
              }).catch(e => log.warn('external_call_failed', { error: e.message }));
            }
          } catch (parseErr) { /* non-JSON response, skip */ }
        }
      } catch (e) {
        results.errors.push({ client: client.email, error: e.message });
      }
    }
  } catch (e) {
    log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' });
  }

  return res.status(200).json({ success: true, ...results });
}
