// PA CROP Services — Branded Invoice Generator
// POST /api/invoice-generate { email, name, amount, tier, description, stripeSessionId }
// Generates branded invoice HTML, emails to client, returns data
// Called by stripe-webhook.js on successful payment

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { email, name, amount, tier, description, stripeSessionId } = req.body || {};
  if (!email || !amount) return res.status(400).json({ error: 'email and amount required' });

  const invoiceNum = 'CROP-' + Date.now().toString(36).toUpperCase();
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const tierLabel = { compliance: 'Compliance Only', starter: 'Business Starter', pro: 'Business Pro', empire: 'Business Empire' }[tier] || tier || 'Service';

  const invoiceHtml = `<!DOCTYPE html><html><head><style>
    body{font-family:Outfit,Arial,sans-serif;max-width:700px;margin:40px auto;padding:24px;color:#1C1C1C}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #C9982A;padding-bottom:20px;margin-bottom:24px}
    .company{font-size:20px;font-weight:700;color:#0C1220}
    .company-sub{font-size:12px;color:#7A7A7A;margin-top:4px}
    .invoice-title{font-size:28px;font-weight:700;color:#0C1220;text-align:right}
    .invoice-num{font-size:13px;color:#7A7A7A;text-align:right}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin:24px 0}
    .party-label{font-size:11px;font-weight:700;color:#7A7A7A;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
    table{width:100%;border-collapse:collapse;margin:24px 0}
    th{background:#0C1220;color:#fff;padding:12px 16px;text-align:left;font-size:13px;font-weight:600}
    td{padding:12px 16px;border-bottom:1px solid #EBE8E2;font-size:14px}
    .total-row td{font-weight:700;font-size:16px;border-top:2px solid #0C1220;border-bottom:none}
    .footer{margin-top:40px;padding-top:16px;border-top:1px solid #EBE8E2;font-size:11px;color:#7A7A7A;text-align:center}
    .paid-badge{background:#E8F0E9;color:#6B8F71;padding:6px 16px;border-radius:20px;font-weight:700;font-size:13px;display:inline-block;margin-top:8px}
  </style></head><body>
    <div class="header">
      <div><div class="company">PA CROP Services</div><div class="company-sub">PA Registered Office Services, LLC<br>924 W 23rd St, Erie, PA 16502<br>814-228-2822 · hello@pacropservices.com</div></div>
      <div><div class="invoice-title">INVOICE</div><div class="invoice-num">#${invoiceNum}<br>${today}</div></div>
    </div>
    <div class="parties">
      <div><div class="party-label">Bill To</div><strong>${name || 'Client'}</strong><br>${email}</div>
      <div><div class="party-label">Payment Status</div><span class="paid-badge">✓ PAID</span><br><span style="font-size:12px;color:#7A7A7A">via Stripe${stripeSessionId ? ' · ' + stripeSessionId.slice(-8) : ''}</span></div>
    </div>
    <table>
      <tr><th>Description</th><th>Period</th><th style="text-align:right">Amount</th></tr>
      <tr><td>${tierLabel} Plan — Annual Subscription<br><span style="font-size:12px;color:#7A7A7A">${description || 'PA CROP registered office service, compliance monitoring, portal access'}</span></td><td>${today} — ${new Date(Date.now() + 365*86400000).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</td><td style="text-align:right">$${(amount/100).toFixed(2)}</td></tr>
      <tr class="total-row"><td colspan="2">Total Paid</td><td style="text-align:right">$${(amount/100).toFixed(2)}</td></tr>
    </table>
    <div class="footer">
      PA Registered Office Services, LLC · Licensed PA CROP under 15 Pa. C.S. § 109<br>
      This invoice is for your records. No additional payment is required.<br>
      Questions? hello@pacropservices.com · 814-228-2822
    </div>
  </body></html>`;

  // Email invoice to client
  const emailitKey = process.env.EMAILIT_API_KEY;
  if (emailitKey) {
    try {
      await fetch('https://api.emailit.com/v1/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'billing@pacropservices.com', to: email,
          subject: `Invoice #${invoiceNum} — PA CROP Services ${tierLabel}`,
          html: invoiceHtml
        })
      });
    } catch (e) { /* continue */ }
  }

  return res.status(200).json({ success: true, invoiceNumber: invoiceNum, html: invoiceHtml });
}
