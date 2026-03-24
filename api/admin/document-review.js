import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    const supabase = db.getClient();
    if (!supabase) return res.status(200).json({ items: [] });

    const urgency = req.query.urgency || 'high';
    let query = supabase.from('documents')
      .select('*, organizations(legal_name, entity_type)')
      .in('urgency', urgency === 'all' ? ['normal', 'high', 'critical'] : ['high', 'critical'])
      .eq('review_status', 'pending')
      .order('received_at', { ascending: false })
      .limit(50);

    const { data } = await query;
    return res.status(200).json({ success: true, items: data || [] });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
