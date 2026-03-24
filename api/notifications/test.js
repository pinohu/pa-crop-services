import { setCors, authenticateRequest } from '../services/auth.js';
import { sendEmail } from '../services/notifications.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    const result = await sendEmail(session.email || req.body?.email, 'welcome', {
      client_name: 'Test User', org_name: 'Test Org', plan: 'compliance_only'
    });
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
