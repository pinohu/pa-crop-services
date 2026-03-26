// PA CROP Services — Admin Notification Operations Console
// Visibility into reminder reliability: delivery stats, failures, retries, performance.

import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';
import { createLogger } from '../_log.js';

const log = createLogger('notification-ops');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });

  try {
    if (!db.isConnected()) return res.status(200).json({ success: true, mode: 'no_db', stats: {}, items: [] });

    const sql = db.getSql();

    // Aggregate stats
    const stats = await sql.query(`
      SELECT
        delivery_status,
        channel,
        COUNT(*) as count
      FROM notifications
      GROUP BY delivery_status, channel
      ORDER BY delivery_status
    `);

    const summary = { total: 0, sent: 0, delivered: 0, scheduled: 0, failed: 0, bounced: 0, by_channel: {} };
    for (const s of (stats || [])) {
      const count = parseInt(s.count);
      summary.total += count;
      if (s.delivery_status === 'sent' || s.delivery_status === 'delivered') summary.sent += count;
      else if (s.delivery_status === 'scheduled') summary.scheduled += count;
      else if (s.delivery_status === 'failed') summary.failed += count;
      else if (s.delivery_status === 'bounced') summary.bounced += count;
      if (!summary.by_channel[s.channel]) summary.by_channel[s.channel] = 0;
      summary.by_channel[s.channel] += count;
    }
    summary.delivery_rate = summary.total > 0 ? Math.round(summary.sent / summary.total * 100) : 0;

    // Recent failures
    const failures = await sql.query(`
      SELECT n.*, o.legal_name, o.entity_type
      FROM notifications n
      LEFT JOIN organizations o ON n.organization_id = o.id
      WHERE n.delivery_status IN ('failed', 'bounced')
      ORDER BY n.scheduled_for DESC
      LIMIT 50
    `);

    // Upcoming scheduled
    const scheduled = await sql.query(`
      SELECT n.*, o.legal_name
      FROM notifications n
      LEFT JOIN organizations o ON n.organization_id = o.id
      WHERE n.delivery_status = 'scheduled'
      ORDER BY n.scheduled_for ASC
      LIMIT 20
    `);

    // Template performance
    const templateStats = await sql.query(`
      SELECT
        template_id,
        COUNT(*) as total,
        SUM(CASE WHEN delivery_status IN ('sent','delivered') THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM notifications
      WHERE template_id IS NOT NULL
      GROUP BY template_id
      ORDER BY total DESC
    `);

    return res.status(200).json({
      success: true,
      summary,
      failures: (failures || []).map(f => ({
        id: f.id, entity: f.legal_name, channel: f.channel,
        template: f.template_id, status: f.delivery_status,
        retry_count: f.retry_count, scheduled: f.scheduled_for,
        error: f.metadata?.error
      })),
      scheduled: (scheduled || []).map(s => ({
        id: s.id, entity: s.legal_name, channel: s.channel,
        template: s.template_id, scheduled: s.scheduled_for
      })),
      template_performance: (templateStats || []).map(t => ({
        template: t.template_id,
        total: parseInt(t.total),
        delivered: parseInt(t.delivered),
        failed: parseInt(t.failed),
        rate: parseInt(t.total) > 0 ? Math.round(parseInt(t.delivered) / parseInt(t.total) * 100) : 0
      }))
    });
  } catch (err) {
    log.error('notification_ops_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
