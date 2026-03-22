# PA CROP Services — Communication Stack Integration Guide
## 100% n8n-Native (No Zapier Required)

All integrations use n8n HTTP Request nodes to call APIs directly.
n8n base: https://n8n.audreysplace.place

---

## Credentials

| Service | Auth Header | Value |
|---------|------------|-------|
| Insighto.ai | `Authorization: Bearer` | `in-8sy7gCOBIkfcftX7SJ-0tNSeVHI1GKoR3u9LwGDvyLA` |
| CallScaler | `Authorization: Bearer` | `120\|ZPLZosyaRbCmkwTs01wRtYxtfJt1m9SUUTcBzz7K` |
| Thoughtly | `x-api-key` | `0dy3971e2bgvrk3y6j1cs9l` |
| SMS-iT | `Authorization: Bearer` | `SMSIT_a1a5c935d1626fb1ad8d95de9455857d3225730e1b992f62c355c83158a4a7dc` |
| Trafft | OAuth2 Client ID | `380067799445b9b14ebbad232d7a8dbf` |
| Trafft | OAuth2 Secret | `78a364a82340cf30e670fb8b427e48aa...40015` |

---

## Architecture (n8n is the brain)

```
                         ┌─────────────┐
                         │    n8n       │
                         │  (29+ CROP   │
                         │  workflows)  │
                         └──────┬───────┘
                                │
         ┌──────────┬───────────┼───────────┬──────────┐
         │          │           │           │          │
    ┌────▼────┐ ┌───▼───┐ ┌────▼────┐ ┌────▼───┐ ┌───▼────┐
    │Insighto │ │Call   │ │Thoughtly│ │ SMS-iT │ │ Trafft │
    │Chat+Voice│ │Scaler │ │Outbound │ │  SMS   │ │Booking │
    └─────────┘ └───────┘ └─────────┘ └────────┘ └────────┘
```

**Every tool talks to n8n via webhooks. n8n talks to every tool via HTTP Request nodes.**

---

## Tool Roles (Zero Overlap)

| Tool | Channel | Direction | Role |
|------|---------|-----------|------|
| **Insighto** | Web chat + Phone | Inbound | AI concierge — answers questions, qualifies leads, escalates to human |
| **CallScaler** | Phone | Tracking | Attributes which page/ad/campaign drove each call |
| **Thoughtly** | Phone | Outbound | Proactive calls — renewals, follow-ups, win-back |
| **SMS-iT** | SMS/MMS | Both | Text alerts, reminders, 2-way client texting |
| **Trafft** | Web | Inbound | Self-service appointment booking |

---

## n8n Integration Patterns

### Pattern A: Tool → n8n (Inbound Webhook)
When a tool captures something (new lead, call completed, appointment booked), it POSTs to an n8n webhook.

```
Tool event → POST https://n8n.audreysplace.place/webhook/crop-{tool}-{event}
  → n8n processes it
  → Triggers email/SMS/CRM update
```

### Pattern B: n8n → Tool (HTTP Request Node)
When n8n needs to send an SMS, trigger a call, or create a booking, it calls the tool's API.

```
n8n workflow trigger (cron, webhook, etc.)
  → HTTP Request node → Tool API
  → Tool executes (sends SMS, makes call, etc.)
```

---

## Integration 1: Insighto.ai (Chat + Voice AI)

### What Insighto Does
- **Website chatbot**: Replaces current Groq-based chatbot on all pages
- **Phone AI agent**: Answers inbound calls, qualifies leads, transfers to human
- **Both**: Trained on PA compliance knowledge base

### Dashboard Setup (app.insighto.ai)
1. Create Knowledge Base → upload the knowledge doc (at bottom of this file)
2. Create Chat Agent → assign knowledge base, set system prompt
3. Create Voice Agent → assign knowledge base, connect phone via Twilio/Telnyx
4. Get chat widget embed code → replace current chatbot.js on website
5. Set webhook URL: `https://n8n.audreysplace.place/webhook/crop-insighto-event`

### n8n Workflow: Insighto → n8n
**Trigger:** Webhook `crop-insighto-event`
**Actions:**
- If event = `lead_captured` → trigger Lead Nurture Start workflow
- If event = `appointment_requested` → create Trafft booking via API
- If event = `escalation` → send Telegram alert to owner

