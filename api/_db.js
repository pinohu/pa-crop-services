// PA CROP Services — Database Client
// Wraps Upstash Redis for entity state, obligations, and event logging.
// Designed to be replaced by Prisma/Postgres when the domain model deploys.
//
// Usage:
//   import { db } from './_db.js';
//   await db.getEntity('sd_abc123');
//   await db.setEntity('sd_abc123', { ... });
//   await db.logEvent({ ... });
//   await db.getObligation('sd_abc123', 2026);

import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { logWarn } from './_log.js';

// ── Redis client (lazy init) ──
let _redis = null;

function getRedis() {
  if (_redis) return _redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    _redis = new Redis({ url, token });
    return _redis;
  }
  return null;
}

function isAvailable() {
  return !!getRedis();
}

// ── Entity operations ──

async function getEntity(entityId) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const data = await redis.get(`entity:${entityId}`);
    return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
  } catch (err) {
    logWarn('db_get_entity_failed', { entityId, error: err.message });
    return null;
  }
}

async function setEntity(entityId, data) {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.set(`entity:${entityId}`, JSON.stringify(data));
    return true;
  } catch (err) {
    logWarn('db_set_entity_failed', { entityId, error: err.message });
    return false;
  }
}

async function updateEntity(entityId, patch) {
  const existing = await getEntity(entityId);
  if (!existing) return false;
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  return setEntity(entityId, updated);
}

// ── Obligation operations ──

function obligationKey(entityId, year) {
  return `obligation:${entityId}:${year}`;
}

async function getObligation(entityId, year) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const data = await redis.get(obligationKey(entityId, year));
    return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
  } catch (err) {
    logWarn('db_get_obligation_failed', { entityId, year, error: err.message });
    return null;
  }
}

async function setObligation(entityId, year, data) {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.set(obligationKey(entityId, year), JSON.stringify(data));
    return true;
  } catch (err) {
    logWarn('db_set_obligation_failed', { entityId, year, error: err.message });
    return false;
  }
}

async function updateObligation(entityId, year, patch) {
  const existing = await getObligation(entityId, year);
  if (!existing) return false;
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  return setObligation(entityId, year, updated);
}

// ── Event log (append-only) ──

async function logEvent({ actor, eventType, targetType, targetId, orgId, beforeState, afterState, reason, metadata }) {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const event = {
      id: `evt_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
      ts: new Date().toISOString(),
      actor,
      eventType,
      targetType,
      targetId,
      orgId,
      beforeState,
      afterState,
      reason,
      metadata
    };
    // Append to org-specific event list (capped at 1000 events per org)
    if (orgId) {
      await redis.lpush(`events:${orgId}`, JSON.stringify(event));
      await redis.ltrim(`events:${orgId}`, 0, 999);
    }
    // Also append to global event stream (capped at 5000)
    await redis.lpush('events:global', JSON.stringify(event));
    await redis.ltrim('events:global', 0, 4999);
    return true;
  } catch (err) {
    logWarn('db_log_event_failed', { eventType, targetId, error: err.message });
    return false;
  }
}

async function getEvents(orgId, limit = 50) {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const key = orgId ? `events:${orgId}` : 'events:global';
    const raw = await redis.lrange(key, 0, limit - 1);
    return raw.map(r => typeof r === 'string' ? JSON.parse(r) : r);
  } catch (err) {
    logWarn('db_get_events_failed', { orgId, error: err.message });
    return [];
  }
}

// ── Conversation audit log ──

async function logConversationToDb({ sessionId, clientEmail, orgId, entityType, userMessage, response, intent, sources, confidence, escalated }) {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const entry = {
      ts: new Date().toISOString(),
      sessionId,
      clientEmail,
      entityType,
      userMessage: userMessage?.substring(0, 500),
      response: response?.substring(0, 500),
      intent,
      sources,
      confidence,
      escalated: !!escalated
    };
    const key = orgId ? `conversations:${orgId}` : `conversations:anon:${sessionId}`;
    await redis.lpush(key, JSON.stringify(entry));
    await redis.ltrim(key, 0, 199); // Keep last 200 per org
    // Daily counter
    const today = new Date().toISOString().split('T')[0];
    await redis.incr(`metric:chat_questions:${today}`);
    if (escalated) await redis.incr(`metric:chat_escalations:${today}`);
    if (intent) await redis.incr(`metric:chat_intent:${intent}:${today}`);
    return true;
  } catch (err) {
    logWarn('db_log_conversation_failed', { sessionId, error: err.message });
    return false;
  }
}

// ── Metrics ──

async function incrementMetric(name, amount = 1) {
  const redis = getRedis();
  if (!redis) return;
  try {
    const today = new Date().toISOString().split('T')[0];
    await redis.incrby(`metric:${name}:${today}`, amount);
  } catch (err) {
    // Silent — metrics are non-critical
  }
}

async function getMetric(name, date) {
  const redis = getRedis();
  if (!redis) return 0;
  try {
    const d = date || new Date().toISOString().split('T')[0];
    return (await redis.get(`metric:${name}:${d}`)) || 0;
  } catch (err) {
    return 0;
  }
}

// ── Export ──

export const db = {
  isAvailable,
  getEntity,
  setEntity,
  updateEntity,
  getObligation,
  setObligation,
  updateObligation,
  logEvent,
  getEvents,
  logConversationToDb,
  incrementMetric,
  getMetric
};
