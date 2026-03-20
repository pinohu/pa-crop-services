// agents/config.js — shared HTTP, OpenAI, logging for agent layer
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const OpenAI = require('openai')

const AITABLE_BASE = 'https://aitable.ai/fusion/v1/datasheets'
const BUILD_LOG = path.join(__dirname, '..', 'BUILD_LOG.md')

function recordsFromResponse(data) {
  if (!data) return []
  const inner = data.data
  if (inner && Array.isArray(inner.records)) return inner.records
  if (Array.isArray(data.records)) return data.records
  return []
}

const aitable = {
  async getRecords(tableId, params) {
    if (!tableId || !process.env.AITABLE_API_KEY) return null
    try {
      const res = await axios.get(`${AITABLE_BASE}/${tableId}/records`, {
        headers: {
          Authorization: `Bearer ${process.env.AITABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        params: params || {},
        timeout: 30000
      })
      return res.data
    } catch (err) {
      console.error('[aitable.getRecords]', err.message)
      return null
    }
  },

  async createRecord(tableId, fields) {
    if (!tableId || !process.env.AITABLE_API_KEY) return null
    try {
      const res = await axios.post(
        `${AITABLE_BASE}/${tableId}/records`,
        { records: [{ fields }] },
        {
          headers: {
            Authorization: `Bearer ${process.env.AITABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )
      return res.data
    } catch (err) {
      console.error('[aitable.createRecord]', err.message)
      return null
    }
  },

  async updateRecord(tableId, recordId, fields) {
    if (!tableId || !recordId || !process.env.AITABLE_API_KEY) return null
    try {
      const res = await axios.patch(
        `${AITABLE_BASE}/${tableId}/records`,
        { records: [{ recordId, fields }] },
        {
          headers: {
            Authorization: `Bearer ${process.env.AITABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )
      return res.data
    } catch (err) {
      console.error('[aitable.updateRecord]', err.message)
      return null
    }
  }
}

function suitedashHeaders() {
  const pub = (process.env.SUITEDASH_API_ID || '').trim()
  const sec = (process.env.SUITEDASH_API_SECRET || '').trim()
  return {
    'X-Public-ID': pub,
    'X-Secret-Key': sec,
    'Content-Type': 'application/json'
  }
}

const suitedash = {
  async get(endpoint) {
    const base = process.env.SUITEDASH_BASE_URL
    if (!base) return null
    const h = suitedashHeaders()
    if (!h['X-Public-ID'] || !h['X-Secret-Key']) return null
    const pathPart = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    try {
      const res = await axios.get(`${base}${pathPart}`, {
        headers: h,
        timeout: 30000
      })
      return res.data
    } catch (err) {
      console.error('[suitedash.get]', err.message)
      return null
    }
  },

  async post(endpoint, body) {
    const base = process.env.SUITEDASH_BASE_URL
    if (!base) return null
    const h = suitedashHeaders()
    if (!h['X-Public-ID'] || !h['X-Secret-Key']) return null
    const pathPart = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    try {
      const res = await axios.post(`${base}${pathPart}`, body, {
        headers: h,
        timeout: 30000
      })
      return res.data
    } catch (err) {
      console.error('[suitedash.post]', err.message)
      return null
    }
  }
}

const openai = new OpenAI({ apiKey: (process.env.OPENAI_API_KEY || '').trim() })

function log(phase, message) {
  const line = `[${new Date().toISOString()}] [${phase}] ${message}\n`
  process.stdout.write(line)
  try {
    fs.appendFileSync(BUILD_LOG, line, 'utf8')
  } catch (e) {
    console.error('[log] append failed:', e.message)
  }
}

async function askAgent(systemPrompt, userMessage) {
  if (!(process.env.OPENAI_API_KEY || '').trim()) {
    log('askAgent', 'OPENAI_API_KEY missing')
    return null
  }
  try {
    const res = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: Number(process.env.OPENAI_MAX_TOKENS) || 1000
    })
    return res.choices[0]?.message?.content ?? null
  } catch (err) {
    log('askAgent', err.message)
    return null
  }
}

module.exports = {
  aitable,
  suitedash,
  openai,
  log,
  askAgent,
  recordsFromResponse
}
