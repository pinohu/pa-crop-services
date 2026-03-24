import { setCors } from './services/auth.js';
import { getRules } from './_compliance.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { entity_type } = req.method === 'POST' ? (req.body || {}) : req.query;
  if (!entity_type) {
    // Return all entity types for the selector
    const rules = getRules();
    const types = Object.entries(rules.entityTypes).map(([key, val]) => ({
      key, label: val.label, deadline: val.deadline, fee: val.fee
    }));
    return res.status(200).json({ success: true, entity_types: types });
  }

  const rules = getRules();
  const config = rules.entityTypes[entity_type];
  if (!config) return res.status(400).json({ success: false, error: 'unknown_entity_type' });

  const now = new Date();
  const year = now.getFullYear();
  const deadlineDate = new Date(`${year}-${config.deadlineMonth}-${config.deadlineDay}`);
  if (deadlineDate < now) deadlineDate.setFullYear(year + 1);
  const daysUntil = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

  const enforcement = rules.enforcement || {};
  const gracePeriod = enforcement.gracePeriodEnd ? new Date(enforcement.gracePeriodEnd) > now : false;

  return res.status(200).json({
    success: true,
    result: {
      entity_type,
      label: config.label,
      deadline: config.deadline,
      deadline_date: deadlineDate.toISOString().split("T")[0],
      days_until: daysUntil,
      fee: config.fee,
      filing_url: "https://file.dos.pa.gov",
      form: "DSCB:15-146",
      consequence: config.consequence,
      can_reinstate: config.canReinstate,
      enforcement_starts: enforcement.enforcementStartYear || 2027,
      grace_period_active: gracePeriod,
      risk_level: daysUntil < 0 ? 'overdue' : daysUntil < 14 ? 'critical' : daysUntil < 30 ? 'high' : daysUntil < 60 ? 'medium' : 'low',
      recommendation: daysUntil < 0
        ? 'Your annual report is overdue. File immediately at file.dos.pa.gov to avoid administrative action.'
        : daysUntil < 30
        ? `Your deadline is ${daysUntil} days away. File soon to avoid complications.`
        : `You have ${daysUntil} days until your deadline. You\'re in good shape.`,
      cta: {
        label: 'Let us handle your compliance',
        url: 'https://pacropservices.com/#plans'
      }
    }
  });
}
