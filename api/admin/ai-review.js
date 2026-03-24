import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    const supabase = db.getClient();
    if (!supabase) return res.status(200).json({ items: [] });

    // Get conversations needing review: low confidence OR escalated
    let query = supabase.from('ai_conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(req.query.limit) || 50);

    if (req.query.filter === 'escalated') {
      query = query.eq('escalation_flag', true);
    } else if (req.query.filter === 'low_confidence') {
      query = query.lt('confidence_score', 0.8);
    } else {
      // Default: both
      query = query.or('escalation_flag.eq.true,confidence_score.lt.0.8');
    }

    const { data } = await query;
    return res.status(200).json({ success: true, items: data || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
