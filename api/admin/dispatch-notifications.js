// PA CROP Services — Notification Dispatcher
// POST /api/admin/dispatch-notifications { limit? }
// Processes pending notifications from the notifications table.
// Sends email/SMS, updates delivery status, retries on failure, dead-letters after max retries.
// Called by n8n cron (every 15 min) or Vercel cron.

import { setCors, isAdminRequest } from '../services/auth.js';
import * as db from '../services/db.js';
import { processPending, notifyAdmin } from '../services/notifications.js';
import { createLogger } from '../_log.js';

const log = createLogger('dispatch-notifications');

const MAX_RETRIES = 3;

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });
  if (!isAdminRequest(req)) return res.status(403).json({ success: false, error: 'admin_required' });
  if (!db.isConnected()) return res.status(503).json({ success: false, error: 'database_unavailable' });

  try {
    // Process all pending notifications
    const results = await processPending();

    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    // Dead-letter notifications that have exceeded max retries
    const sql = db.getSql();
    let deadLettered = 0;
    if (sql) {
      const staleNotifs = await sql`
        SELECT id FROM notifications
        WHERE delivery_status = 'failed' AND retry_count >= ${MAX_RETRIES}
      `;
      for (const n of (staleNotifs || [])) {
        await db.updateNotification(n.id, { delivery_status: 'dead_letter' });
        deadLettered++;
      }
    }

    // Alert admin if there are dead-lettered notifications
    if (deadLettered > 0) {
      notifyAdmin('Notifications Dead-Lettered',
        `<p>${deadLettered} notification(s) failed after ${MAX_RETRIES} retries and have been dead-lettered.</p>
         <p>Check the admin panel to investigate.</p>`
      ).catch(() => {});
    }

    // Audit
    if (results.length > 0) {
      db.writeAuditEvent({
        actor_type: 'system', actor_id: 'notification-dispatcher',
        event_type: 'notifications.batch_dispatched',
        target_type: 'notifications', target_id: null,
        after_json: { processed: results.length, sent, failed, dead_lettered: deadLettered },
        reason: 'scheduled_dispatch'
      }).catch(() => {});
    }

    log.info('notifications_dispatched', { processed: results.length, sent, failed, deadLettered });

    return res.status(200).json({
      success: true,
      processed: results.length,
      sent,
      failed,
      dead_lettered: deadLettered,
      items: results
    });
  } catch (err) {
    log.error('dispatch_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
