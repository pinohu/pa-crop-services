// PA CROP Services — Notification Service
// Tech spec: sections 9.2, 10 (Notification template matrix)

import * as db from './db.js';

const EMAILIT_KEY = process.env.EMAILIT_API_KEY;

// ── Templates (section 10) ─────────────────────────────────

const TEMPLATES = {
  welcome: {
    subject: (v) => `Welcome to PA CROP Services, ${v.client_name}`,
    html: (v) => `<div style="font-family:Outfit,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#0C1220">Welcome to PA CROP Services</h2>
      <p>Hi ${v.client_name},</p>
      <p>Your registered office is now active for <strong>${v.org_name}</strong>. You're on the <strong>${v.plan}</strong> plan.</p>
      <p>Log in to your portal to see your compliance dashboard, obligations, and documents:</p>
      <p style="margin:24px 0"><a href="https://pacropservices.com/portal" style="background:#C9982A;color:#0C1220;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Open Your Portal</a></p>
      <p>Questions? Reply to this email or call 814-228-2822.</p>
      <p>— PA CROP Services</p></div>`
  },
  annual_report_90: {
    subject: (v) => `${v.org_name} — Annual Report Due in 90 Days`,
    html: (v) => reminderHtml(v, 90, 'info')
  },
  annual_report_60: {
    subject: (v) => `${v.org_name} — Annual Report Due in 60 Days`,
    html: (v) => reminderHtml(v, 60, 'info')
  },
  annual_report_30: {
    subject: (v) => `⚠️ ${v.org_name} — Annual Report Due in 30 Days`,
    html: (v) => reminderHtml(v, 30, 'warning')
  },
  annual_report_14: {
    subject: (v) => `🚨 ${v.org_name} — Annual Report Due in 14 Days`,
    html: (v) => reminderHtml(v, 14, 'urgent')
  },
  annual_report_7: {
    subject: (v) => `🔴 ${v.org_name} — Annual Report Due in 7 Days!`,
    html: (v) => reminderHtml(v, 7, 'critical')
  },
  overdue_notice: {
    subject: (v) => `🚨 URGENT: ${v.org_name} — Annual Report OVERDUE`,
    html: (v) => `<div style="font-family:Outfit,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#fef2f2;border:2px solid #ef4444;border-radius:8px;padding:20px;margin-bottom:20px"><h2 style="color:#dc2626;margin:0">Your Annual Report is Overdue</h2></div>
      <p><strong>${v.org_name}</strong> missed its annual report deadline of <strong>${v.due_date}</strong>.</p>
      <p>${v.next_step}</p>
      <p>File immediately at <a href="https://file.dos.pa.gov">file.dos.pa.gov</a>. Need help? Call <strong>814-228-2822</strong>.</p>
      <p>— PA CROP Services</p></div>`
  },
  document_received: {
    subject: (v) => `Document Received for ${v.org_name}: ${v.doc_type}`,
    html: (v) => `<div style="font-family:Outfit,sans-serif;max-width:600px;margin:0 auto">
      <h2>Document Received</h2>
      <p>We received a <strong>${v.doc_type}</strong> for <strong>${v.org_name}</strong>.</p>
      <p>Urgency: <strong>${v.urgency}</strong></p>
      <p>Log in to your portal to view: <a href="https://pacropservices.com/portal">Portal</a></p>
      <p>— PA CROP Services</p></div>`
  },
  payment_failed: {
    subject: (v) => `Action Required: Payment Failed for ${v.client_name}`,
    html: (v) => `<div style="font-family:Outfit,sans-serif;max-width:600px;margin:0 auto">
      <h2>Payment Failed</h2>
      <p>We couldn't process your payment. We'll retry on <strong>${v.retry_date}</strong>.</p>
      <p>Please update your payment method to avoid service interruption.</p>
      <p>— PA CROP Services</p></div>`
  },
  upgrade_confirmation: {
    subject: (v) => `Plan Upgraded: ${v.plan_name}`,
    html: (v) => `<div style="font-family:Outfit,sans-serif;max-width:600px;margin:0 auto">
      <h2>Plan Upgraded!</h2>
      <p>You've been upgraded to <strong>${v.plan_name}</strong>, effective ${v.effective_date}.</p>
      <p>Your new features are now active in your portal.</p>
      <p>— PA CROP Services</p></div>`
  }
};

function reminderHtml(v, days, priority) {
  const colors = { info: '#3b82f6', warning: '#f59e0b', urgent: '#ef4444', critical: '#dc2626' };
  const color = colors[priority] || colors.info;
  return `<div style="font-family:Outfit,sans-serif;max-width:600px;margin:0 auto">
    <h2 style="color:${color}">Annual Report Due in ${days} Days</h2>
    <p><strong>${v.org_name}</strong> annual report is due <strong>${v.due_date}</strong>.</p>
    <p>File online at <a href="https://file.dos.pa.gov">file.dos.pa.gov</a>. Fee: $7.</p>
    ${v.managed ? '<p style="background:#ecfdf5;padding:12px;border-radius:8px">✅ Your plan includes filing — we\'ll handle it.</p>' : ''}
    <p><a href="https://pacropservices.com/portal">View in Portal</a> · 814-228-2822</p>
    <p>— PA CROP Services</p></div>`;
}