### n8n → Insighto (push client context)
Before a client calls, n8n can push their context to Insighto:
```
HTTP Request: POST https://app.insighto.ai/api/v1/contacts
Headers: Authorization: Bearer in-8sy7gCOBIkfcftX7SJ-0tNSeVHI1GKoR3u9LwGDvyLA
Body: { "phone": "+1...", "name": "...", "metadata": { "plan": "...", "entity": "..." } }
```

---

## Integration 2: CallScaler (Call Tracking)

### What CallScaler Does
- Cheap tracking numbers ($0.50/each) on different pages/campaigns
- Records and transcribes every call with AI
- Shows which marketing source drove each call
- Forwards calls to Insighto voice agent or your cell

### Dashboard Setup (callscaler.com)
1. Buy 2-3 tracking numbers (website main, Google Ads, article pages)
2. Set call flow: forward to Insighto phone number or 814-480-0989
3. Enable: call recording, AI transcription, missed call SMS
4. Set webhook/notification URL: `https://n8n.audreysplace.place/webhook/crop-callscaler-call`

### n8n Workflow: CallScaler → n8n
**Trigger:** Webhook `crop-callscaler-call`
**Actions:**
- Log call to SuiteDash contact record
- If new caller → create lead → trigger Lead Nurture
- If missed call → send SMS via SMS-iT: "We missed your call, calling back within the hour"
- Send Telegram alert with caller info and transcription

---

## Integration 3: Thoughtly (Outbound AI Calls)

### What Thoughtly Does
- Makes proactive phone calls using AI voice agents
- Handles: renewal reminders, deadline calls, win-back outreach, lead follow-up
- Reports results back via webhook

### Dashboard Setup (thoughtly.com)
1. Create agent: "PA CROP Renewal Reminder" (use script below)
2. Create agent: "PA CROP Win-Back" (use script below)
3. Create agent: "PA CROP Deadline Reminder" (use script below)
4. Set webhook callback: `https://n8n.audreysplace.place/webhook/crop-thoughtly-result`
5. API key for triggering calls: `0dy3971e2bgvrk3y6j1cs9l`

### n8n → Thoughtly (trigger outbound call)
```
HTTP Request: POST https://api.thoughtly.com/v1/calls
Headers: x-api-key: 0dy3971e2bgvrk3y6j1cs9l
Body: {
  "agent_id": "renewal-reminder-agent-id",
  "phone_number": "+1XXXXXXXXXX",
  "metadata": {
    "client_name": "John Smith",
    "entity_name": "Smith LLC",
    "days_until_renewal": 7
  }
}
```

### n8n Workflows That Trigger Thoughtly
- **Renewal Sequence** (7 days before): After email reminder, trigger Thoughtly call
- **Annual Report Reminders** (30 days before): For Pro/Empire clients, call to confirm filing details
- **Win-Back** (14 days after lapse): After email, trigger personal AI call
- **Lead Follow-Up** (3 days after no email open): Call leads who haven't engaged

---

## Integration 4: SMS-iT (Text Messaging)

### What SMS-iT Does
- Sends transactional SMS (document alerts, payment confirmations)
- Sends marketing SMS (compliance reminders, deadline alerts)
- 2-way texting for quick client communication
- Bulk campaigns for seasonal alerts

### Dashboard Setup (aicpanel.smsit.ai)
1. Register/verify sending number
2. Set up 10DLC compliance (required for US business texting)
3. Create contact lists: "All Clients", "Leads", "Partners"
4. Create the 7 message templates (see below)
5. Set webhook for inbound SMS: `https://n8n.audreysplace.place/webhook/crop-smsit-inbound`

### n8n → SMS-iT (send SMS)
```
HTTP Request: POST https://aicpanel.smsit.ai/api/v2/sms/send
Headers: Authorization: Bearer SMSIT_a1a5c935d1626fb1ad8d95de9455857d3225730e1b992f62c355c83158a4a7dc
Body: {
  "to": "+1XXXXXXXXXX",
  "message": "PA CROP Services: We just received a document for Smith LLC. View it in your portal: pacropservices.com/portal"
}
```

### n8n Workflows That Send SMS
| Workflow | SMS Trigger | Template |
|----------|-------------|----------|
| New Client Onboarding | After welcome email | Welcome SMS |
| Document Received | After email notification | Document alert SMS |
| Annual Report Reminders | 30 days + 7 days out | Reminder SMS |
| Payment Failed | Day 1 + Day 7 | Payment SMS |
| Filing Confirmed | After filing | Confirmation SMS |
| Renewal Confirmed | After payment | Renewal SMS |

