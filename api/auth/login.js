import { setCors } from '../services/auth.js';
import { verifyAccessCode, createSession } from '../services/auth.js';
import { writeAuditEvent } from '../services/db.js';
import { isValidEmail } from '../_validate.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const { email, access_code } = req.body || {};
  if (!email || !access_code) return res.status(400).json({ success: false, error: 'missing_email_or_code' });
  if (!isValidEmail(email)) return res.status(400).json({ success: false, error: 'invalid_email' });

  try {
    const result = await verifyAccessCode(email, access_code);
    if (!result.valid) return res.status(401).json({ success: false, error: result.error });

    const session = await createSession(result.client);
    await writeAuditEvent({
      actor_type: 'client', actor_id: result.client.id,
      event_type: 'client.login', target_type: 'client', target_id: result.client.id,
      reason: 'access_code_login'
    });

    return res.status(200).json({
      success: true,
      session,
      client: {
        id: result.client.id,
        organization_id: result.client.organization_id,
        plan_code: result.client.plan_code,
        roles: result.client.roles || ['client']
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
