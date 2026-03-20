// agents/qa-audit.js — five integrity checks + audit_log row
const { aitable, suitedash, recordsFromResponse } = require('./config')

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

function daysBetween(isoA, isoB) {
  const a = new Date(isoA).getTime()
  const b = new Date(isoB).getTime()
  return Math.abs(b - a) / (24 * 60 * 60 * 1000)
}

async function runAudit() {
  const details = []
  let passed = 0

  // Check 1: SuiteDash vs AiTable client counts
  let check1Pass = false
  const sd = await suitedash.get('/contacts')
  let sdCount = 0
  if (sd && Array.isArray(sd.data)) sdCount = sd.data.length
  else if (sd && typeof sd.total === 'number') sdCount = sd.total
  const clientRows = await fetchAllRecords(process.env.AITABLE_CLIENTS_TABLE)
  const atCount = clientRows.length
  const diff = Math.abs(sdCount - atCount)
  check1Pass = diff <= 2
  if (check1Pass) passed++
  details.push({
    id: 1,
    name: 'contact_count_drift',
    pass: check1Pass,
    detail: `SuiteDash=${sdCount}, AiTable=${atCount}, diff=${diff}`
  })

  // Check 2: engagement rows missing calculated_score (active clients only)
  const clients = await fetchAllRecords(process.env.AITABLE_CLIENTS_TABLE)
  const activeIds = new Set(
    clients
      .filter((r) => String(r.fields?.lifecycle_stage).toLowerCase() === 'active')
      .map((r) => String(r.fields?.client_id || r.fields?.suitedash_id || r.recordId || ''))
  )
  const engRows = await fetchAllRecords(process.env.AITABLE_ENGAGEMENT_TABLE)
  let badEng = 0
  for (const r of engRows) {
    const cid = String(r.fields?.client_id || '')
    const score = r.fields?.calculated_score
    const missing = score == null || score === ''
    if (missing && activeIds.has(cid)) badEng++
  }
  const check2Pass = badEng === 0
  if (check2Pass) passed++
  details.push({
    id: 2,
    name: 'engagement_score_gaps',
    pass: check2Pass,
    detail: `active_clients_with_missing_score=${badEng}`
  })

  // Check 3: unresolved DLQ
  const dlqRows = await fetchAllRecords(process.env.AITABLE_DLQ_TABLE)
  const openDlq = dlqRows.filter((r) => String(r.fields?.status).toLowerCase() !== 'resolved').length
  const check3Pass = openDlq === 0
  if (check3Pass) passed++
  details.push({ id: 3, name: 'dlq_clear', pass: check3Pass, detail: `open=${openDlq}` })

  // Check 4: stale active workflows (14+ days since last_step_at)
  const wfRows = await fetchAllRecords(process.env.AITABLE_WORKFLOW_STATE_TABLE)
  const now = new Date().toISOString()
  let stale = 0
  for (const r of wfRows) {
    if (String(r.fields?.status).toLowerCase() !== 'active') continue
    const last = r.fields?.last_step_at
    if (!last) {
      stale++
      continue
    }
    if (daysBetween(last, now) >= 14) stale++
  }
  const check4Pass = stale === 0
  if (check4Pass) passed++
  details.push({ id: 4, name: 'stale_workflows', pass: check4Pass, detail: `stale_active=${stale}` })

  // Check 5: API usage under 80% of limit
  const cfgRows = await fetchAllRecords(process.env.AITABLE_SYSTEM_CONFIG_TABLE)
  let used = 0
  let limit = 2000
  for (const r of cfgRows) {
    if (r.fields?.config_key === 'api_calls_this_month') used = Number(r.fields?.value) || 0
    if (r.fields?.config_key === 'api_calls_limit') limit = Number(r.fields?.value) || 2000
  }
  const pct = limit > 0 ? used / limit : 0
  const check5Pass = pct < 0.8
  if (check5Pass) passed++
  details.push({
    id: 5,
    name: 'api_usage_headroom',
    pass: check5Pass,
    detail: `used=${used}, limit=${limit}, ratio=${Math.round(pct * 100)}%`
  })

  const total_checks = 5
  const failed = total_checks - passed
  const integrity_score = Math.round((passed / total_checks) * 10000) / 100

  await aitable.createRecord(process.env.AITABLE_AUDIT_LOG_TABLE, {
    date: new Date().toISOString(),
    checks_run: total_checks,
    checks_passed: passed,
    checks_failed: failed,
    anomalies_found: failed,
    auto_fixed_count: 0,
    escalated_count: failed,
    system_integrity_score: integrity_score,
    run_duration_seconds: 0,
    notes: JSON.stringify(details).slice(0, 10000)
  })

  return {
    checks_run: total_checks,
    passed,
    failed,
    integrity_score,
    details
  }
}

module.exports = { runAudit }
