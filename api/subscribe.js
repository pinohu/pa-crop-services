// PA CROP Services — /api/subscribe
// Newsletter / lead magnet email capture
// POST { email, source, tag }

import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';
import { db } from './_db.js';
import { isValidEmail, isValidString, sanitize } from './_validate.js';

const logger = createLogger('subscribe');

const ALLOWED_ORIGINS = ['https://pacropservices.com', 'https://www.pacropservices.com'];

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Rate limit: Newsletter — 5/min (Upstash Redis with in-memory fallback)
  const rlResult = await checkRateLimit(getClientIp(req), 'subscribe', 5, '60s');
  if (rlResult) {
    res.setHeader('Retry-After', String(rlResult.retryAfter));
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { email, source, tag } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!isValidEmail(email)) return res.status(400).json({ error: 'Invalid email format' });
  if (source !== undefined && !isValidString(source, { minLength: 0, maxLength: 100 })) {
    return res.status(400).json({ error: 'source must be 100 characters or fewer' });
  }
  if (tag !== undefined && !isValidString(tag, { minLength: 0, maxLength: 50 })) {
    return res.status(400).json({ error: 'tag must be 50 characters or fewer' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanSource = sanitize(source || 'website');
  const cleanTag = sanitize(tag || 'newsletter');

  // Acumbamail list 1267324 (All Clients / Leads)
  const ACUMBAMAIL_KEY = process.env.ACUMBAMAIL_API_KEY;
  const LIST_ID = '1267324';

  const warnings = [];

  try {
    // ── Acumbamail subscription ──
    if (ACUMBAMAIL_KEY) {
      try {
        const acumbaRes = await fetch('https://acumbamail.com/api/1/addSubscriber/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            auth_token: ACUMBAMAIL_KEY,
            list_id: LIST_ID,
            email: cleanEmail,
            extra_fields: {
              SOURCE: cleanSource,
              TAG: cleanTag
            }
          })
        });
        if (!acumbaRes.ok) {
          const errText = await acumbaRes.text().catch(() => 'unknown');
          logger.error('acumbamail_failed', { status: acumbaRes.status, errText, email: cleanEmail });
          warnings.push('email_list');
        }
      } catch (acumbaErr) {
        logger.error('acumbamail_error', { email: cleanEmail }, acumbaErr);
        warnings.push('email_list');
      }
    } else {
      logger.warn('acumbamail_not_configured', { reason: 'ACUMBAMAIL_API_KEY not set' });
      warnings.push('email_list_config');
    }

    // ── n8n nurture sequence webhook ──
    try {
      const n8nRes = await fetch('https://n8n.audreysplace.place/webhook/crop-lead-nurture-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, source: cleanSource, tag: cleanTag, leadTier: 'warm', guideUrl: 'https://pacropservices.com/pa-annual-report-compliance-checklist.pdf' })
      });
      if (!n8nRes.ok) {
        const errText = await n8nRes.text().catch(() => 'unknown');
        logger.error('n8n_webhook_failed', { status: n8nRes.status, errText, email: cleanEmail });
        warnings.push('nurture_sequence');
      }
    } catch (n8nErr) {
      logger.error('n8n_webhook_error', { email: cleanEmail }, n8nErr);
      warnings.push('nurture_sequence');
    }

    // Track metrics
    await db.incrementMetric('subscribe').catch(e => console.error('Silent failure:', e.message));
    if (warnings.length > 0) await db.incrementMetric('subscribe_partial').catch(e => console.error('Silent failure:', e.message));
    logger.info('subscribe_complete', { email: cleanEmail, source: cleanSource, warnings });

    // Return success with visibility into partial failures
    return res.status(200).json({
      success: true,
      ...(warnings.length > 0 && { warnings, partial: true })
    });
  } catch (err) {
    logger.error('unexpected_error', {}, err);
    return res.status(500).json({ error: 'Something went wrong processing your request. Please try again or call 814-228-2822.' });
  }
}
