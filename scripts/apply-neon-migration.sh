#!/usr/bin/env bash
# PA CROP Services — Apply migrations/0002_reconcile_schema.sql to Neon
#
# Walks you through the full safe-deployment sequence:
#   1. Confirm you have a Neon backup branch (or create one via the Neon API).
#   2. Inventory the current production schema (so you can spot-check the
#      ADD COLUMN IF NOT EXISTS targets actually need adding).
#   3. Pre-flight uniqueness check on clients.referral_code.
#   4. Apply 0002_reconcile_schema.sql in a single psql transaction so a
#      mid-script failure rolls back cleanly.
#   5. Verify schema_migrations records the run.
#
# Usage:
#   DATABASE_URL="postgres://..." scripts/apply-neon-migration.sh
#   DATABASE_URL="postgres://..." scripts/apply-neon-migration.sh --dry-run
#
# With --dry-run: runs steps 1-3 only (no mutations); prints the migration
# diff stats but does NOT apply.
#
# Optional: set NEON_API_KEY + NEON_PROJECT_ID to auto-create a backup
# branch via the Neon REST API. Otherwise you'll be prompted to confirm
# you've created one manually in the Neon Console.
#
# Requires: bash, psql, curl, jq.

set -u
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set." >&2
  echo "  export DATABASE_URL=\"\$(vercel env pull && cat .env.local | grep DATABASE_URL | cut -d= -f2-)\"" >&2
  exit 2
fi

if [ ! -f migrations/0002_reconcile_schema.sql ]; then
  echo "ERROR: must be run from the repo root (migrations/0002_reconcile_schema.sql not found)." >&2
  exit 2
fi

RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YEL=$'\033[0;33m'; BLU=$'\033[0;34m'; RST=$'\033[0m'
say()  { echo "${BLU}── $1 ──${RST}"; }
ok()   { echo "  ${GRN}✓${RST}  $1"; }
warn() { echo "  ${YEL}!${RST}  $1"; }
err()  { echo "  ${RED}✗${RST}  $1"; }

# Mask the connection string for logging so the password doesn't end up in CI logs
masked_url() { echo "$1" | sed -E 's|(://[^:]+:)[^@]+@|\1********@|' ; }

echo "${BLU}PA CROP Services — Neon migration runner${RST}"
echo "  Target: $(masked_url "$DATABASE_URL")"
[ "$DRY_RUN" = "1" ] && warn "DRY RUN MODE — no mutations"
echo

# --- 1. Backup branch ------------------------------------------------------
say "Step 1 — Backup branch"
if [ -n "${NEON_API_KEY:-}" ] && [ -n "${NEON_PROJECT_ID:-}" ]; then
  # Find the current primary branch
  primary=$(curl -sS -H "Authorization: Bearer $NEON_API_KEY" \
    "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches" \
    | jq -r '.branches[] | select(.primary==true) | .id' 2>/dev/null || echo "")
  if [ -z "$primary" ]; then
    err "Could not resolve primary branch via Neon API. Falling back to manual confirmation."
  else
    branch_name="pre-0002-reconcile-$(date +%Y%m%d-%H%M%S)"
    echo "  Creating Neon branch: $branch_name (parent: $primary)"
    if [ "$DRY_RUN" = "0" ]; then
      resp=$(curl -sS -H "Authorization: Bearer $NEON_API_KEY" -H "Content-Type: application/json" \
        -X POST "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches" \
        -d "{\"branch\":{\"name\":\"$branch_name\",\"parent_id\":\"$primary\"}}")
      if echo "$resp" | jq -e '.branch.id' >/dev/null 2>&1; then
        ok "Backup branch created: $branch_name"
        echo "  Rollback: in Neon console, promote '$branch_name' back to primary if needed."
      else
        err "Branch create failed:"
        echo "$resp" | jq . 2>/dev/null || echo "$resp"
        exit 3
      fi
    else
      ok "(dry-run) would have created branch $branch_name"
    fi
  fi
else
  echo "  NEON_API_KEY / NEON_PROJECT_ID not set — manual confirmation required."
  echo "  Open https://console.neon.tech → your project → Branches"
  echo "    → 'Create branch from current state of main'"
  echo "    → name it: pre-0002-reconcile-$(date +%Y%m%d)"
  echo
  if [ "$DRY_RUN" = "0" ]; then
    read -r -p "  Have you created a backup branch in the Neon Console? [y/N] " confirm
    [ "$confirm" != "y" ] && [ "$confirm" != "Y" ] && { err "Aborting — please create a backup first."; exit 3; }
    ok "Backup confirmed by operator"
  else
    warn "(dry-run) skipping confirmation prompt"
  fi
fi
echo

