// PA CROP Services — Co-Branded Partner Landing Page Generator
// POST /api/partner-landing { partnerName, partnerEmail, refCode, specialization }
// Generates unique landing page URL with tracking params for partner referrals.

import { isAdminRequest, setCors } from './services/auth.js';
import * as db from './services/db.js';
import { createLogger } from './_log.js';
import { isValidEmail, isValidString } from './_validate.js';

const log = createLogger('partner-landing');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  const { partnerName, partnerEmail, refCode, specialization } = req.body || {};
  if (!partnerName || !refCode) return res.status(400).json({ success: false, error: 'partnerName and refCode required' });
  if (!isValidString(partnerName, { maxLength: 200 })) return res.status(400).json({ success: false, error: 'partnerName too long' });
  if (partnerEmail && !isValidEmail(partnerEmail)) return res.status(400).json({ success: false, error: 'invalid_email' });

  const slug = partnerName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const landingUrl = `https://pacropservices.com/?ref=${encodeURIComponent(refCode)}&partner=${slug}`;
  const trackingParams = `?ref=${encodeURIComponent(refCode)}&partner=${slug}&utm_source=partner&utm_medium=referral&utm_campaign=${slug}`;

  // Generate co-branded intro via AI (optional)
  let customIntro = '';
  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (GROQ_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 200,
          messages: [
            { role: 'system', content: 'Write a 2-sentence intro for a co-branded landing page between a PA CROP service and a referring partner. Professional and warm.' },
            { role: 'user', content: `PA CROP Services is partnered with ${partnerName}${specialization ? ` (${specialization})` : ''} to offer compliance services to their clients.` }
          ]
        })
      });
      customIntro = (await groqRes.json())?.choices?.[0]?.message?.content || '';
    } catch (e) {
      log.warn('groq_intro_failed', { error: e.message });
    }
  }

  // Persist partner landing page config if DB is available
  if (db.isConnected() && partnerEmail) {
    const partner = await db.getPartnerByEmail(partnerEmail);
    if (partner) {
      await db.updatePartner(partner.id, {
        metadata: { ...partner.metadata, landing_slug: slug, landing_url: landingUrl, specialization }
      });
    }
  }

  // Audit
  if (db.isConnected()) {
    db.writeAuditEvent({
      actor_type: 'admin', actor_id: 'admin_key',
      event_type: 'partner.landing_created',
      target_type: 'partner', target_id: partnerEmail || refCode,
      after_json: { slug, refCode, landingUrl },
      reason: 'landing_page_generated'
    }).catch(() => {});
  }

  return res.status(200).json({
    success: true,
    landingUrl,
    partnerSlug: slug,
    refCode,
    customIntro,
    trackingParams,
    embedCode: `<a href="${landingUrl}" style="background:#0C1220;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Get PA CROP Services &rarr;</a>`
  });
}