// ── Send Email ─────────────────────────────────────────────

export async function sendEmail(to, templateId, variables) {
  const template = TEMPLATES[templateId];
  if (!template) throw new Error(`Unknown template: ${templateId}`);
  if (!EMAILIT_KEY) { console.warn('EMAILIT_API_KEY not set — email skipped'); return { success: false, error: 'no_key' }; }

  try {
    const resp = await fetch('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${EMAILIT_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PA CROP Services <reminders@pacropservices.com>',
        to,
        subject: template.subject(variables),
        html: template.html(variables)
      })
    });
    const data = await resp.json();
    return { success: resp.ok, provider_message_id: data?.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Process Pending Notifications ──────────────────────────

export async function processPending() {
  const pending = await db.getPendingNotifications();
  const results = [];

  for (const notif of pending) {
    const org = notif.organizations;
    const obl = notif.obligations;
    const variables = {
      org_name: org?.legal_name || notif.org_name || 'Your Entity',
      due_date: obl?.due_date || '',
      managed: obl?.filing_method === 'managed'
    };

    // Find client email — try Neon first, then SuiteDash
    let email = null;
    try {
      const { neon } = await import('@neondatabase/serverless');
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl) {
        const sql = neon(dbUrl);
        const clients = await sql('SELECT email FROM clients WHERE organization_id = $1 LIMIT 1', [notif.organization_id]);
        email = clients?.[0]?.email;
      }
    } catch (e) { /* Neon not available */ }

    // SuiteDash fallback
    if (!email && db.isSuiteDashConnected()) {
      try {
        const { suitedash } = db;
        const clients = await suitedash.getAllClientsWithCompliance();
        const match = clients.find(c => c.neon_org_id === notif.organization_id);
        email = match?.email;
      } catch (e) { /* SuiteDash not available */ }
    }

    if (!email) {
      await db.updateNotification(notif.id, { delivery_status: 'failed', metadata: { ...notif.metadata, error: 'no_email' } });
      results.push({ id: notif.id, status: 'failed', error: 'no_email' });
      continue;
    }

    const result = await sendEmail(email, notif.template_id, variables);
    await db.updateNotification(notif.id, {
      delivery_status: result.success ? 'sent' : 'failed',
      sent_at: result.success ? new Date().toISOString() : null,
      provider_message_id: result.provider_message_id,
      retry_count: result.success ? notif.retry_count : notif.retry_count + 1
    });

    results.push({ id: notif.id, status: result.success ? 'sent' : 'failed' });
  }

  return results;
}

// ── Notify Ike (admin alert) ───────────────────────────────

export async function notifyAdmin(subject, body) {
  if (!EMAILIT_KEY) return;
  try {
    await fetch('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${EMAILIT_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'PA CROP Ops <ops@pacropservices.com>',
        to: 'polycarpohu@gmail.com',
        subject: `[PA CROP] ${subject}`,
        html: `<div style="font-family:sans-serif;max-width:600px">${body}</div>`
      })
    });
  } catch (e) { console.error('Admin notification failed:', e.message); }
}

// ── SMS Alerts (Feature 12) ────────────────────────────────

const SMSIT_KEY = process.env.SMSIT_API_KEY || '';
const SMSIT_BASE = 'https://aicpanel.smsit.ai/api/v2';

export async function sendSMS(phone, message) {
  if (!SMSIT_KEY || !phone) return { success: false, error: 'sms_not_configured' };
  try {
    const resp = await fetch(SMSIT_BASE + '/send', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + SMSIT_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, message, from: 'PACROP' })
    });
    const data = await resp.json();
    return { success: resp.ok, provider_message_id: data?.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function sendDeadlineAlert(phone, orgName, daysUntil, dueDate) {
  const msg = daysUntil <= 0
    ? `PA CROP Alert: ${orgName} annual report is OVERDUE (due ${dueDate}). File now at file.dos.pa.gov. Questions? 814-228-2822`
    : `PA CROP Reminder: ${orgName} annual report due ${dueDate} (${daysUntil} days). File at file.dos.pa.gov or log in to your portal. 814-228-2822`;
  return sendSMS(phone, msg);
}

export async function sendDocumentAlert(phone, orgName, docType, urgency) {
  const msg = urgency === 'critical'
    ? `PA CROP URGENT: ${docType.replace(/_/g, ' ')} received for ${orgName}. Log in to your portal immediately or call 814-228-2822.`
    : `PA CROP: New ${docType.replace(/_/g, ' ')} received for ${orgName}. View in your portal at pacropservices.com/portal`;
  return sendSMS(phone, msg);
}