---

## Integration 5: Trafft (Appointment Booking)

### What Trafft Does
- Self-service booking page for "Free PA Compliance Consultation"
- Google Calendar sync (avoids double-booking)
- Automated email/SMS reminders (reduces no-shows)
- Embeddable widget on website

### Dashboard Setup (app.trafft.com)
1. Create service: "Free PA Compliance Consultation"
   - Duration: 15 minutes
   - Price: Free
   - Location: Zoom or Phone
   - Buffer: 10 minutes before and after
2. Create employee/staff: Your name and calendar
3. Enable Google Calendar sync
4. Enable email + SMS reminders (built-in)
5. Customize booking page colors to match PA CROP brand
6. Get embed code or booking page URL
7. Set webhook: `https://n8n.audreysplace.place/webhook/crop-trafft-booking`

### Trafft OAuth2 Authentication (for n8n)
```
Step 1: Get access token
POST https://app.trafft.com/api/oauth/token
Content-Type: application/json
Body: {
  "grant_type": "client_credentials",
  "client_id": "380067799445b9b14ebbad232d7a8dbf",
  "client_secret": "78a364a82340cf30e670fb8b427e48aa859e15fc44669bef3207acc533c02dd6bc3f69c6197f68b166ac675aadffe44c2d5c9809c8cbc9ac620717ffaea40015"
}

Step 2: Use token in requests
GET https://app.trafft.com/api/v1/appointments
Headers: Authorization: Bearer {access_token}
```

### n8n Workflow: Trafft → n8n
**Trigger:** Webhook `crop-trafft-booking`
**Actions:**
- Create/update contact in SuiteDash
- Send confirmation SMS via SMS-iT
- If new prospect → trigger Lead Nurture
- If existing client → log in portal activity

### Website Integration
Add booking link/button to:
- Homepage final CTA section
- Compliance check results page
- Chatbot (Insighto can link to Trafft booking URL)
- All article CTAs as alternative to "call us"

---

## SMS Templates (for SMS-iT)

### 1. Welcome (after signup)
```
Welcome to PA CROP Services! Your compliance team is now on the job. Portal: pacropservices.com/portal | Call us: 814-480-0989 — Ike Ohu
```

### 2. Document Received
```
PA CROP Services: We received a document for {{entity_name}} today. Scanned and in your portal now: pacropservices.com/portal — Polycarp Ohu
```

### 3. Annual Report Reminder (30 days)
```
Reminder from PA CROP Services: Your annual report for {{entity_name}} is due Sept 30 — 30 days away. {{filing_note}} Questions? Call 814-480-0989 — Nnamdi Ohu
```

### 4. Annual Report Reminder (7 days)
```
IMPORTANT — PA CROP Services: Your annual report is due in 7 days (Sept 30). {{filing_note}} Need help? Call 814-480-0989 now. — Ikechukwu Ohu
```

### 5. Payment Failed
```
PA CROP Services: Your payment did not go through. Update at pacropservices.com/portal to keep coverage active. Need help? Reply here. — Polycarp Ohu
```

### 6. Renewal Confirmed
```
Thank you! Your PA CROP Services renewal is confirmed. {{entity_name}} is covered for another year. Portal: pacropservices.com/portal — Ikechukwu Ohu
```

### 7. Filing Confirmed
```
Done! Your annual report for {{entity_name}} has been filed with the PA Dept of State. Entity in good standing. — Nnamdi Ohu, PA CROP Services
```

---

## Thoughtly Outbound Call Scripts

### Renewal Reminder (7 days before)
```
Hi, this is [Voice] calling from PA CROP Services. Am I speaking with {{first_name}}?

[If yes]
I am calling because your PA CROP Services renewal is coming up in about a week. I wanted to check in and make sure everything has been working well for you.

[Pause for response]

Glad to hear it. Your renewal will process automatically, so you do not need to do anything. If you want to make changes, you can log into your portal at pacropservices.com or call us at 814-480-0989.

Is there anything else I can help with today? Great — have a wonderful day.
```

