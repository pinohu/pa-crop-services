import { setCors, authenticateRequest, isAdminRequest } from '../services/auth.js';
import { sendEmail } from '../services/notifications.js';
import { createLogger } from '../_log.js';

const log = createLogger('test');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  // Only admin or the user themselves can send test notifications
  if (!isAdminRequest(req) && !session.email) {
    return res.status(403).json({ success: false, error: 'admin_or_self_only' });
  }

  try {
    const { email, template, variables } = req.body || {};
    const targetEmail = isAdminRequest(req) ? (email || session.email) : session.email;
    const templateId = template || 'welcome';

    const result = await sendEmail(targetEmail, templateId, {
      client_name: variables?.client_name || session.name || 'Test User',
      org_name: variables?.org_name || 'Test Organization',
      plan: variables?.plan || session.plan || 'compliance_only',
      ...variables
    });

    return res.status(200).json({ success: true, sent_to: targetEmail, template: templateId, ...result });
  } catch (err) {
    log.error('test_notification_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
