#!/usr/bin/env node
/**
 * Dynasty Empire - Connection Verification Script
 * Tests all API connections before deployment.
 * Usage: node scripts/verify-connections.js
 */

require('dotenv').config({ path: './.env' });
require('dotenv').config({ path: './env/.env' });
const axios = require('axios');

const results = [];

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'OK' });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    results.push({ name, status: 'FAIL', error: err.message });
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════');
  console.log('  Dynasty Empire — Connection Verifier');
  console.log('═══════════════════════════════════════\n');

  // 1. SuiteDash API
  await check('SuiteDash API (YourDeputy)', async () => {
    const res = await axios.get(`${process.env.SUITEDASH_BASE_URL}/contacts`, {
      headers: {
        'X-Public-ID': (process.env.SUITEDASH_API_ID || '').trim(),
        'X-Secret-Key': (process.env.SUITEDASH_API_SECRET || '').trim()
      },
      timeout: 15000,
      params: { limit: 1 }
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    console.log(`    → ${res.data?.data?.length ?? 0} contacts accessible`);
  });

  // 2. AiTable API
  await check('AiTable API', async () => {
    const res = await axios.get(`${process.env.AITABLE_BASE_URL}/${process.env.AITABLE_CLIENTS_TABLE}?pageSize=1`, {
      headers: { 'Authorization': `Bearer ${process.env.AITABLE_API_KEY}` },
      timeout: 15000
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    console.log(`    → AiTable connected, ${res.data?.data?.total ?? 'unknown'} records`);
  });

  // 3. Stripe API
  await check('Stripe API', async () => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const balance = await stripe.balance.retrieve();
    console.log(`    → Stripe connected, ${balance.available?.length || 0} currencies`);
  });

  // 4. OpenAI API
  await check('OpenAI API', async () => {
    const res = await axios.get('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
      timeout: 10000
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    console.log(`    → OpenAI connected, ${res.data?.data?.length || 0} models available`);
  });

  // 5. n8n API
  await check('n8n API (Flint)', async () => {
    const headers = {
      'X-N8N-API-KEY': process.env.N8N_API_KEY,
      'CF-Access-Client-Id': process.env.N8N_CF_ACCESS_CLIENT_ID,
      'CF-Access-Client-Secret': process.env.N8N_CF_ACCESS_CLIENT_SECRET
    };
    const res = await axios.get(`${process.env.N8N_BASE_URL}/api/v1/workflows`, {
      headers,
      timeout: 15000
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    console.log(`    → n8n connected, ${res.data?.data?.length || 0} workflows`);
  });

  // 6. n8n Webhook reachability
  await check('n8n Webhook Endpoint', async () => {
    const res = await axios.get(`${process.env.N8N_WEBHOOK_BASE}/dynasty-events`, {
      timeout: 10000,
      validateStatus: () => true // Accept any status
    });
    // 404 or 200 both mean the endpoint is reachable
    console.log(`    → Webhook endpoint reachable (HTTP ${res.status})`);
  });

  // Summary
  console.log('\n───────────────────────────────────────');
  const passed = results.filter(r => r.status === 'OK').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`  Results: ${passed} passed, ${failed} failed out of ${results.length} checks`);

  if (failed > 0) {
    console.log('\n  Failed connections:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`    → ${r.name}: ${r.error}`);
    });
    console.log('\n  Fix the above issues before proceeding with deployment.');
    process.exit(1);
  } else {
    console.log('\n  All connections verified! Ready for deployment.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Script error:', err.message);
  process.exit(1);
});