### Win-Back (14 days after lapse)
```
Hi, this is [Voice] from PA CROP Services. May I speak with {{first_name}}?

[If yes]
I noticed your account recently lapsed and wanted to reach out — not to pressure you, just to make sure your entity is still compliant.

When you leave a CROP provider, your registered office needs to be updated with the PA Department of State. If that has not been done, your entity could be listed with an invalid address.

Would you like help making sure everything is in order?

[If wants to return] I can reactivate your account right away — same plan, same price.
[If not interested] Completely understand. If you ever need anything, we are at 814-480-0989. Wishing your business well.
```

### Annual Report Deadline (30 days, for self-filing clients)
```
Hi, this is [Voice] from PA CROP Services calling for {{first_name}}.

[If yes]
Just a friendly reminder — your PA annual report for {{entity_name}} is due September 30, about 30 days from now. It is a quick $7 filing at file.dos.pa.gov.

If you would like us to handle the filing for you instead, that is included in our Pro plan. Want me to explain how that works?

[If yes] Great — upgrading takes two minutes in your portal. Or I can have someone walk you through it.
[If no] No problem at all. We will send you another reminder at 7 days out. Have a great day.
```

---

## Insighto Knowledge Base

(Upload this text as a data source in Insighto)

```
PA CROP SERVICES — COMPLIANCE KNOWLEDGE BASE

ABOUT US
PA CROP Services (PA Registered Office Services, LLC) is a licensed Pennsylvania
Commercial Registered Office Provider (CROP) under 15 Pa. C.S. § 109.
Address: 924 W 23rd St, Erie, PA 16502
Phone: 814-480-0989
Email: hello@pacropservices.com
Website: pacropservices.com

WHAT IS A CROP?
A CROP (Commercial Registered Office Provider) is a Pennsylvania-specific service.
Every PA business entity must have a registered office address on file with the
Department of State. A CROP provides that address on your behalf, receiving legal
and government documents so you do not have to use your home or personal address.
CROPs are licensed under 15 Pa. C.S. § 109.

IS A CROP THE SAME AS A REGISTERED AGENT?
Functionally, yes. Most states use "registered agent." Pennsylvania uses "registered
office" and "Commercial Registered Office Provider." The service is the same.

PA ANNUAL REPORT REQUIREMENT
Starting in 2025, all PA business entities must file an annual report with the
Department of State. Fee: $7 for for-profit entities. File at file.dos.pa.gov.
Deadline: September 30 each year.

THE 2027 DISSOLUTION DEADLINE
Starting in 2027, entities that have not filed annual reports face administrative
dissolution. For domestic entities: long reinstatement. For foreign entities:
PERMANENT — no reinstatement possible.

HOW TO CHANGE REGISTERED OFFICE
File DSCB:15-108 at file.dos.pa.gov. Fee: $5. Processing: 7-10 business days.

OUR PLANS
- Compliance Only ($99/yr): Registered office, mail forwarding, compliance
  reminders, entity monitoring, client portal, AI assistant
- Business Starter ($199/yr): + domain, 5 email boxes, website hosting, SSL
- Business Pro ($349/yr): + annual report filing, unlimited email, 5-page
  website, 3 domains, priority support
- Business Empire ($699/yr): + VPS hosting, 3 websites, 10 domains, multi-entity

All plans include: same-day document scanning, reminders at 90/60/30/14/7 days,
entity status monitoring, secure portal with AI assistant.

BOOKING A CONSULTATION
Prospects can book a free 15-minute PA compliance consultation at:
[Trafft booking URL — add after Trafft setup]

CONTACT
Phone: 814-480-0989 (Mon-Fri 9am-5pm ET)
Email: hello@pacropservices.com
Portal: pacropservices.com/portal
```

---

## Insighto System Prompt

```
You are the PA CROP Services compliance concierge. You speak like a trusted
advisor — warm, knowledgeable, direct.

RULES:
- Never say "I am an AI." You ARE the compliance team.
- Use the visitor's name when you have it.
- Keep chat responses to 2-3 sentences. Voice: natural conversation.
- End with a specific next step.
- For legal/tax questions: "That is one for your attorney — want us to
  connect you with a partner?"

GOALS (in order):
1. Answer their compliance question
2. Learn their entity name and situation
3. Offer a free consultation booking or compliance check
4. If ready: direct to pacropservices.com/#pricing

TRANSFERS (voice only):
- "Speak to a person" → transfer to 814-480-0989
- Billing issues → transfer to 814-480-0989
- Legal emergency → transfer immediately
```
