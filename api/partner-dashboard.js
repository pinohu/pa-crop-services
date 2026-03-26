
import { setCors } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';
import { isValidEmail } from './_validate.js';

const log = createLogger('partner-dashboard');

// PA CROP Services — Partner Dashboard API
// GET /api/partner-dashboard?email=partner@example.com
// Returns partner's referred clients, commissions, performance


export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const rlResult = await checkRateLimit(getClientIp(req), 'partner-dashboard', 10, '60s');
  if (rlResult) {
    res.setHeader('Retry-After', String(rlResult.retryAfter));
    return res.status(429).json({ success: false, error: 'Too many requests' });
  }

  const email = req.query?.email;
  if (!email) return res.status(400).json({ success: false, error: 'email required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  if (!SD_PUBLIC || !SD_SECRET) return res.status(500).json({ success: false, error: 'CRM not configured' });

  try {
    // Find partner
    const sdSearch = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const contacts = (await sdSearch.json())?.data || [];
    const partner = contacts[0];
    if (!partner) return res.status(404).json({ success: false, error: 'Partner not found' });

    const isPartner = partner.tags?.some(t => t.includes('partner'));
    if (!isPartner) return res.status(403).json({ success: false, error: 'Not a registered partner' });

    const refCode = partner.custom_fields?.referral_code || '';
    const earnings = parseFloat(partner.custom_fields?.referral_earnings || '0');
    const count = parseInt(partner.custom_fields?.referral_count || '0');

    // Find referred clients
    const allClients = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500&role=client', {
      headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
    });
    const clients = (await allClients.json())?.data || [];
    const referred = clients.filter(c => c.custom_fields?.lead_source === refCode || c.tags?.some(t => t === `ref-${refCode}`));

    const referredSummary = referred.map(c => ({
      signupDate: c.custom_fields?.crop_since || '',
      tier: c.custom_fields?.crop_plan || 'compliance',
      active: c.tags?.some(t => t.includes('crop-active')) || false,
    }));

    return res.status(200).json({
      success: true,
      partner: { name: partner.first_name || partner.name, email: partner.email },
      referralCode: refCode,
      referralLink: `https://pacropservices.com?ref=${refCode}`,
      earnings: { total: earnings, count, average: count > 0 ? (earnings/count).toFixed(2) : '0' },
      referredClients: referredSummary,
      activeClients: referredSummary.filter(c => c.active).length,
    });
  } catch(e) {
    return res.status(500).json({ success: false, error: e.message });
  }
}
