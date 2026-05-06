#!/usr/bin/env bash
# PA CROP Services — Deploy preview smoke test
#
# Hits the deployed-preview URL and verifies the changes from waves 1-15
# actually shipped correctly. Designed to run against a Vercel preview
# deployment before promoting to production.
#
# Usage:
#   scripts/preflight-deploy.sh https://pa-crop-services-abc123.vercel.app
#   scripts/preflight-deploy.sh https://www.pacropservices.com   # against prod
#
# Vercel-protected previews: pass a share URL via PREFLIGHT_BOOTSTRAP_URL.
# The script will hit it once with a cookie jar so subsequent requests
# carry the auth cookie:
#   PREFLIGHT_BOOTSTRAP_URL='https://...?_vercel_share=TOKEN' \
#     scripts/preflight-deploy.sh https://pa-crop-services-abc123.vercel.app
#
# Exit code: 0 = all critical checks pass; non-zero = at least one failure.
# Warnings (non-blocking) are reported but do not affect exit code.
#
# Requires: bash, curl, jq. (Install jq via `brew install jq` / `apt install jq`.)

set -u
BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "Usage: $0 <base-url>" >&2
  exit 2
fi
BASE="${BASE%/}"  # strip trailing slash

# Optional cookie jar for Vercel-protected previews. If
# PREFLIGHT_BOOTSTRAP_URL is set, hit it once to seed cookies, then reuse
# the jar on every subsequent request.
COOKIE_JAR=""
if [ -n "${PREFLIGHT_BOOTSTRAP_URL:-}" ]; then
  COOKIE_JAR="$(mktemp)"
  echo "Bootstrapping cookie jar from ${PREFLIGHT_BOOTSTRAP_URL%%\?*}..." >&2
  curl -sS -L -c "$COOKIE_JAR" -o /dev/null "$PREFLIGHT_BOOTSTRAP_URL" 2>/dev/null || true
  trap 'rm -f "$COOKIE_JAR"' EXIT
fi
COOKIE_FLAGS=()
[ -n "$COOKIE_JAR" ] && COOKIE_FLAGS=(-b "$COOKIE_JAR" -c "$COOKIE_JAR")

# --- helpers ---------------------------------------------------------------
PASS=0
FAIL=0
WARN=0
RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YEL=$'\033[0;33m'; BLU=$'\033[0;34m'; RST=$'\033[0m'

pass()  { PASS=$((PASS+1)); echo "  ${GRN}PASS${RST}  $1"; }
fail()  { FAIL=$((FAIL+1)); echo "  ${RED}FAIL${RST}  $1"; [ -n "${2:-}" ] && echo "        $2"; }
warn()  { WARN=$((WARN+1)); echo "  ${YEL}WARN${RST}  $1"; [ -n "${2:-}" ] && echo "        $2"; }
hdr()   { echo; echo "${BLU}── $1 ──${RST}"; }

req()   { curl -sS -m 10 "${COOKIE_FLAGS[@]}" -o /tmp/preflight-body -w "%{http_code}" "$@" 2>/dev/null || echo "000"; }
body()  { cat /tmp/preflight-body 2>/dev/null || true; }

echo "${BLU}PA CROP Services — preflight against ${BASE}${RST}"

# --- basic reachability + cache headers -----------------------------------
hdr "1. Reachability"
status=$(req -I "$BASE/")
if [ "$status" = "200" ]; then pass "GET / -> 200"; else fail "GET / -> $status"; fi

# --- security headers (CSP, HSTS, X-Frame-Options, etc.) -------------------
hdr "2. Security headers (vercel.json)"
headers=$(curl -sSI -m 10 "${COOKIE_FLAGS[@]}" "$BASE/" 2>/dev/null)
echo "$headers" | grep -qi "^x-frame-options: DENY"   && pass "X-Frame-Options: DENY"   || fail "X-Frame-Options: DENY missing"
echo "$headers" | grep -qi "^x-content-type-options: nosniff" && pass "X-Content-Type-Options: nosniff" || fail "X-Content-Type-Options missing"
echo "$headers" | grep -qi "^strict-transport-security: max-age" && pass "HSTS present" || fail "HSTS missing"
csp=$(echo "$headers" | grep -i "^content-security-policy:" || true)
if [ -n "$csp" ]; then
  pass "CSP header present"
  echo "$csp" | grep -q "n8n.audreysplace.place" && pass "CSP connect-src includes n8n.audreysplace.place" \
                                                || fail "CSP missing n8n.audreysplace.place" "Wave 3 fix; admin.html admin actions will be blocked by browser without it"
  echo "$csp" | grep -q "api.stripe.com" && pass "CSP connect-src includes api.stripe.com" || warn "CSP missing api.stripe.com"