# --- 2. Schema inventory ---------------------------------------------------
say "Step 2 — Production schema inventory (read-only)"
inventory_sql=$(cat <<'EOF'
\echo '-- clients --'
SELECT column_name, data_type, is_nullable FROM information_schema.columns
  WHERE table_schema='public' AND table_name='clients' ORDER BY ordinal_position;
\echo '-- organizations --'
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema='public' AND table_name='organizations' ORDER BY ordinal_position;
\echo '-- obligations --'
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema='public' AND table_name='obligations' ORDER BY ordinal_position;
\echo '-- rules --'
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema='public' AND table_name='rules' ORDER BY ordinal_position;
\echo '-- referrals --'
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema='public' AND table_name='referrals' ORDER BY ordinal_position;
\echo '-- partners (may not exist yet) --'
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema='public' AND table_name='partners' ORDER BY ordinal_position;
\echo '-- schema_migrations (may not exist yet) --'
SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema='public' AND table_name='schema_migrations' ORDER BY ordinal_position;
\echo '-- existing migrations applied --'
SELECT name, applied_at FROM schema_migrations ORDER BY applied_at;
EOF
)
psql "$DATABASE_URL" -v ON_ERROR_STOP=0 -P pager=off -c "$inventory_sql" 2>&1 | sed 's/^/    /'
echo
ok "Inventory printed above. Spot-check a few of the ADD COLUMN IF NOT EXISTS targets in 0002_reconcile_schema.sql against this output before continuing."
echo

# --- 3. Pre-flight uniqueness check ---------------------------------------
say "Step 3 — Pre-flight: clients.referral_code duplicates"
dupes=$(psql "$DATABASE_URL" -A -t -c \
  "SELECT referral_code, COUNT(*) FROM clients WHERE referral_code IS NOT NULL GROUP BY referral_code HAVING COUNT(*)>1;" 2>/dev/null || true)
if [ -n "$dupes" ]; then
  err "Duplicate referral_code values found — uq_clients_referral_code creation will fail:"
  echo "$dupes" | sed 's/^/    /'
  echo
  err "Resolve duplicates first (e.g. UPDATE clients SET referral_code = referral_code || '-' || id::text WHERE id IN (...))."
  exit 4
else
  ok "No duplicate referral_code values"
fi
echo

# --- 4. Apply (or dry-run preview) ----------------------------------------
say "Step 4 — Apply migration"
if [ "$DRY_RUN" = "1" ]; then
  echo "  DRY RUN — file size + line count of pending migration:"
  wc -l migrations/0002_reconcile_schema.sql | sed 's/^/    /'
  echo
  echo "  Pending column additions (grep summary):"
  grep -E 'ADD COLUMN IF NOT EXISTS' migrations/0002_reconcile_schema.sql | sed 's/^/    /'
  echo
  ok "Dry-run complete. Re-run without --dry-run to apply."
  exit 0
fi

# Wrap in a single transaction so the whole file is atomic.
echo "  Applying inside a single transaction (BEGIN; ... COMMIT;)..."
{
  echo "BEGIN;"
  cat migrations/0002_reconcile_schema.sql
  echo "COMMIT;"
} | psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -P pager=off
rc=$?
if [ "$rc" -ne 0 ]; then
  err "Migration failed (psql exit $rc). Transaction was rolled back."
  err "Investigate the error above; your data is unchanged."
  exit 5
fi
ok "Migration applied"
echo

# --- 5. Verify -------------------------------------------------------------
say "Step 5 — Verify"
applied=$(psql "$DATABASE_URL" -A -t -c "SELECT name FROM schema_migrations WHERE name='0002_reconcile_schema';" 2>/dev/null || true)
if [ "$applied" = "0002_reconcile_schema" ]; then
  ok "schema_migrations records 0002_reconcile_schema"
else
  err "schema_migrations does NOT contain 0002_reconcile_schema (was the run aborted?)"
  exit 6
fi

# Quick sanity-check the new columns exist
for check in \
  "rules:effective_date" \
  "obligations:escalation_level" \
  "obligations:closed_at" \
  "referrals:conversion_date" \
  "partners:email"
do
  table="${check%%:*}"
  col="${check##*:}"
  exists=$(psql "$DATABASE_URL" -A -t -c \
    "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='$table' AND column_name='$col';" 2>/dev/null)
  if [ "$exists" = "1" ]; then
    ok "$table.$col present"
  else
    err "$table.$col MISSING after migration — investigate"
  fi
done

# Verify the new indexes
for idx in \
  uq_clients_referral_code \
  idx_notifications_scheduled_status \
  idx_obligations_due_date_status \
  idx_audit_events_target_id_only
do
  exists=$(psql "$DATABASE_URL" -A -t -c "SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='$idx';" 2>/dev/null)
  if [ "$exists" = "1" ]; then
    ok "$idx present"
  else
    err "$idx MISSING after migration"
  fi
done

echo
ok "${GRN}Migration 0002_reconcile_schema applied and verified.${RST}"
echo
echo "  Next steps:"
echo "    1. Run scripts/preflight-deploy.sh against your production URL to confirm"
echo "       the API endpoints behave correctly post-migration."
echo "    2. Monitor /api/admin/workflow-failures for the first 24h — any newly-"
echo "       referenced columns will surface there if the ORM / queries hit them."
echo "    3. Once you're confident, the backup Neon branch can be retired (or kept"
echo "       around for the standard 7-day rollback window — your call)."
