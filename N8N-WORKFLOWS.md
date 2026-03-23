# n8n Workflow Specifications for PA CROP Services

Base URL: https://n8n.audreysplace.place
API Base: https://pacropservices.com/api
Admin Key: CROP-ADMIN-2026-IKE

---

## CRON WORKFLOWS (create at n8n.audreysplace.place)

### 1. Daily Ops Digest (8:00 AM ET)
- **Trigger:** Cron → 0 8 * * * (8am daily)
- **Action:** HTTP Request → GET `https://pacropservices.com/api/ops-digest?key=CROP-ADMIN-2026-IKE&send=true`
- **Result:** Email digest sent to hello@pacropservices.com with client counts, system health, pending actions

### 2. Weekly Entity Monitor (Monday 6:00 AM)
- **Trigger:** Cron → 0 6 * * 1 (6am Monday)
- **Action:** HTTP Request → GET `https://pacropservices.com/api/monitor-all?key=CROP-ADMIN-2026-IKE`
- **Result:** All client entities checked against PA DOS, alerts sent for status changes via email + SMS

### 3. Weekly Hosting Health (Monday 7:00 AM)
- **Trigger:** Cron → 0 7 * * 1 (7am Monday)
- **Action:** HTTP Request → GET `https://pacropservices.com/api/hosting-health?key=CROP-ADMIN-2026-IKE`
- **Result:** All 20i hosting packages checked for SSL status, alerts emailed

### 4. Monthly Churn Check (1st of month, 9:00 AM)
- **Trigger:** Cron → 0 9 1 * * (9am, 1st of month)
- **Action:** HTTP Request → GET `https://pacropservices.com/api/churn-check?key=CROP-ADMIN-2026-IKE`
- **Result:** At-risk clients identified, retention emails auto-sent

### 5. Monthly Upsell Engine (5th of month, 10:00 AM)
- **Trigger:** Cron → 0 10 5 * * (10am, 5th of month)
- **Action:** HTTP Request → GET `https://pacropservices.com/api/upsell?key=CROP-ADMIN-2026-IKE&send=true`
- **Result:** Upsell opportunities identified, upgrade emails sent to top candidates

### 6. Monthly Review Requests (15th of month, 11:00 AM)
- **Trigger:** Cron → 0 11 15 * * (11am, 15th of month)
- **Action:** HTTP Request → GET `https://pacropservices.com/api/review-request?key=CROP-ADMIN-2026-IKE`
- **Result:** Google review request emails sent to clients 60-90 days in

### 7. Daily Win-Back Check (9:00 AM)
- **Trigger:** Cron → 0 9 * * * (9am daily)
- **Action:** HTTP Request → GET `https://pacropservices.com/api/winback?key=CROP-ADMIN-2026-IKE`
- **Result:** Expired clients get escalating win-back: Day 1 email → Day 7 SMS → Day 14 AI call flag → Day 30 remove

### 8. Retargeting Drip (webhook-triggered)
- **Webhook:** crop-retarget-start
- **Logic:** Receives { email, name, riskScore, day }
  - Day 1: Send "Your compliance report" email (Emailit)
  - Day 3: Send "Case study: How [entity] avoided dissolution" (Emailit)
  - Day 7: Send "Your entity may be at risk" with urgency (Emailit)
  - Day 14: Send "Last chance: $99 protects your business" (Emailit)
  - Use n8n Wait nodes between each step
  - Check if email is in SuiteDash as client before each send (skip if converted)

---

## EXISTING WORKFLOWS (already active)

| ID | Name | Status |
|----|------|--------|
| ndDWaSmPO4290CgK | Lead Nurture Start | ✅ Active |
| RSibNfwSM9aw3vUW | Hot Lead Alert | ✅ Active |
| l2495RxXLxkYzqcU | Portal Reset | ✅ Active |
| 9j4pW3PmmYufMG8T | Partner Onboarding | ✅ Active |
| OkjdJx2bRqlgl1s7 | New Client Onboarding | ✅ Active |
| il9DOXSAK9hUo2Ru | Annual Report Reminders | ✅ Active |
| gE6dROHiqT2XAUiq | Acumbamail Sync | ✅ Active |
| Ov3nTuiJKarlRvhS | 20i Provisioning | ✅ Active |

---

## STRIPE SUBSCRIPTION MIGRATION

**Current:** One-time Stripe Checkout links (buy.stripe.com/...)
**Target:** Stripe Subscriptions with auto-renewal

### Steps in Stripe Dashboard:
1. Go to stripe.com/dashboard → Products
2. For each existing product, edit and change pricing to "Recurring" → "Yearly"
3. Create new Checkout links from the recurring prices
4. Update the 4 buy links in index.html

### Product → Subscription mapping:
- Compliance Only $99/yr → Create recurring price, yearly billing
- Business Starter $199/yr → Create recurring price, yearly billing
- Business Pro $349/yr → Create recurring price, yearly billing
- Business Empire $699/yr → Create recurring price, yearly billing

### Webhook events to handle (already supported in stripe-webhook.js):
- `checkout.session.completed` → New subscription started
- `invoice.payment_failed` → Subscription payment failed (dunning)
- `customer.subscription.deleted` → Subscription cancelled (trigger win-back)

---

## AI VOICE INTEGRATION (Thoughtly/Insighto)

### Hot Lead Auto-Call
- **Trigger:** n8n receives hot lead alert (score > 7)
- **Action:** POST to Thoughtly API → `https://api.thoughtly.com/v1/calls`
  - API Key: `0dy3971e2bgvrk3y6j1cs9l`
  - Script: "Hi, this is the PA CROP Services compliance team. You recently checked your compliance status and we noticed some areas that may need attention. Do you have a moment to discuss how we can help protect your business entity?"
- **Fallback:** If Thoughtly unavailable, use Insighto
  - API Key: `in-8sy7gCOBIkfcftX7SJ-0tNSeVHI1GKoR3u9LwGDvyLA`

### Win-Back Call (Day 14)
- **Trigger:** n8n checks /api/winback, finds clients with winback_stage = "3-call-needed"
- **Action:** POST to Thoughtly → same flow as hot lead but with win-back script
