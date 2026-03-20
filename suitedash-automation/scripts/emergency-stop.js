#!/usr/bin/env node
/**
 * Dynasty Empire - Emergency Stop Control
 * Pause/resume all automation via AiTable system_config.
 *
 * Usage:
 *   node scripts/emergency-stop.js pause [reason]
 *   node scripts/emergency-stop.js resume
 *   node scripts/emergency-stop.js status
 */

const path = require('path');
const root = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });
require('dotenv').config({ path: path.join(root, 'env', '.env') });
const axios = require('axios');

const API_KEY = process.env.AITABLE_API_KEY;
const BASE_URL = (process.env.AITABLE_BASE_URL || '').replace(/\/$/, '');
const TABLE = process.env.AITABLE_SYSTEM_CONFIG_TABLE;
const RECORD_ID = process.env.AITABLE_SYSTEM_ACTIVE_RECORD;

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};

function datasheetRecordsUrl() {
  if (!BASE_URL || !TABLE) return null;
  return `${BASE_URL}/${TABLE}`;
}

async function getStatus() {
  const url = datasheetRecordsUrl();
  if (!url) throw new Error('AITABLE_BASE_URL and AITABLE_SYSTEM_CONFIG_TABLE required');
  const res = await axios.get(url, {
    headers,
    params: { filterByFormula: "{config_key}='system_active'", pageSize: 20 }
  });
  const record = res.data?.data?.records?.[0];
  return {
    active: record?.fields?.value === 'true',
    updatedAt: record?.fields?.updated_at,
    updatedBy: record?.fields?.updated_by,
    notes: record?.fields?.notes
  };
}

async function updateConfig(key, value, updatedBy, notes) {
  const url = datasheetRecordsUrl();
  if (!url) throw new Error('AiTable URL not configured');
  const res = await axios.get(url, {
    headers,
    params: { filterByFormula: `{config_key}='${key.replace(/'/g, "\\'")}'`, pageSize: 20 }
  });
  const recordId = res.data?.data?.records?.[0]?.recordId;

  if (!recordId) {
    console.error(`ERROR: No record found for config_key "${key}". Create it in AiTable first.`);
    process.exit(1);
  }

  await axios.patch(`${BASE_URL}/${TABLE}`, {
    records: [{
      recordId,
      fields: {
        value,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
        notes
      }
    }]
  }, { headers });
}

async function main() {
  const action = process.argv[2];
  const reason = process.argv.slice(3).join(' ') || 'Manual action via CLI';

  console.log('\n═══════════════════════════════════');
  console.log('  Dynasty Empire — Emergency Stop');
  console.log('═══════════════════════════════════\n');

  if (!API_KEY || !TABLE || !BASE_URL) {
    console.error('ERROR: AiTable not configured (need AITABLE_API_KEY, AITABLE_BASE_URL, AITABLE_SYSTEM_CONFIG_TABLE in .env)');
    process.exit(1);
  }

  switch (action) {
    case 'pause':
      console.log('⏸  PAUSING all automation...');
      await updateConfig('system_active', 'false', 'cli_admin', `PAUSED: ${reason}`);
      await updateConfig('pause_reason', reason, 'cli_admin', '');
      console.log('✓  System PAUSED. All workflows will skip execution.');
      console.log(`   Reason: ${reason}`);
      console.log('   To resume: node scripts/emergency-stop.js resume');
      break;

    case 'resume':
      console.log('▶  RESUMING all automation...');
      await updateConfig('system_active', 'true', 'cli_admin', `RESUMED: ${reason}`);
      await updateConfig('pause_reason', '', 'cli_admin', '');
      console.log('✓  System RESUMED. All workflows will execute normally.');
      console.log('\n   TIP: Run the event replay to process missed events:');
      console.log('   POST to your n8n webhook: /replay-paused-events');
      break;

    case 'status':
      const status = await getStatus();
      console.log(`Status: ${status.active ? '▶ ACTIVE' : '⏸ PAUSED'}`);
      if (status.updatedAt) console.log(`Last updated: ${status.updatedAt}`);
      if (status.updatedBy) console.log(`Updated by: ${status.updatedBy}`);
      if (status.notes) console.log(`Notes: ${status.notes}`);
      break;

    default:
      console.log('Usage:');
      console.log('  node scripts/emergency-stop.js pause [reason]');
      console.log('  node scripts/emergency-stop.js resume');
      console.log('  node scripts/emergency-stop.js status');
      break;
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
