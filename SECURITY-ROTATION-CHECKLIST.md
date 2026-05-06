# SECURITY ROTATION CHECKLIST

The Wave 1 commit stripped these secrets from `CLAUDE.md`, but they remain
in git history and were committed to a repo that may have had broader read
access than intended. **Treat every value previously stored in CLAUDE.md as
compromised** and rotate.

This file is the operator playbook — most of these actions can only be done
by you (account owner), not by the codebase or by Claude.

---

## Status legend

- 🔴 **Must rotate** — secret was committed verbatim; treat as known to attackers.
- 🟡 **Verify** — env-var-only or behind a future migration; check if applicable to your deployment.
- ✅ **Done** — check off as you complete each step.

---

## 🔴 1. PA CROP admin key (`ADMIN_SECRET_KEY`)

The literal admin key was in `CLAUDE.md` for the lifetime of the repo. It
gates every `/api/admin/*` action plus several internal-key endpoints
(`/api/voice-recording`, `/api/document-upload`, etc.).

- [ ] Generate a new strong key:
      `openssl rand -base64 48`
- [ ] **Vercel:** Project Settings → Environment Variables → edit
      `ADMIN_SECRET_KEY` (set in Production, Preview, and Development
      scopes). Redeploy production.
- [ ] **Local `.env`:** update `ADMIN_SECRET_KEY` in your local file (and
      anyone else's who develops on this codebase).
- [ ] **n8n workflows:** any workflow that calls `/api/scheduler`,
      `/api/provision`, `/api/sms`, etc., is sending the old admin key.
      Update the credential in n8n.
- [ ] **Any third-party tool** scheduled to hit PA CROP admin endpoints
      (cron jobs, monitoring, dashboards) needs the new key.

---

## 🔴 2. GitHub personal access token (`ghp_…`)

A user-scope PAT was stored verbatim in `CLAUDE.md` (and in a previous
`Token: ghp_…` line). PATs grant write access to every repo the user can see.

- [ ] **GitHub:** Settings → Developer settings → Personal access tokens →
      revoke the leaked PAT immediately.
- [ ] Audit recent commits across all repos the PAT could touch (look for
      unfamiliar pushes between when CLAUDE.md was committed and now).
- [ ] If you need a new PAT: create a fine-grained one scoped to only this
      repo with the minimum permissions you actually need.
- [ ] If `push.py` or any local script reads the PAT, point it at the new
      token (or migrate to GitHub CLI / `~/.git-credentials` so it's never
      pasted into source).

---

## 🔴 3. 20i hosting keys (`TWENTY_I_GENERAL`, `TWENTY_I_TOKEN`, oauth key)

Both general and oauth keys were committed. Anyone with these can spin up
hosting packages, register domains, alter DNS, drain reseller credit.

- [ ] **20i Control Panel:** Reseller → My API → revoke the leaked
      general + oauth keys.
- [ ] Generate fresh keys.
- [ ] **Vercel env:** update `TWENTY_I_GENERAL` (and `TWENTY_I_TOKEN` if
      you keep the legacy combined format). Redeploy.
- [ ] **`.env.example`:** the format is documented; no change needed.
- [ ] **Verify:** `GET /api/health` should still report 20i as connected;
      a quick `services/twentyi.js#listResellerPackages()` call will
      confirm the new key works.

---

## 🔴 4. Insighto API key (`in-8sy7…`)

Voice agent control. An attacker can place outbound calls or hijack the
agent script.

- [ ] **Insighto dashboard:** revoke + reissue.
- [ ] Update `INSIGHTO_API_KEY` in Vercel env.

---

## 🔴 5. CallScaler API key (`120|ZPL…`)

Inbound call routing + tracking. Compromise = call interception, billing
fraud.

- [ ] **CallScaler dashboard:** rotate API key.
- [ ] Update `CALLSCALER_API_KEY` in Vercel env.

---

## 🔴 6. SMS-iT API key (`SMSIT_…`)

Outbound SMS. Compromise = toll fraud, mass-text spam from your number.

- [ ] **SMS-iT dashboard:** revoke + reissue.
- [ ] Update `SMSIT_API_KEY` in Vercel env.
- [ ] Audit recent SMS-iT message log for unusual volume between
      commit-of-CLAUDE.md and now.

---

## 🔴 7. Trafft client ID (`380067…`)

Calendar/booking integration.

- [ ] **Trafft dashboard:** rotate the API credential.
- [ ] Update `TRAFFT_CLIENT_ID` (and any partner secret if separate) in
      Vercel env.

---

## 🟡 8. Stripe keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)

These were referenced in `.env.example` and `setup-guide.js` but the live
secret value was not in the repo. Still, if you're rotating broadly, this
is the right time:

- [ ] **Stripe Dashboard:** Developers → API keys → roll the live secret
      key. Update `STRIPE_SECRET_KEY` in Vercel.
- [ ] Developers → Webhooks → roll the signing secret. Update
      `STRIPE_WEBHOOK_SECRET` in Vercel. (This is now actually used —
      Wave 2 fixed the verification.)
- [ ] If you discover deactivated webhooks during rotation, re-add the
      `pacropservices.com/api/stripe-webhook` endpoint and select these
      events: `checkout.session.completed`, `invoice.payment_failed`,
      `customer.subscription.updated`, `customer.subscription.deleted`.

---

## 🟡 9. Stripe Payment Link `metadata.plan_code` (configuration, not a secret)

Wave 11 added a new `/api/billing/checkout` endpoint that always sets
`metadata.plan_code`. The legacy `buy.stripe.com/...` Payment Links are
still wired as a fallback. If you want the fallback path to also carry
plan_code:

- [ ] **Stripe Dashboard → Products → for each product (Compliance $99,
      Starter $199, Pro $349, Empire $699):**
      Add `plan_code` metadata on the **Price** (not just the Product) so
      the webhook detection runs through `item.price.metadata.plan_code`.
      Values: `compliance_only`, `business_starter`, `business_pro`,
      `business_empire`.
- [ ] **Stripe Dashboard → Payment Links → for each link:** Edit →
      Advanced → set `metadata.plan_code` to the matching value.
- [ ] **Test:** complete a $1 test checkout via each link and confirm
      `stripe-webhook.js` does NOT log `stripe_plan_code_missing`.
- [ ] Once verified, you can also set the `STRIPE_PRICE_*` env vars
      (`STRIPE_PRICE_COMPLIANCE_ONLY`, etc.) — `/api/billing/checkout`
      will then route through Stripe Checkout Sessions instead of
      Payment Links, eliminating the metadata-on-link concern entirely.

---

## 🟡 10. Neon `DATABASE_URL` and Upstash Redis credentials

Hostnames were in `CLAUDE.md`; tokens were not. Rotation is optional but
recommended if you're being thorough:

- [ ] **Neon Console:** roll the connection password (Branches → main →
      Connection Details → Reset password).
- [ ] **Vercel env:** update `DATABASE_URL` with the new connection string
      (keep the `-pooler.` host so connection pooling stays on).
- [ ] **Upstash Console:** rotate `UPSTASH_REDIS_REST_TOKEN`. Update Vercel
      env.

---

## 🔴 11. Hosting passwords stored in `clients.metadata.hosting_password` and SuiteDash

Wave 10 introduced `services/secrets.js` (AES-256-GCM with the new
`SECRETS_MASTER_KEY` env var). New clients store an encrypted blob; legacy
clients still have plaintext.

- [ ] **Generate the master key:** `openssl rand -base64 32`
- [ ] **Vercel env:** set `SECRETS_MASTER_KEY` to that value.
- [ ] **Backfill the legacy plaintext blobs.** Run one-off (during a quiet
      window):
      ```sql
      SELECT id, email, metadata
      FROM clients
      WHERE metadata ? 'hosting_password'
        AND metadata->>'hosting_password' NOT LIKE 'enc:v1:%';
      ```
      For each row, re-write the metadata via `db.updateClient(id, { metadata: {...} })`
      with the same plaintext value — Wave 10's writer will encrypt on
      persist. (Or write a script that calls `secrets.encrypt(plain)` and
      UPDATEs directly.)
- [ ] **SuiteDash custom field `hosting_password`:** decide one of —
        - Continue treating SuiteDash as the operator's manual vault
          (current state). The plaintext stays there for ops-team
          retrieval; rotate the master key in SuiteDash + Neon together.
        - OR remove it from SuiteDash entirely and have admins decrypt the
          Neon copy via the existing `resend_welcome_email` admin action.
          Cleaner but needs operator buy-in.
- [ ] **Rotate the actual 20i hosting passwords for clients that pre-date
      Wave 10.** The plaintext was in your repo's git history; assume it
      could leak. For each client with hosting:
      1. Generate a fresh password
      2. Use 20i's password-reset flow to apply it
      3. Email the client (out-of-band)
      4. Update both SuiteDash custom_field and Neon metadata
         (re-write triggers Wave 10 encryption automatically)

---

## 🔴 12. Twilio auth token (`TWILIO_AUTH_TOKEN`)

Wave 2 added Twilio webhook signature verification. The token wasn't in
`CLAUDE.md` (verified by grep), but if you've been pasting it into other
tools, rotate proactively:

- [ ] **Twilio Console:** Account → API keys & tokens → roll the auth token.
- [ ] **Vercel env:** set `TWILIO_AUTH_TOKEN` to the new value.
- [ ] **Verify:** call your Twilio number, confirm `/api/voice` doesn't log
      `twilio_signature_rejected`.

---

## After rotation

- [ ] Run `git log --all -p -- CLAUDE.md | grep -E "ghp_|sk_live|in-|SMSIT|c2387|c0471"` and
      confirm no live values remain in HEAD. (Old commit history still
      contains them — see next bullet.)
- [ ] **Decide on history rewrite.** The leaked secrets remain in git
      history. Options:
        a. **Rewrite history** (`git filter-repo --invert-paths --path
           CLAUDE.md` to fully remove, or `git filter-repo --replace-text`
           to scrub specific tokens). All collaborators must re-clone.
        b. **Accept** that the values are public-history-known and rely on
           rotation. Faster, no collaborator coordination, and rotation
           is the actual security boundary anyway.
- [ ] Add a **pre-commit hook** that runs `gitleaks` or
      [`git-secrets`](https://github.com/awslabs/git-secrets) so future
      pastes are caught before they land.
- [ ] Run the GitHub MCP `run_secret_scanning` tool against the repo
      to surface anything else that leaked.

---

## A note on what Claude can and cannot do for you

Claude (and any code agent) **cannot** log into your Stripe / GitHub / 20i /
SuiteDash / Insighto / CallScaler / SMS-iT / Trafft / Neon / Upstash /
Twilio consoles to rotate keys. You have to do that.

What Claude **did** do automatically:

- Removed the literal secret values from `CLAUDE.md` (Wave 1).
- Removed the hardcoded API keys from `api/setup-guide.js` (Wave 2).
- Replaced 12 non-timing-safe `===` admin-key compares with the
  HMAC+timingSafeEqual `isAdminRequest()` (Wave 1).
- Fixed the Stripe webhook signature verification so a forged event can no
  longer trigger free auto-provisioning (Wave 2).
- Added Twilio webhook signature verification (Wave 2).
- Made `services/secrets.js` available so the next write of
  `hosting_password` is encrypted (Wave 10).

The rotation in this checklist is what closes the loop on the values that
were in the repo before any of those code changes existed.
