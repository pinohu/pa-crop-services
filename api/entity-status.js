// PA CROP Services — Entity Status API
// GET  /api/entity-status?entityId=X       → Get entity + current obligation
// POST /api/entity-status { entityId, action, ... } → Create/update entity, transition state
//
// This is the primary read/write interface for the compliance engine.
// Portal, admin dashboard, n8n workflows, and agents all use this endpoint.

import { getEntityConfig, getEntityDeadline, computeDaysUntil } from './_compliance.js';
import { obligations } from './_obligations.js';
import { db } from './_db.js';
import { createLogger } from './_log.js';

const logger = createLogger('entity-status');

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;

function isAdmin(req) {
  const key = req.headers['x-admin-key'];
  return key === ADMIN_KEY;
}

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: Read entity + obligation status ──
  if (req.method === 'GET') {
    const { entityId, email, year } = req.query || {};
    if (!entityId && !email) return res.status(400).json({ error: 'entityId or email required' });

    const id = entityId || `email:${email}`;
    const entity = await db.getEntity(id);

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found', entityId: id });
    }

    const y = parseInt(year) || new Date().getFullYear();
    const ob = await obligations.load(id, y, entity);
    const evaluation = ob ? obligations.evaluate(ob) : null;

    logger.info('entity_status_read', { entityId: id, entityType: entity.entityType, status: entity.status });

    return res.status(200).json({
      success: true,
      entity,
      obligation: evaluation?.obligation || ob,
      actions: evaluation?.actions || [],
      riskLevel: evaluation?.riskLevel || 'UNKNOWN'
    });
  }

  // ── POST: Write operations ──
  if (req.method === 'POST') {
    const { action, entityId, ...payload } = req.body || {};
    if (!action) return res.status(400).json({ error: 'action required' });

    switch (action) {

      // ── Register a new entity in the compliance engine ──
      case 'register': {
        const { name, entityType, dosNumber, email, plan, jurisdiction } = payload;
        if (!name || !entityType) return res.status(400).json({ error: 'name and entityType required' });

        const id = entityId || dosNumber || `email:${email}`;
        const config = getEntityConfig(entityType);
        const deadline = getEntityDeadline(entityType);
        const days = computeDaysUntil(entityType);

        const entity = {
          id,
          name,
          entityType: config.key,
          entityTypeLabel: config.label,
          jurisdiction: jurisdiction || 'PA',
          dosNumber: dosNumber || null,
          status: 'ACTIVE',
          riskLevel: 'LOW',
          plan: plan || 'compliance_only',
          email: email || null,
          deadline: deadline.label,
          deadlineDate: deadline.date,
          daysUntilDeadline: days,
          filings: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await db.setEntity(id, entity);

        // Auto-compute current year obligation
        const year = new Date().getFullYear();
        const ob = obligations.computeForEntity(entity, year);
        await obligations.save(id, year, ob);

        await db.logEvent({
          actor: isAdmin(req) ? 'admin' : 'system',
          eventType: 'entity_registered',
          targetType: 'organization',
          targetId: id,
          orgId: id,
          afterState: entity,
          reason: 'New entity registered in compliance engine'
        });

        logger.info('entity_registered', { entityId: id, entityType: config.key, plan });

        return res.status(201).json({ success: true, entity, obligation: ob });
      }

      // ── Transition obligation state ──
      case 'transition': {
        if (!entityId) return res.status(400).json({ error: 'entityId required' });
        const { year, newStatus, reason, context } = payload;
        const y = parseInt(year) || new Date().getFullYear();

        const entity = await db.getEntity(entityId);
        if (!entity) return res.status(404).json({ error: 'Entity not found' });

        const ob = await obligations.load(entityId, y, entity);
        if (!ob) return res.status(404).json({ error: 'Obligation not found' });

        const updated = obligations.transition(ob, newStatus, context || {}, isAdmin(req) ? 'admin' : 'system');
        if (!updated) {
          return res.status(400).json({
            error: `Invalid transition: ${ob.status} → ${newStatus}`,
            validTransitions: obligations.TRANSITIONS[ob.status] || []
          });
        }

        await obligations.save(entityId, y, updated);

        // Update entity risk level based on new obligation state
        const evaluation = obligations.evaluate(updated);
        await db.updateEntity(entityId, { riskLevel: evaluation.riskLevel, status: mapObligationToEntityStatus(updated.status) });

        logger.info('obligation_transitioned', { entityId, year: y, from: ob.status, to: newStatus, riskLevel: evaluation.riskLevel });

        return res.status(200).json({ success: true, obligation: updated, riskLevel: evaluation.riskLevel, actions: evaluation.actions });
      }

      // ── Record a filing ──
      case 'file': {
        if (!entityId) return res.status(400).json({ error: 'entityId required' });
        const { year, confirmationNumber, filedBy } = payload;
        const y = parseInt(year) || new Date().getFullYear();

        const entity = await db.getEntity(entityId);
        if (!entity) return res.status(404).json({ error: 'Entity not found' });

        const ob = await obligations.load(entityId, y, entity);
        if (!ob) return res.status(404).json({ error: 'Obligation not found' });

        const filed = obligations.transition(ob, 'FILED', {
          filedAt: new Date().toISOString(),
          filedBy: filedBy || (isAdmin(req) ? 'admin' : 'client'),
          confirmationNum: confirmationNumber || null,
          reason: 'Annual report filed'
        }, isAdmin(req) ? 'admin' : 'client');

        if (!filed) {
          return res.status(400).json({ error: `Cannot file from status: ${ob.status}`, currentStatus: ob.status });
        }

        await obligations.save(entityId, y, filed);
        await db.updateEntity(entityId, { riskLevel: 'LOW', status: 'ACTIVE' });

        logger.info('filing_recorded', { entityId, year: y, confirmationNumber, filedBy: filed.filedBy });

        return res.status(200).json({ success: true, obligation: filed });
      }

      // ── Evaluate (read-only: what actions are needed?) ──
      case 'evaluate': {
        if (!entityId) return res.status(400).json({ error: 'entityId required' });
        const { year } = payload;
        const y = parseInt(year) || new Date().getFullYear();

        const entity = await db.getEntity(entityId);
        if (!entity) return res.status(404).json({ error: 'Entity not found' });

        const ob = await obligations.load(entityId, y, entity);
        if (!ob) return res.status(404).json({ error: 'Obligation not found' });

        const evaluation = obligations.evaluate(ob);

        return res.status(200).json({ success: true, ...evaluation });
      }

      // ── Record reminder sent ──
      case 'reminder_sent': {
        if (!entityId) return res.status(400).json({ error: 'entityId required' });
        const { year, daysBeforeDeadline, channel } = payload;
        const y = parseInt(year) || new Date().getFullYear();

        const entity = await db.getEntity(entityId);
        if (!entity) return res.status(404).json({ error: 'Entity not found' });

        const ob = await obligations.load(entityId, y, entity);
        if (!ob) return res.status(404).json({ error: 'Obligation not found' });

        // Transition to REMINDER_SENT if not already past that state
        let updated = ob;
        if (['DETECTED', 'UPCOMING'].includes(ob.status)) {
          updated = obligations.transition(ob, 'REMINDER_SENT', {
            daysSent: daysBeforeDeadline,
            reason: `${daysBeforeDeadline}-day reminder sent via ${channel || 'email'}`
          }, 'system');
        } else {
          // Already past REMINDER_SENT — just append to remindersSent
          updated = { ...ob, remindersSent: [...(ob.remindersSent || []), daysBeforeDeadline], updatedAt: new Date().toISOString() };
        }

        await obligations.save(entityId, y, updated);

        await db.logEvent({
          actor: 'system',
          eventType: 'reminder_sent',
          targetType: 'obligation',
          targetId: `${entityId}:${y}`,
          orgId: entityId,
          afterState: { daysBeforeDeadline, channel, remindersSent: updated.remindersSent },
          reason: `${daysBeforeDeadline}-day reminder`
        });

        logger.info('reminder_recorded', { entityId, year: y, daysBeforeDeadline, channel });

        return res.status(200).json({ success: true, obligation: updated });
      }

      // ── Get event history ──
      case 'events': {
        if (!entityId) return res.status(400).json({ error: 'entityId required' });
        const events = await db.getEvents(entityId, payload.limit || 50);
        return res.status(200).json({ success: true, events });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}`, validActions: ['register', 'transition', 'file', 'evaluate', 'reminder_sent', 'events'] });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Map obligation status to entity-level status
function mapObligationToEntityStatus(obStatus) {
  switch (obStatus) {
    case 'FILED':
    case 'CONFIRMED':
    case 'RESOLVED': return 'ACTIVE';
    case 'UPCOMING':
    case 'REMINDER_SENT':
    case 'AWAITING_CLIENT':
    case 'READY_TO_FILE': return 'DUE_SOON';
    case 'OVERDUE': return 'OVERDUE';
    case 'ESCALATED': return 'AT_RISK';
    default: return 'ACTIVE';
  }
}
