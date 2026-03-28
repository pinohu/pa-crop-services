#!/usr/bin/env node
// PA CROP Services — Bulk Entity Registration
// Reads all contacts from SuiteDash and registers them in the compliance engine.
//
// Usage:
//   SUITEDASH_PUBLIC_ID=xxx SUITEDASH_SECRET_KEY=yyy node scripts/bulk-register.js
//   
//   Or with a Vercel deployment URL:
//   API_BASE=https://pa-crop-services.vercel.app node scripts/bulk-register.js
//
// Options:
//   --dry-run     Show what would be registered without making changes
//   --limit N     Only process first N contacts

const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
const API_BASE = process.env.API_BASE || 'https://pa-crop-services.vercel.app';
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;
if (!ADMIN_KEY) {
  console.error('  ERROR: Set ADMIN_SECRET_KEY environment variable');
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity;

async function main() {
  console.log('\n  PA CROP — Bulk Entity Registration');
  console.log(`  API: ${API_BASE}`);
  console.log(`  Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  if (limit < Infinity) console.log(`  Limit: ${limit} contacts`);
  console.log('');

  // ── Step 1: Fetch contacts from SuiteDash ──
  if (!SD_PUBLIC || !SD_SECRET) {
    console.error('  ERROR: Set SUITEDASH_PUBLIC_ID and SUITEDASH_SECRET_KEY environment variables');
    process.exit(1);
  }

  console.log('  Fetching contacts from SuiteDash...');
  const sdRes = await fetch('https://app.suitedash.com/secure-api/contacts?limit=500', {
    headers: {
      'X-Public-ID': SD_PUBLIC,
      'X-Secret-Key': SD_SECRET,
      'Accept': 'application/json'
    }
  });

  if (!sdRes.ok) {
    console.error(`  ERROR: SuiteDash returned ${sdRes.status}`);
    process.exit(1);
  }

  const sdData = await sdRes.json();
  const contacts = sdData?.data || sdData || [];
  const contactList = Array.isArray(contacts) ? contacts : [contacts];
  console.log(`  Found ${contactList.length} contacts\n`);

  // ── Step 2: Map contacts to entity registrations ──
  let registered = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < Math.min(contactList.length, limit); i++) {
    const contact = contactList[i];
    const cf = contact.custom_fields || {};
    const email = contact.email;
    const name = contact.company || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    const entityType = cf.entity_type || 'LLC';
    const dosNumber = cf.dos_number || null;
    const plan = cf.crop_plan || 'compliance_only';

    if (!email) {
      console.log(`  SKIP: Contact #${i + 1} — no email`);
      skipped++;
      continue;
    }

    const payload = {
      action: 'register',
      entityId: dosNumber || `sd:${contact.id || email}`,
      name: name || email,
      entityType,
      dosNumber,
      email,
      plan
    };

    if (dryRun) {
      console.log(`  DRY RUN: Would register "${payload.name}" (${entityType}) — ${email} — plan: ${plan}`);
      registered++;
      continue;
    }

    try {
      const res = await fetch(`${API_BASE}/api/entity-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': ADMIN_KEY
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        console.log(`  ✅ Registered: "${payload.name}" (${entityType}) — deadline: ${data.obligation?.dueDateLabel || '?'} — risk: ${data.obligation?.status || '?'}`);
        registered++;
      } else {
        console.log(`  ⚠️  Failed: "${payload.name}" — ${data.error || 'unknown error'}`);
        errors++;
      }
    } catch (err) {
      console.log(`  ❌ Error: "${payload.name}" — ${err.message}`);
      errors++;
    }

    // Rate limit: 100ms between registrations
    await new Promise(r => setTimeout(r, 100));
  }

  // ── Summary ──
  console.log('\n  ─── Summary ───');
  console.log(`  Registered: ${registered}`);
  console.log(`  Skipped:    ${skipped}`);
  console.log(`  Errors:     ${errors}`);
  console.log(`  Total:      ${registered + skipped + errors}`);
  if (dryRun) console.log('\n  This was a dry run. Run without --dry-run to execute.');
  console.log('');
}

main().catch(err => {
  console.error('  FATAL:', err.message);
  process.exit(1);
});
