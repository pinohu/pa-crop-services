import { setCors, authenticateRequest, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';


export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  // Document retrieval by ID would need a getDocument(id) query
  return res.status(200).json({ success: true, message: 'Document detail endpoint' });
}
