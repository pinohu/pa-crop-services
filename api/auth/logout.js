import { setCors, authenticateRequest } from '../services/auth.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });
  // JWT is stateless — client discards token. Server-side invalidation would require a blocklist.
  return res.status(200).json({ success: true });
}