else
  fail "CSP header missing"
fi

# --- /api/health (no secrets needed) --------------------------------------
hdr "3. /api/health"
status=$(req "$BASE/api/health")
if [ "$status" = "200" ]; then pass "GET /api/health -> 200"; else fail "GET /api/health -> $status" "$(body | head -c 200)"; fi

# --- /api/billing/checkout (Wave 11) — should accept POST without email ---
hdr "4. /api/billing/checkout (Wave 11)"
status=$(req -X POST -H "Content-Type: application/json" -d '{"plan_code":"compliance_only"}' "$BASE/api/billing/checkout")
case "$status" in
  200) jq -e '.checkout_url' /tmp/preflight-body >/dev/null 2>&1 \
         && pass "POST checkout {compliance_only} -> 200 with checkout_url" \
         || fail "POST checkout returned 200 but no checkout_url" "$(body | head -c 200)"
       ;;
  500)
    if body | grep -q "no_stripe_target_configured\|stripe_not_configured"; then
      warn "Stripe not configured — set STRIPE_SECRET_KEY + STRIPE_PRICE_*" "$(body | head -c 200)"
    else
      fail "POST checkout -> 500" "$(body | head -c 200)"
    fi
    ;;
  *) fail "POST checkout -> $status" "$(body | head -c 200)" ;;
esac

# Reject unknown plan
status=$(req -X POST -H "Content-Type: application/json" -d '{"plan_code":"bogus_plan"}' "$BASE/api/billing/checkout")
[ "$status" = "400" ] && pass "POST checkout {bogus_plan} -> 400 (rejects unknown)" \
                     || fail "POST checkout {bogus_plan} -> $status (should be 400)"

# --- /api/auth/reset-code (Wave 3) — should rate-limit, return success regardless ---
hdr "5. /api/auth/reset-code (Wave 3)"
status=$(req -X POST -H "Content-Type: application/json" -d '{"email":"preflight-test@example.invalid"}' "$BASE/api/auth/reset-code")
[ "$status" = "200" ] && pass "POST reset-code -> 200 (no enumeration)" \
                     || fail "POST reset-code -> $status" "$(body | head -c 200)"

# --- /api/portal/notifications (Wave 3) — should require auth ---
hdr "6. /api/portal/notifications (Wave 3)"
status=$(req "$BASE/api/portal/notifications")
[ "$status" = "401" ] && pass "GET portal/notifications -> 401 (requires auth)" \
                     || fail "GET portal/notifications -> $status (should be 401)"

# --- /api/document-upload (Wave 2) — should require auth ---
hdr "7. /api/document-upload (Wave 2)"
status=$(req -X POST -H "Content-Type: application/json" -d '{"email":"x@x.com","fileName":"x.pdf"}' "$BASE/api/document-upload")
[ "$status" = "401" ] && pass "POST document-upload -> 401 (now requires auth)" \
                     || fail "POST document-upload -> $status (should be 401, was unauth)"

# --- /api/voice + /api/voice-recording (Wave 2) — reject without Twilio sig ---
hdr "8. /api/voice + /api/voice-recording (Wave 2 — Twilio sig)"
status=$(req -X POST -H "Content-Type: application/x-www-form-urlencoded" -d "From=%2B1234&CallSid=CA1" "$BASE/api/voice")
case "$status" in
  403) pass "POST /api/voice without sig -> 403" ;;
  429) warn "POST /api/voice -> 429 (rate-limited; retry after a minute)" ;;
  *)   fail "POST /api/voice without sig -> $status (should be 403)" "$(body | head -c 200)" ;;
esac
status=$(req -X POST -H "Content-Type: application/x-www-form-urlencoded" -d "From=%2B1234&CallSid=CA1" "$BASE/api/voice-recording")
case "$status" in
  403) pass "POST /api/voice-recording without sig -> 403" ;;
  429) warn "POST /api/voice-recording -> 429 (rate-limited; retry after a minute)" ;;
  *)   fail "POST /api/voice-recording without sig -> $status (should be 403)" ;;
esac

