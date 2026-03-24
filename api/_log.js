// PA CROP Services — Structured Logging
// JSON-formatted logs for Vercel function logs, drainable to Axiom/Betterstack.
//
// Usage:
//   import { log, logError, logWarn } from './_log.js';
//   log('filing_reminder_sent', { orgId: 'abc', entityType: 'domestic_llc', daysUntilDeadline: 30 });
//   logError('suitedash_lookup_failed', { email: 'x@y.com', status: 503 }, err);
//   logWarn('rate_limit_fallback', { reason: 'upstash_unreachable' });

/**
 * Structured log entry. Outputs JSON to stdout for Vercel log drain.
 * @param {'info'|'warn'|'error'|'debug'} level
 * @param {string} event - Machine-readable event name (snake_case)
 * @param {object} [data] - Structured context
 */
function _log(level, event, data = {}) {
  const entry = {
    ts: new Date().toISOString(),
    service: 'pa-crop',
    level,
    event,
    ...data
  };
  // Vercel captures stdout/stderr as function logs
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export function log(event, data) { _log('info', event, data); }
export function logWarn(event, data) { _log('warn', event, data); }
export function logDebug(event, data) { _log('debug', event, data); }

/**
 * Log an error with optional Error object for stack trace.
 * @param {string} event
 * @param {object} data
 * @param {Error} [err]
 */
export function logError(event, data = {}, err = null) {
  _log('error', event, {
    ...data,
    ...(err && { errorMessage: err.message, errorStack: err.stack?.split('\n').slice(0, 5).join(' | ') })
  });
}

/**
 * Create a scoped logger for a specific API handler.
 * Automatically includes the handler name in every log.
 * @param {string} handler - e.g., 'chat', 'subscribe', 'client-context'
 */
export function createLogger(handler) {
  return {
    info: (event, data) => log(event, { handler, ...data }),
    warn: (event, data) => logWarn(event, { handler, ...data }),
    error: (event, data, err) => logError(event, { handler, ...data }, err),
    debug: (event, data) => logDebug(event, { handler, ...data }),
  };
}

/**
 * Log a chatbot interaction for the audit trail.
 * This is the foundation for the Conversation model.
 */
export function logConversation({ sessionId, clientEmail, orgId, entityType, userMessage, response, intent, sources, confidence, escalated, escalationReason }) {
  log('ai_conversation', {
    sessionId,
    clientEmail,
    orgId,
    entityType,
    userMessage: userMessage?.substring(0, 200), // truncate for log storage
    responsePreview: response?.substring(0, 200),
    intent,
    sources,
    confidence,
    escalated: !!escalated,
    escalationReason
  });
}

/**
 * Log a state change for the audit trail.
 * This is the foundation for the AuditEvent model.
 */
export function logStateChange({ actor, eventType, targetType, targetId, orgId, beforeState, afterState, reason }) {
  log('state_change', {
    actor,
    eventType,
    targetType,
    targetId,
    orgId,
    beforeState,
    afterState,
    reason
  });
}
