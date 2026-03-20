// agents/performance-analytics.js — roll up KPIs into daily_analytics
const { aitable, recordsFromResponse } = require('./config')

async function fetchAllRecords(tableId, pageSize = 500) {
  if (!tableId) return []
  const all = []
  let pageNum = 1
  for (let i = 0; i < 20; i++) {
    const data = await aitable.getRecords(tableId, { pageSize, pageNum })
    if (!data) break
    const batch = recordsFromResponse(data)
    all.push(...batch)
    if (batch.length < pageSize) break
    pageNum += 1
  }
  return all
}

async function calculateMetrics() {
  const clientsTable = process.env.AITABLE_CLIENTS_TABLE
  const engagementTable = process.env.AITABLE_ENGAGEMENT_TABLE
  const dlqTable = process.env.AITABLE_DLQ_TABLE
  const configTable = process.env.AITABLE_SYSTEM_CONFIG_TABLE
  const analyticsTable = process.env.AITABLE_ANALYTICS_TABLE

  const clientRows = await fetchAllRecords(clientsTable)
  const active = clientRows.filter((r) => String(r.fields?.lifecycle_stage).toLowerCase() === 'active').length
  const churned = clientRows.filter((r) => String(r.fields?.lifecycle_stage).toLowerCase() === 'churned').length
  const denom = active + churned
  const churn_rate_30d = denom > 0 ? Math.round((churned / denom) * 10000) / 100 : 0

  const engRows = await fetchAllRecords(engagementTable)
  const scores = engRows
    .map((r) => r.fields?.calculated_score)
    .filter((v) => v != null && v !== '' && !Number.isNaN(Number(v)))
    .map(Number)
  const avg_engagement_score =
    scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0

  const dlqRows = await fetchAllRecords(dlqTable)
  const dlq_items_open = dlqRows.filter((r) => String(r.fields?.status).toLowerCase() !== 'resolved').length

  const configRows = await fetchAllRecords(configTable)
  let api_calls_used = 0
  let api_calls_limit = 2000
  for (const r of configRows) {
    const key = r.fields?.config_key
    const val = r.fields?.value
    if (key === 'api_calls_this_month') api_calls_used = Number(val) || 0
    if (key === 'api_calls_limit') api_calls_limit = Number(val) || 2000
  }

  const metrics = {
    date: new Date().toISOString(),
    total_active: active,
    churned_members: churned,
    churn_rate_30d,
    avg_engagement_score,
    dlq_items_open,
    api_calls_used,
    api_calls_limit
  }

  await aitable.createRecord(analyticsTable, {
    date: metrics.date,
    total_mrr: 0,
    new_members: 0,
    churned_members: metrics.churned_members,
    churn_rate_30d: metrics.churn_rate_30d,
    total_active: metrics.total_active,
    avg_engagement_score: metrics.avg_engagement_score,
    dlq_items_open: metrics.dlq_items_open,
    failed_payments_24h: 0,
    onboarding_completion_rate: 0,
    support_tickets_open: 0,
    top_niche: '',
    worst_niche: '',
    api_calls_used: metrics.api_calls_used,
    api_calls_limit: metrics.api_calls_limit,
    system_integrity_score: 0
  })

  return metrics
}

module.exports = { calculateMetrics }
