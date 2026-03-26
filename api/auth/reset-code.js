import { setCors, sendAccessCode } from '../services/auth.js';
import { isValidEmail } from '../_validate.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ success: false, error: 'missing_email' });
  if (!isValidEmail(email)) return res.status(400).json({ success: false, error: 'invalid_email' });

  try {
    await sendAccessCode(email);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Reset code error:', err.message);
    return res.status(200).json({ success: true }); // Don't leak whether email exists
  }
}
