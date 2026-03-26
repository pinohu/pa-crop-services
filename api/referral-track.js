// PA CROP Services — Referral Commission Tracker
// POST /api/referral-track { newClientEmail, refCode }
// Called during provisioning when new client has a referral code

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('referral-track');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { newClientEmail, refCode, tier, amount } = req.body || {};
  if (!newClientEmail || !refCode) return res.status(400).json({ success: false, error: 'newClientEmail and refCode required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  if (!SD_PUBLIC || !SD_SECRET) return res.status(500).json({ success: false, error: 'SuiteDash not configured' });

  try {
    // Find the referrer by their referral code
    const searchRes = await fetch(`https://app.suitedash.com/secure-api/contacts?limit=500&role=client`, {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const clients = (await searchRes.json())?.data || [];
    const referrer = clients.find(c => c.custom_fields?.referral_code === refCode);

    if (!referrer) {
      return res.status(200).json({ success: false, message: 'Referral code not found', refCode });
    }

    // Calculate commission (10% of annual plan value)
    const commissionRates = { compliance: 9.90, starter: 19.90, pro: 34.90, empire: 69.90 };
    const commission = commissionRates[tier] || amount * 0.10 || 9.90;

    // Update referrer's SuiteDash record
    const currentEarnings = parseFloat(referrer.custom_fields?.referral_earnings || '0');
    const currentCount = parseInt(referrer.custom_fields?.referral_count || '0');

    await fetch(`https://app.suitedash.com/secure-api/contacts/${referrer.id}`, {
      method: 'PUT',
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        custom_fields: {
          referral_earnings: (currentEarnings + commission).toFixed(2),
          referral_count: currentCount + 1,
          last_referral_date: new Date().toISOString()
        }
      })
    });

    // Notify referrer
    const emailitKey = process.env.EMAILIT_API_KEY;
    if (emailitKey) {
      await fetch('https://api.emailit.com/v1/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + emailitKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'hello@pacropservices.com', to: referrer.email,
          subject: `You earned $${commission.toFixed(2)} — referral commission!`,
          html: `<div style="font-family:Outfit,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <div style="border-bottom:3px solid #C9982A;padding-bottom:12px;margin-bottom:20px"><strong style="font-size:18px;color:#0C1220">PA CROP Services</strong></div>
            <h2 style="color:#0C1220">🎉 Referral Commission Earned!</h2>
            <p>Someone signed up using your referral code, and you've earned <strong>$${commission.toFixed(2)}</strong>.</p>
            <div style="background:#E8F0E9;border:1px solid #6B8F71;border-radius:12px;padding:20px;margin:16px 0">
              <p style="margin:0"><strong>This referral:</strong> $${commission.toFixed(2)}<br>
              <strong>Total earned:</strong> $${(currentEarnings + commission).toFixed(2)}<br>
              <strong>Total referrals:</strong> ${currentCount + 1}</p>
            </div>
            <p>Keep sharing your code to earn more! Your portal has your referral link and code.</p>
          </div>`
        })
      }).catch(e => log.warn('external_call_failed', { error: e.message }));
    }

    return res.status(200).json({ 
      success: true, referrer: referrer.email, commission, 
      total_earnings: currentEarnings + commission, total_referrals: currentCount + 1 
    });
  } catch (e) {
    log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
