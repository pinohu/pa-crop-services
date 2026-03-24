// PA CROP Services — Compliance Rules API
// GET /api/compliance-rules
// Returns the canonical compliance rules (deadlines, fees, entity types, enforcement)
// Public endpoint — used by portal, chatbot, and partner widgets

import { getRules, getEntityDeadline, computeDaysUntil, getEntityConfig, buildDeadlineSummary } from './_compliance.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Public reference data
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  const { entityType, field } = req.query || {};

  // If entity type specified, return entity-specific info
  if (entityType) {
    const config = getEntityConfig(entityType);
    const deadline = getEntityDeadline(entityType);
    const days = computeDaysUntil(entityType);

    return res.status(200).json({
      success: true,
      entityType: config.key,
      label: config.label,
      deadline: deadline.label,
      deadlineDate: deadline.date,
      daysUntilDeadline: days,
      fee: config.fee,
      dissolutionTerm: config.dissolutionTerm,
      canReinstate: config.canReinstate,
      category: config.category
    });
  }

  // If specific field requested, return just that
  if (field) {
    const rules = getRules();
    const value = rules[field];
    if (value === undefined) {
      return res.status(404).json({ error: `Field '${field}' not found in rules` });
    }
    return res.status(200).json({ success: true, field, value });
  }

  // Default: return full rules
  return res.status(200).json({
    success: true,
    summary: buildDeadlineSummary(),
    rules: getRules()
  });
}
