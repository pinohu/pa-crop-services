import { setCors, isAdminRequest, authenticateRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';
import { createLogger } from '../../_log.js';

const log = createLogger('publish');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  const { rule_id, recompute_obligations } = req.body || {};
  if (!rule_id) return res.status(400).json({ success: false, error: 'missing_rule_id' });

  try {
    const session = await authenticateRequest(req);
    const actorId = session.valid ? session.clientId : 'admin';

    const rule = await db.publishRule(rule_id);
    await db.writeAuditEvent({
      actor_type: 'admin', actor_id: actorId,
      event_type: 'rule.published', target_type: 'rule', target_id: rule_id,
      after_json: rule, reason: 'admin_publish'
    });

    // Trigger obligation recomputation for all affected entities
    let recomputeResult = null;
    if (recompute_obligations !== false && rule?.entity_type && db.isConnected()) {
      try {
        const sql = db.getSql();
        // Find all orgs matching this rule's entity type
        const orgs = await sql.query(
          'SELECT id FROM organizations WHERE entity_type = $1 AND entity_status != $2',
          [rule.entity_type, 'dissolved']
        );

        if (orgs?.length > 0) {
          const { computeObligations } = await import('../../services/obligations.js');
          const year = new Date().getFullYear();
          let updated = 0;
          for (const org of orgs) {
            try {
              await computeObligations(org.id, year);
              updated++;
            } catch (e) {
              log.error('recompute_failed_for_org_org_id', {}, e instanceof Error ? e : new Error(String(e)));
            }
          }
          recomputeResult = { entities_affected: orgs.length, obligations_updated: updated };
        }
      } catch (e) {
        log.error('obligation_recompute_failed', {}, e instanceof Error ? e : new Error(String(e)));
        recomputeResult = { error: e.message };
      }
    }

    return res.status(200).json({ success: true, rule, recompute: recomputeResult });
  } catch (err) {
    log.error('rule_publish_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
