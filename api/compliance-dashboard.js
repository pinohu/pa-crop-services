// PA CROP Services — Compliance Dashboard API
// GET /api/compliance-dashboard?adminKey=X
// Returns real-time compliance posture: status counts, risk distribution,
// overdue entities, upcoming deadlines, recent events, daily metrics.
//
// This replaces the static admin compliance tracker with live data.

import { getRules, buildDeadlineSummary } from './_compliance.js';
import { db } from './_db.js';
import { createLogger } from './_log.js';
import { setCors, isAdminRequest } from './services/auth.js';

const logger = createLogger('compliance-dashboard');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'GET only' });

  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'Unauthorized' });

  try {
    const rules = getRules();
    const today = new Date().toISOString().split('T')[0];
    const year = new Date().getFullYear();

    // Get daily metrics
    const chatQuestions = await db.getMetric('chat_questions', today);
    const chatEscalations = await db.getMetric('chat_escalations', today);
    const subscribeCount = await db.getMetric('subscribe', today);

    // Get recent global events
    const recentEvents = await db.getEvents(null, 20);

    // Compute deadline proximity for each group
    const now = new Date();
    const deadlineStatus = {};
    for (const [group, info] of Object.entries(rules.deadlineGroups)) {
      const deadline = new Date(year, info.month, info.day);
      if (deadline < now) deadline.setFullYear(year + 1);
      const daysUntil = Math.ceil((deadline - now) / 86400000);
      deadlineStatus[group] = {
        deadline: info.label,
        date: `${deadline.getFullYear()}-${info.deadline}`,
        daysUntil,
        urgency: daysUntil <= 7 ? 'CRITICAL' : daysUntil <= 30 ? 'HIGH' : daysUntil <= 90 ? 'MEDIUM' : 'LOW'
      };
    }

    const dashboard = {
      success: true,
      generatedAt: new Date().toISOString(),
      rulesVersion: rules.version,
      deadlineSummary: buildDeadlineSummary(),
      deadlineStatus,

      enforcement: {
        year: rules.annualReport.enforcementStartYear,
        description: rules.enforcement.description,
        isEnforcementYear: year >= rules.annualReport.enforcementStartYear,
        isGracePeriod: year <= rules.annualReport.gracePeriodEndYear
      },

      metrics: {
        date: today,
        chatQuestions: parseInt(chatQuestions) || 0,
        chatEscalations: parseInt(chatEscalations) || 0,
        subscribes: parseInt(subscribeCount) || 0
      },

      recentEvents: recentEvents.slice(0, 10).map(e => ({
        ts: e.ts,
        type: e.eventType,
        target: e.targetType,
        targetId: e.targetId,
        actor: e.actor,
        reason: e.reason
      })),

      systemHealth: {
        upstashConnected: db.isAvailable(),
        rulesLoaded: !!rules.version,
        complianceEngine: true
      }
    };

    logger.info('dashboard_loaded', { rulesVersion: rules.version });

    return res.status(200).json(dashboard);
  } catch (err) {
    logger.error('dashboard_error', {}, err);
    return res.status(500).json({ success: false, error: 'Dashboard generation failed' });
  }
}