# --- Stripe webhook (Wave 2) — must reject without signature ---
hdr "9. /api/stripe-webhook (Wave 2)"
status=$(req -X POST -H "Content-Type: application/json" -d '{}' "$BASE/api/stripe-webhook")
case "$status" in
  400) pass "POST stripe-webhook without sig -> 400" ;;
  500) warn "POST stripe-webhook -> 500 (likely missing STRIPE_WEBHOOK_SECRET env)" ;;
  *)   fail "POST stripe-webhook without sig -> $status (should be 400)" ;;
esac

# --- Compliance pages — corrected fees should be live ---
hdr "10. Compliance fee corrections (Wave 1)"
for path in /reinstate-dissolved-pennsylvania-llc /pa-2027-dissolution-deadline /pennsylvania-foreign-entity-annual-report; do
  page=$(curl -sS -m 10 "${COOKIE_FLAGS[@]}" "$BASE$path" 2>/dev/null || true)
  if echo "$page" | grep -qE "reinstatement application fee is \\\$35|\\\$35 online|\\\$35 \\(online\\)"; then
    pass "$path: \$35 reinstatement fee present"
  else
    fail "$path: \$35 reinstatement fee NOT found (Wave 1 may not have shipped)"
  fi
  if echo "$page" | grep -qE 'reinstatement application fee is \\\$70|fee is \\\$70 \\b|\\\$70 plus delinquent'; then
    fail "$path: legacy \$70 reinstatement fee STILL PRESENT (Wave 1 reverted?)"
  else
    pass "$path: no legacy \$70 reinstatement-fee phrasing"
  fi
done

# --- Pricing CTAs on home page have data-checkout-plan (Wave 11) ---
hdr "11. Home page pricing CTAs (Wave 11)"
home=$(curl -sS -m 10 "${COOKIE_FLAGS[@]}" "$BASE/" 2>/dev/null || true)
for plan in compliance_only business_starter business_pro business_empire; do
  if echo "$home" | grep -q "data-checkout-plan=\"$plan\""; then
    pass "data-checkout-plan=$plan present"
  else
    fail "data-checkout-plan=$plan missing on /"
  fi
done

# --- Footer dynamic year (Wave 13) ---
hdr "12. Footer dynamic year (Wave 13)"
if echo "$home" | grep -q 'class="footer-year"'; then
  pass "Home footer uses class=\"footer-year\""
else
  warn "Home footer does not use the dynamic-year span"
fi

# --- Mobile menu has aria-modal (Wave 14) ---
hdr "13. Mobile menu focus trap markup (Wave 14)"
if echo "$home" | grep -q 'role="dialog" aria-modal="true"'; then
  pass "Mobile menu has role=dialog aria-modal=true"
else
  fail "Mobile menu missing role=dialog aria-modal=true (Wave 14)"
fi

# --- DESIGN.md token availability (Wave 15) ---
hdr "14. DESIGN.md token layer (Wave 15)"
css=$(curl -sS -m 10 "${COOKIE_FLAGS[@]}" "$BASE/site.css" 2>/dev/null || true)
echo "$css" | grep -q -- "--crop-green:" && pass "site.css exposes --crop-green token" || fail "site.css missing --crop-green token (Wave 15)"
echo "$css" | grep -q -- "--crop-mono:"  && pass "site.css exposes --crop-mono token"  || fail "site.css missing --crop-mono token"
echo "$home" | grep -q "Source+Code+Pro" && pass "Home loads Source Code Pro font" || warn "Home not loading Source Code Pro"
echo "$home" | grep -q "family=Inter\|family=Inter:" && pass "Home loads Inter font" || warn "Home not loading Inter"

# --- Knowledge tab present in portal HTML (Wave 12) ---
hdr "15. Portal Knowledge tab (Wave 12)"
portal=$(curl -sS -m 10 "${COOKIE_FLAGS[@]}" "$BASE/portal" 2>/dev/null || true)
echo "$portal" | grep -q 'data-tab="knowledge"' && pass "Portal has Knowledge tab nav item" || fail "Portal missing data-tab=knowledge"
echo "$portal" | grep -q 'id="tab-knowledge"'   && pass "Portal has tab-knowledge pane"     || fail "Portal missing tab-knowledge pane"

# --- summary ---
echo
echo "${BLU}── Summary ──${RST}"
echo "  ${GRN}$PASS pass${RST}   ${RED}$FAIL fail${RST}   ${YEL}$WARN warn${RST}"
[ "$FAIL" -gt 0 ] && exit 1
exit 0
