# PA CROP Services — Communication Stack Integration Guide

## Credentials Reference

| Service | Key Type | Value | Base URL |
|---------|----------|-------|----------|
| Insighto.ai | API Key | `in-8sy7gCOBIkfcftX7SJ-0tNSeVHI1GKoR3u9LwGDvyLA` | `https://app.insighto.ai` |
| CallScaler | API Token | `120\|ZPLZosyaRbCmkwTs01wRtYxtfJt1m9SUUTcBzz7K` | `https://callscaler.com` |
| Thoughtly | API Key | `0dy3971e2bgvrk3y6j1cs9l` | `https://api.thoughtly.com` |
| SMS-iT | API Key | `SMSIT_a1a5c935d1626fb1ad8d95de9455857d3225730e1b992f62c355c83158a4a7dc` | `https://aicpanel.smsit.ai/api/v2` |
| Trafft | Client ID | `380067799445b9b14ebbad232d7a8dbf` | `https://app.trafft.com` |
| Trafft | Client Secret | `78a364a82340cf30e670fb8b427e48aa...` | OAuth2 flow |

## API Status (tested March 22, 2026)

- **Insighto.ai**: ✅ API responding (dashboard-configured, agents created via UI)
- **CallScaler**: ⚠️ API works via Zapier integration (not direct REST from server)
- **Thoughtly**: ⚠️ Needs dashboard setup first, then API for triggers
- **SMS-iT**: ⚠️ API v2 endpoints — configure via dashboard, trigger via Zapier/webhook
- **Trafft**: ⚠️ OAuth2 flow — configure booking page via dashboard, embed on site

## Architecture

```
INBOUND (visitor → us)
  Website → Insighto chatbot (replaces Groq chatbot)
  Phone → CallScaler tracking # → Insighto voice agent → escalate to human
  Booking → Trafft scheduling page → Google Calendar sync
  SMS inquiry → SMS-iT 2-way texting

OUTBOUND (us → client)
  Email → Emailit SMTP (already configured in n8n)
  SMS → SMS-iT API (reminders, alerts, confirmations)
  Phone → Thoughtly AI agent (renewal calls, follow-ups, win-back)

TRACKING
  CallScaler → which ad/page drove the call
  SMS-iT → delivery receipts, opt-out management
  Insighto → conversation logs, sentiment, intent
  Trafft → booking analytics, no-show rates
```

---

## SETUP INSTRUCTIONS (Dashboard Configuration Required)

### 1. Insighto.ai — AI Chatbot + Voice Agent

**Login:** app.insighto.ai

**Step 1: Create Knowledge Base**
- Name: "PA CROP Compliance Knowledge"
- Upload the knowledge base document (see below)

