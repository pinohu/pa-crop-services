import { setCors, isAdminRequest, authenticateRequest } from '../../services/auth.js';
import { publishRule, writeAuditEvent } from '../../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  const { rule_id } = req.body || {};
  if (!rule_id) return res.status(400).json({ success: false, error: 'missing_rule_id' });

  try {
    const session = await authenticateRequest(req);
    const actorId = session.valid ? session.clientId : 'admin';

    const rule = await publishRule(rule_id);
    await writeAuditEvent({
      actor_type: 'admin', actor_id: actorId,
      event_type: 'rule.published', target_type: 'rule', target_id: rule_id,
      after_json: rule, reason: 'admin_publish'
    });
    return res.status(200).json({ success: true, rule });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
