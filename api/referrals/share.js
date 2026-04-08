// PA CROP Services — Share Referral Link Generator
// POST /api/referrals/share { email? }
// Returns the authenticated client's referral link with tracking params.
// Optionally creates a referral record for a specific email pre-invite.

import { setCors, authenticateRequest } from '../services/auth.js';
import * as db from '../services/db.js';
import { isValidEmail } from '../_validate.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    const client = db.isConnected() ? await db.getClientById(session.clientId) : null;
    const code = client?.referral_code || session.clientId?.slice(0, 8);
    const baseUrl = 'https://pacropservices.com';
    const referralUrl = `${baseUrl}/?ref=${encodeURIComponent(code)}`;

    // If an email is provided, pre-create a referral invite
    const { email } = req.body || {};
    let referral = null;
    if (email && isValidEmail(email) && db.isConnected()) {
      referral = await db.createReferral({
        referrer_client_id: session.clientId,
        referred_email: email.toLowerCase().trim(),
        referral_status: 'invited',
        metadata: { shared_via: 'portal', ref_code: code }
      });
    }

    return res.status(200).json({
      success: true,
      referral_code: code,
      referral_url: referralUrl,
      tracking_url: `${referralUrl}&utm_source=client&utm_medium=referral&utm_campaign=portal-share`,
      referral_id: referral?.id || null,
      social_links: {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`I use PA CROP Services for my business compliance. Check it out: ${referralUrl}`)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`,
        email_subject: 'PA Business Compliance Made Easy',
        email_body: `I've been using PA CROP Services for my PA annual report and compliance needs. They handle everything for $99/year. Check them out: ${referralUrl}`
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