**Step 2: Create Chat Agent**
- Name: "PA CROP Website Concierge"
- Knowledge base: PA CROP Compliance Knowledge
- System prompt: (see below)
- Widget: Enable, customize colors (#1a56db primary, #1e293b dark)
- Deploy: Get embed code, replace current chatbot.js on website

**Step 3: Create Voice Agent**
- Name: "PA CROP Phone Concierge"
- Knowledge base: Same as chat
- Voice: Choose natural US English voice
- Phone: Connect via Twilio/Telnyx (need phone number)
- Transfer: Set up transfer to 814-480-0989 for complex queries

**Step 4: Set Webhook**
- URL: https://n8n.audreysplace.place/webhook/crop-insighto-lead
- Events: new_conversation, lead_captured, appointment_requested

### 2. CallScaler — Call Tracking

**Login:** callscaler.com (use API token for Zapier)

**Step 1: Buy tracking numbers**
- 1 main number for website (replace 814-480-0989 display)
- 1 number for Google Ads
- 1 number for each major article page (optional)
- All forward to: Insighto voice agent number (or your cell initially)

**Step 2: Set up call flow**
- Greeting whisper: "PA CROP Services call from [source]"
- Forward to: Insighto phone agent → overflow to 814-480-0989
- Missed call SMS: "Thanks for calling PA CROP Services. We missed your call and will call you back within the hour."

**Step 3: Zapier integration**
- Trigger: New Call in CallScaler
- Action: POST to n8n webhook (crop-new-call)
- Passes: caller phone, duration, recording URL, source

### 3. Thoughtly — Outbound AI Calls

**Login:** thoughtly.com

**Step 1: Create outbound agent**
- Name: "PA CROP Renewal Reminder"
- Script: (see below)
- Voice: Natural US English, warm/professional
- CRM integration: Connect via webhook

**Step 2: Create outbound campaigns**
- Renewal reminder (7 days before expiry)
- Annual report deadline (30 days before Sept 30)
- Win-back (14 days after lapse)
- Lead follow-up (3 days after no email engagement)

**Step 3: Set webhook callback**
- URL: https://n8n.audreysplace.place/webhook/crop-thoughtly-result
- Events: call_completed, call_failed, appointment_booked

### 4. SMS-iT — SMS Campaigns

**Login:** aicpanel.smsit.ai

**Step 1: Configure sender**
- Register sending number (or use existing 814-480-0989)
- Set up 10DLC compliance if needed

**Step 2: Create message templates**
- (See SMS templates below)

**Step 3: Zapier/API integration**
- Trigger from n8n → SMS-iT sends SMS
- Webhook: delivery receipts back to n8n

### 5. Trafft — Appointment Booking

**Login:** app.trafft.com

**Step 1: Create service**
- Name: "Free PA Compliance Consultation"
- Duration: 15 minutes
- Price: Free
- Location: Zoom or Phone
- Staff: Assign to your calendar

**Step 2: Create booking page**
- Customize branding (PA CROP colors)
- Enable Google Calendar sync
- Enable email/SMS reminders (via Trafft built-in)

**Step 3: Embed on website**
- Get booking widget embed code
- Add to /compliance-check page as CTA
- Add "Book a call" link to homepage and chatbot

---

## KNOWLEDGE BASE DOCUMENT (for Insighto.ai)

Upload this as a text data source in Insighto:

```
PA CROP SERVICES — COMPLIANCE KNOWLEDGE BASE

ABOUT US
PA CROP Services (PA Registered Office Services, LLC) is a licensed Pennsylvania Commercial Registered Office Provider (CROP) under 15 Pa. C.S. § 109.
Address: 924 W 23rd St, Erie, PA 16502
Phone: 814-480-0989
Email: hello@pacropservices.com
Website: pacropservices.com

WHAT IS A CROP?
A CROP (Commercial Registered Office Provider) is a Pennsylvania-specific service. Every PA business entity must have a registered office address on file with the Department of State. A CROP provides that address on your behalf, receiving legal and government documents so you do not have to use your home or personal address. CROPs are licensed under 15 Pa. C.S. § 109.

IS A CROP THE SAME AS A REGISTERED AGENT?
Functionally, yes. Most states use "registered agent." Pennsylvania uses "registered office" and "Commercial Registered Office Provider." The service is the same: a reliable address where the state and courts can deliver official documents to your business.

PA ANNUAL REPORT REQUIREMENT
Starting in 2025, all PA business entities must file an annual report with the Department of State. The fee is $7 for for-profit entities. File online at file.dos.pa.gov. Deadline: September 30 each year.

THE 2027 DISSOLUTION DEADLINE
Starting in 2027, entities that have not filed their annual reports face administrative dissolution. For domestic entities, that means a long reinstatement process. For foreign entities registered in PA, dissolution is PERMANENT — no reinstatement possible.

HOW TO CHANGE YOUR REGISTERED OFFICE
File DSCB:15-108 (Change of Registered Office) with the PA Department of State at file.dos.pa.gov. The fee is $5, processed in 7-10 business days.

OUR PLANS
- Compliance Only: $99/year — Registered office, mail forwarding, compliance reminders, entity monitoring, client portal, AI assistant
- Business Starter: $199/year — Everything in Compliance + domain name, 5 email boxes, website hosting, SSL
- Business Pro: $349/year — Everything in Starter + annual report filing handled, unlimited email, 5-page website, 3 domains, priority support
- Business Empire: $699/year — Everything in Pro + VPS hosting, up to 3 websites, 10 domains, multi-entity management

All plans include: same-day document scanning, compliance reminders at 90/60/30/14/7 days, entity status monitoring, secure client portal with AI assistant.

CONTACT
Phone: 814-480-0989 (Mon-Fri 9am-5pm ET)
Email: hello@pacropservices.com
Portal: pacropservices.com/portal
Book a consultation: [Trafft booking link]
```

---

## INSIGHTO SYSTEM PROMPT (for chat and voice agents)

```
You are the PA CROP Services compliance concierge. You speak like a trusted advisor — warm, knowledgeable, direct.

VOICE RULES:
- Never say "I am an AI" or "As an AI." You ARE the compliance team.
- Use the caller/visitor's name when you have it.
- Keep responses concise — 2-3 sentences for chat, natural conversation for voice.
- End with a specific next step or offer to help further.
- For complex legal or tax questions, say "That is a question for your attorney or CPA — would you like us to connect you with one of our partners?"

GOALS (in order):
1. Answer their compliance question accurately
2. If they are not a client, gently learn their entity name and situation
3. Offer to book a free consultation or check their compliance status
4. If ready to buy, direct them to pacropservices.com/#pricing

TRANSFERS:
- If they ask to speak to a person: transfer to 814-480-0989
- If they have a billing issue: transfer to 814-480-0989
- If legal emergency (service of process): transfer immediately to 814-480-0989
```

---

## THOUGHTLY OUTBOUND SCRIPTS

### Renewal Reminder Call (7 days before)
```
Hi, this is [Agent Name] calling from PA CROP Services. Is this {{contact.first_name}}?

[If yes]
I am calling because your PA CROP Services renewal is coming up in about a week. I wanted to check in and make sure everything has been working well for you this past year.

[Wait for response]

That is great to hear. Your renewal will process automatically on your card on file, so you do not need to do anything. But if you have any questions or want to make any changes to your plan, you can call us at 814-480-0989 or log into your portal at pacropservices.com.

Is there anything else I can help you with today?

[If they want to cancel]
I understand. I will make a note and have someone from our team reach out to you to help with that. Just so you know, if your service lapses, you will want to update your registered office with the PA Department of State to stay compliant. We can help with that transition too.

Thank you for your time, and I hope your business continues to do well. Have a good day.
```

### Win-Back Call (14 days after lapse)
```
Hi, this is [Agent Name] calling from PA CROP Services. May I speak with {{contact.first_name}}?

[If yes]
I noticed your PA CROP Services account recently lapsed, and I wanted to reach out — not to sell you on anything, just to make sure your entity is still compliant.

When you leave a CROP provider, your registered office address needs to be updated with the PA Department of State. If that has not been done yet, your entity could be listed with an invalid address, which can cause problems down the road.

Would you like me to walk you through what you need to do to stay compliant?

[If they want to come back]
That is easy. I can have your account reactivated at the same plan and same price. Would you like me to set that up?

[If not interested]
I completely understand. If you ever need anything related to PA compliance in the future, you can always reach us at 814-480-0989. I wish your business well. Take care.
```

---

## SMS TEMPLATES (for SMS-iT)

### Welcome SMS (after signup)
```
Welcome to PA CROP Services! Your compliance team is now active. Log into your portal: pacropservices.com/portal | Questions? Reply here or call 814-480-0989
```

### Document Received SMS
```
PA CROP Services: We just received a document for {{entity_name}}. It has been scanned and uploaded to your portal. View it now: pacropservices.com/portal
```

### Annual Report Reminder SMS (30 days)
```
PA CROP Services reminder: Your annual report for {{entity_name}} is due Sept 30 — 30 days away. {{filing_note}} Questions? Reply or call 814-480-0989
```

### Annual Report Reminder SMS (7 days)
```
IMPORTANT: Your PA annual report is due in 7 days (Sept 30). {{filing_note}} Do not miss this deadline. Need help? Call 814-480-0989 now.
```

### Payment Failed SMS
```
PA CROP Services: Your recent payment did not go through. Please update your payment method at pacropservices.com/portal to keep your compliance coverage active.
```

### Renewal Confirmation SMS
```
Thank you! Your PA CROP Services renewal is confirmed. {{entity_name}} is covered for another year. Portal: pacropservices.com/portal
```

### Filing Confirmed SMS
```
Great news! Your annual report for {{entity_name}} has been filed with the PA Department of State. Your entity is in good standing.
```
