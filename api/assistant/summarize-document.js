import { setCors, authenticateRequest } from '../services/auth.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  // Document summarization requires OCR + LLM — placeholder for now
  return res.status(200).json({
    success: true,
    answer: 'Document summarization is being set up. Please check back soon.',
    sources: [], confidence: 0.0, escalate: false, next_actions: []
  });
}
