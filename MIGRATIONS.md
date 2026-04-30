# MIGRATIONS — PA CROP Services schema

This document explains the migration layout, the historical schema drift the
audit surfaced, and how to apply changes to production Neon safely.

## Current files (canonical layout)

```
migrations/
├── 001_create_api_keys.sql        Original api_keys creation (already applied to prod).
└── 0002_reconcile_schema.sql      Wave 16 — reconciles drift, idempotent. Run once.
schema/
└── 001_init.sql                   Snapshot of full intended schema (reference; not run).
infrastructure/
└── migrations/
    ├── 001_schema.sql             Earlier alternative; superseded by 0002 reconcile.
    └── 002_seed_rules.sql         PA compliance rules seed; safe to re-run.
```

## What the audit found (and why 0002 exists)

Three pre-existing files all named `001_*.sql` disagreed on:

- `rules`: `effective_date`, `superseded_at`, `authority_source`, `authority_url`,
  `rule_json`, `created_by` — present in `infrastructure/`, missing from
  `schema/`. `services/db.js#createRule` writes them all.
- `obligations`: `escalation_level`, `closed_at`, `rule_version` — present in
  `infrastructure/`, missing from `schema/`. `services/obligations.js` reads
  and writes them.
- `referrals`: `referred_client_id`, `conversion_date`, `credit_amount` —
  present in `infrastructure/`, missing from `schema/`.
- `clients.referral_code`: declared `UNIQUE` in `infrastructure/` only.
- FK cascades: `infrastructure/` had `ON DELETE CASCADE` on most parent-child
  relationships; `schema/` had it on api_keys only.
- `partners` table: defined in `schema/` (Wave 3 introduced
  `db.createPartner` + the partner-intake write); not in `infrastructure/`.
- Missing performance indexes: composite `(scheduled_for, delivery_status)`
  on notifications; `(due_date, obligation_status)` on obligations;
  `target_id`-only on audit_events.

`migrations/0002_reconcile_schema.sql` adds whatever is missing using
`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` so it's safe to run regardless
of which `001` was actually applied to your production Neon. It also creates
a `schema_migrations` ledger so future migrations can be tracked properly.

## Applying 0002 to production Neon

**Do not run this without a backup.** Neon makes branch-based snapshots cheap.

1. **Snapshot:** In the Neon Console → Branches → "Create branch from current
   state of `main`". Name it something like `pre-0002-reconcile`. This
   gives you a point-in-time fork to revert to if anything goes wrong.

2. **Inspect production schema first.** Connect to prod and compare against
   `0002_reconcile_schema.sql`:
   ```bash
   psql "$DATABASE_URL" -c '\d clients'
   psql "$DATABASE_URL" -c '\d organizations'
   psql "$DATABASE_URL" -c '\d obligations'
   psql "$DATABASE_URL" -c '\d rules'
   psql "$DATABASE_URL" -c '\d referrals'
   psql "$DATABASE_URL" -c '\d notifications'
   psql "$DATABASE_URL" -c '\d audit_events'
   psql "$DATABASE_URL" -c '\d partners'  # may not exist
   ```
   For each `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` line in 0002, confirm
   the column genuinely is missing. If a column already exists with a
   different type than 0002 declares, **stop** and resolve manually — the
   `IF NOT EXISTS` guard skips the ADD but won't reconcile a type mismatch.

3. **Pre-flight uniqueness check.** The new
   `uq_clients_referral_code` partial unique index will fail if duplicates
   already exist. Check first:
   ```sql
   SELECT referral_code, COUNT(*) FROM clients
   WHERE referral_code IS NOT NULL
   GROUP BY referral_code HAVING COUNT(*) > 1;
   ```
   Resolve duplicates by appending a suffix to all but one of each set
   before applying the migration.

4. **Apply during a quiet window:**
   ```bash
   psql "$DATABASE_URL" -f migrations/0002_reconcile_schema.sql
   ```
   Each statement is idempotent. CREATE INDEX without CONCURRENTLY locks
   briefly — fine for our table sizes. If `obligations` or `audit_events`
   ever exceeds ~1M rows, switch the relevant lines to
   `CREATE INDEX CONCURRENTLY` (note: `CONCURRENTLY` cannot run inside a
   transaction block; you'd run those statements outside the file).

5. **Verify:**
   ```sql
   SELECT name, applied_at FROM schema_migrations ORDER BY applied_at;
   -- expect: 0002_reconcile_schema
   ```

6. **Rollback path:** Promote the `pre-0002-reconcile` Neon branch back to
   primary. This swaps the entire database state to the snapshot — any
   writes between snapshot and rollback are lost, so coordinate downtime.

## Adding new migrations going forward

Use a strictly-increasing 4-digit prefix and a snake_case description:

```
migrations/0003_add_partner_commissions.sql
```

Each file should:

1. Be idempotent (`IF NOT EXISTS`, `IF EXISTS`, `ON CONFLICT DO NOTHING`).
2. End with `INSERT INTO schema_migrations (name) VALUES ('0003_…') ON CONFLICT DO NOTHING;`
3. Be applied to staging first, then production, with a snapshot before each.

Once you're ready to formalize this further, consider adopting
[`node-pg-migrate`](https://github.com/salsita/node-pg-migrate) which gives
you `up` + `down` semantics and a `db:migrate` npm script. The current
`schema_migrations` ledger created by 0002 is the foundation any of those
tools can build on.

## Why we don't auto-run migrations on deploy

Neon is the source of truth for production data; auto-applying SQL on every
Vercel deploy is too much blast radius for a pre-rotation codebase. The
explicit human-in-the-loop step in this doc is intentional. After the
secrets rotation in `SECURITY-ROTATION-CHECKLIST.md` is complete and a
proper CI/CD pipeline is in place, this can move to automated migration on
staging + manual approval on production.
