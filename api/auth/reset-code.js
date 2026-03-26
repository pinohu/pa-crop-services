import { setCors, sendAccessCode } from '../services/auth.js';
import { isValidEmail } from '../_validate.js';
import { checkRateLimit, getClientIp } from '../_ratelimit.js';
import { createLogger } from '../_log.js';

const log = createLogger('reset-code');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  // Rate limit: access code requests — 3 per 5 minutes per IP
  const rlResult = await checkRateLimit(getClientIp(req), 'auth-reset-code', 3, '5m');
  if (rlResult) {
    res.setHeader('Retry-After', String(rlResult.retryAfter));
    return res.status(429).json({ success: false, error: 'too_many_requests' });
  }

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ success: false, error: 'missing_email' });
  if (!isValidEmail(email)) return res.status(400).json({ success: false, error: 'invalid_email' });

  try {
    await sendAccessCode(email);
    return res.status(200).json({ success: true });
  } catch (err) {
    log.error('reset_code_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(200).json({ success: true }); // Don't leak whether email exists
  }
}
