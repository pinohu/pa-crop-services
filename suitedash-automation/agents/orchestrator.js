// agents/orchestrator.js — route events to agent modules
const { aitable, log } = require('./config')
const { scoreLoad } = require('./lead-qualification')
const { sendCommunication } = require('./client-communication')
const { handleFailure } = require('./failure-detection')
const { runAudit } = require('./qa-audit')
const { calculateMetrics } = require('./performance-analytics')

async function handleEvent(event) {
  const event_type = event?.event_type
  const source = event?.source || 'unknown'
  let agentName = 'none'
  let result = null

  try {
    switch (event_type) {
      case 'kickoff_form_submitted':
      case 'lead_form_submitted':
        agentName = 'lead-qualification'
        result = await scoreLoad(event.payload || {})
        break
      case 'engagement_score_dropped':
        agentName = 'client-communication'
        result = await sendCommunication(
          event.payload?.contact_id,
          'engagement_drop',
          event.payload
        )
        break
      case 'milestone_reached':
        agentName = 'client-communication'
        result = await sendCommunication(event.payload?.contact_id, 'milestone', event.payload)
        break
      case 'subscription_cancelled':
        agentName = 'client-communication'
        result = await sendCommunication(event.payload?.contact_id, 'win_back', event.payload)
        break
      case 'workflow_failed':
      case 'payment_failed':
        agentName = 'failure-detection'
        result = await handleFailure(event.payload)
        break
      case 'daily_audit':
        agentName = 'qa-audit'
        result = await runAudit()
        break
      case 'daily_analytics':
        agentName = 'performance-analytics'
        result = await calculateMetrics()
        break
      default:
        agentName = 'orchestrator'
        log('orchestrator', `Unknown event type: ${event_type}`)
        result = null
    }
  } catch (e) {
    log('orchestrator', `Handler error: ${e.message}`)
    result = { error: e.message }
  }

  const contact_id = event?.payload?.contact_id != null ? String(event.payload.contact_id) : ''

  await aitable.createRecord(process.env.AITABLE_EVENT_LOG_TABLE, {
    event_type: String(event_type || ''),
    contact_id,
    timestamp: new Date().toISOString(),
    status: 'routed',
    routed_to: agentName,
    source: String(source)
  })

  return {
    event_type: event_type || '',
    routed_to: agentName,
    result,
    timestamp: new Date().toISOString()
  }
}

module.exports = { handleEvent }
