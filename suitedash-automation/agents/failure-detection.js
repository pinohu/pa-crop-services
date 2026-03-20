// agents/failure-detection.js — retry policy + DLQ escalation
const { aitable } = require('./config')

async function handleFailure(context) {
  const {
    workflow_name = '',
    node_name = '',
    error_type = '',
    error_message = '',
    contact_id = '',
    retry_count = 0
  } = context || {}

  const n = Number(retry_count) || 0
  if (n < 3) {
    return {
      resolved: false,
      status: 'retrying',
      retry_count: n + 1,
      backoff_minutes: [1, 5, 30][n]
    }
  }

  const tableId = process.env.AITABLE_DLQ_TABLE
  await aitable.createRecord(tableId, {
    workflow_name: String(workflow_name),
    node_name: String(node_name),
    error_type: String(error_type),
    error_message: String(error_message),
    contact_id: String(contact_id),
    payload_summary: String(error_message).slice(0, 500),
    retry_count: n,
    max_retries: 3,
    first_failure: new Date().toISOString(),
    last_retry: new Date().toISOString(),
    status: 'needs_manual_review'
  })

  return {
    resolved: false,
    status: 'needs_manual_review',
    retry_count: n
  }
}

module.exports = { handleFailure }
