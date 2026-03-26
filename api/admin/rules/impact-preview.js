// PA CROP Services — Rule Impact Preview
// Before publishing a rule change, show which entities and obligations
// would be affected. Safety mechanism for legal accuracy.

import { setCors, isAdminRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';
import { createLogger } from '../../_log.js';

const log = createLogger('impact-preview');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  const { rule_id, jurisdiction, entity_type, obligation_type } = req.body || {};

  try {
    if (!db.isConnected()) {
      // Fallback: compute from JSON rules
      const { getRules } = await import('../../_compliance.js');
      const rules = getRules();
      const types = Object.keys(rules.entityTypes || {});
      const matchingTypes = entity_type
        ? types.filter(t => t === entity_type)
        : types;

      return res.status(200).json({
        success: true,
        mode: 'estimate',
        preview: {
          affected_entity_types: matchingTypes,
          affected_entity_count: 'Unknown — connect Neon to see exact count',
          affected_obligations_count: 'Unknown',
          current_rule: matchingTypes.length > 0 ? rules.entityTypes[matchingTypes[0]] : null,
          warning: 'This is an estimate. Connect Neon Postgres for exact impact analysis.'
        }
      });
    }

    const sql = db.getSql();

    // Get the rule being previewed
    let rule = null;
    if (rule_id) {
      const rows = await sql.query('SELECT * FROM rules WHERE id = $1', [rule_id]);
      rule = rows?.[0];
    }

    const targetJurisdiction = rule?.jurisdiction || jurisdiction || 'PA';
    const targetEntityType = rule?.entity_type || entity_type;
    const targetObligationType = rule?.obligation_type || obligation_type || 'annual_report';

    // Count affected organizations
    let orgQuery = 'SELECT COUNT(*) as count FROM organizations WHERE jurisdiction = $1';
    let orgParams = [targetJurisdiction];
    if (targetEntityType) {
      orgQuery += ' AND entity_type = $2';
      orgParams.push(targetEntityType);
    }
    const orgCount = await sql.query(orgQuery, orgParams);

    // Count affected obligations
    let oblQuery = 'SELECT COUNT(*) as count FROM obligations WHERE jurisdiction = $1 AND obligation_type = $2';
    let oblParams = [targetJurisdiction, targetObligationType];
    if (targetEntityType) {
      oblQuery += ` AND organization_id IN (SELECT id FROM organizations WHERE entity_type = $3)`;
      oblParams.push(targetEntityType);
    }
    const oblCount = await sql.query(oblQuery, oblParams);

    // Get current active rule being superseded
    let currentRule = null;
    if (targetEntityType) {
      const current = await sql.query(
        'SELECT * FROM rules WHERE jurisdiction = $1 AND entity_type = $2 AND obligation_type = $3 AND is_active = true',
        [targetJurisdiction, targetEntityType, targetObligationType]
      );
      currentRule = current?.[0];
    }

    // Sample affected entities
    let sampleQuery = 'SELECT id, legal_name, entity_type FROM organizations WHERE jurisdiction = $1';
    let sampleParams = [targetJurisdiction];
    if (targetEntityType) {
      sampleQuery += ' AND entity_type = $2';
      sampleParams.push(targetEntityType);
    }
    sampleQuery += ' LIMIT 10';
    const samples = await sql.query(sampleQuery, sampleParams);

    return res.status(200).json({
      success: true,
      preview: {
        target: {
          jurisdiction: targetJurisdiction,
          entity_type: targetEntityType || 'all',
          obligation_type: targetObligationType
        },
        affected_entity_count: parseInt(orgCount[0]?.count || 0),
        affected_obligation_count: parseInt(oblCount[0]?.count || 0),
        current_rule: currentRule ? {
          id: currentRule.id,
          version: currentRule.version,
          effective_date: currentRule.effective_date,
          rule_json: currentRule.rule_json
        } : null,
        new_rule: rule ? {
          id: rule.id,
          version: rule.version,
          rule_json: rule.rule_json
        } : null,
        sample_entities: (samples || []).map(s => ({
          id: s.id,
          name: s.legal_name,
          type: s.entity_type
        })),
        recommendation: parseInt(oblCount[0]?.count || 0) > 0
          ? 'This change will affect existing obligations. Consider running obligation recompute after publishing.'
          : 'No existing obligations will be affected. Safe to publish.'
      }
    });
  } catch (err) {
    log.error('impact_preview_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
