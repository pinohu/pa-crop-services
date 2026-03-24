import { setCors } from './services/auth.js';
import { getRules, getEntityConfig } from './_compliance.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { entity_type } = req.method === 'POST' ? (req.body || {}) : req.query;
  if (!entity_type) {
    const rules = getRules();
    const types = Object.entries(rules.entityTypes).map(([key, val]) => ({
      key, label: val.label, deadline: val.deadline, fee: val.fee
    }));
    return res.status(200).json({ success: true, entity_types: types });
  }

  try {
    const config = getEntityConfig(entity_type);
    if (!config) return res.status(400).json({ success: false, error: 'unknown_entity_type' });

    const rules = getRules();
    const deadlineParts = config.deadline.split('-');
    const month = parseInt(deadlineParts[0]);
    const day = parseInt(deadlineParts[1]);
    const monthNames = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

    const now = new Date();
    const year = now.getFullYear();
    let deadlineDate = new Date(year, month - 1, day);
    if (deadlineDate < now) deadlineDate = new Date(year + 1, month - 1, day);
    const daysUntil = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

    const gracePeriod = (rules.annualReport?.gracePeriodEndYear || 2026) >= year;

    return res.status(200).json({
      success: true,
      result: {
        entity_type,
        label: config.label,
        deadline: `${monthNames[month]} ${day}`,
        deadline_date: deadlineDate.toISOString().split('T')[0],
        days_until: daysUntil,
        fee: config.fee,
        filing_url: rules.annualReport?.filingUrl || 'https://file.dos.pa.gov',
        form: rules.annualReport?.form || 'DSCB:15-146',
        consequence: config.dissolutionTerm,
        can_reinstate: config.canReinstate,
        enforcement_starts: rules.annualReport?.enforcementStartYear || 2027,
        grace_period_active: gracePeriod,
        risk_level: daysUntil < 0 ? 'overdue' : daysUntil < 14 ? 'critical' : daysUntil < 30 ? 'high' : daysUntil < 60 ? 'medium' : 'low',
        recommendation: daysUntil < 0
          ? 'Your annual report is overdue. File immediately at file.dos.pa.gov to avoid administrative action.'
          : daysUntil < 30
          ? 'Your deadline is ' + daysUntil + ' days away. File soon to avoid complications.'
          : 'You have ' + daysUntil + ' days until your deadline. You are in good shape.',
        cta: { label: 'Let us handle your compliance', url: 'https://pacropservices.com/#plans' }
      }
    });
  } catch (err) {
    console.error('Compliance check error:', err.message);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
