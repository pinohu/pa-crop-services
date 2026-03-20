# PA CROP Services — Complete Operations Bible
## Dynasty Empire | Internal Document | March 2026

---

# TABLE OF CONTENTS

1. Standard Operating Procedures (SOPs)
2. Complete Email Sequences (Every Email, Word-for-Word)
3. Sales Scripts and Objection Handling
4. SuiteDash Configuration Specification
5. n8n Workflow Specifications
6. Google Ads Campaign Specifications
7. Social Media Content Calendar
8. Partner Program Operations
9. Compliance Calendar and Tracking
10. KPI Dashboard and Reporting
11. Client Onboarding Checklist
12. Crisis and Escalation Procedures

---

# 1. STANDARD OPERATING PROCEDURES

## SOP-001: Daily Mail Processing

**Frequency:** Monday-Friday, 10:00 AM and 2:00 PM
**Responsible:** Mail Handler / Operations Manager
**Time:** 15-30 minutes per session

**Procedure:**
1. Collect all mail from the Erie office mailbox
2. Sort into three categories:
   - **URGENT:** Service of process, court documents, government notices (red flag)
   - **STANDARD:** Annual report notices, DOS correspondence, business mail
   - **JUNK:** Unsolicited commercial mail, marketing materials
3. For URGENT mail:
   - Photograph the envelope before opening
   - Scan all pages at 300 DPI minimum as PDF
   - Log in SuiteDash: Date received, client entity name, document type, serving party (if applicable)
   - Upload to client's portal under "Legal Documents" folder
   - Send immediate email notification (use Template EMAIL-SOP-001)
   - For Premium clients: Call client's primary phone within 2 hours
   - If client unreachable after 48 hours: Send certified mail to address on file
4. For STANDARD mail:
   - Scan at 300 DPI as PDF
   - Upload to client's portal under "Correspondence" folder
   - Send email notification (use Template EMAIL-SOP-002)
   - Forward original via USPS if client is on Starter tier
5. For JUNK mail:
   - Open to verify it is junk (not disguised legal correspondence)
   - Recycle. Do not forward.
6. Log all activity in the daily mail log spreadsheet

## SOP-002: New Client Onboarding

**Trigger:** Stripe payment confirmation webhook
**Responsible:** Automated (SuiteDash + n8n), reviewed by Operations Manager
**Time:** 2-3 minutes manual review per client

**Automated Steps (n8n + SuiteDash):**
1. Stripe webhook fires to n8n
2. n8n creates SuiteDash contact with: name, email, entity name, entity number, entity type, tier
3. SuiteDash creates portal account and sends login credentials email (EMAIL-ONBOARD-01)
4. SuiteDash generates service agreement from template, populated with client data
5. E-signature request sent to client via SuiteDash
6. Upon signing: Confirmation email sent (EMAIL-ONBOARD-02)
7. CROP information packet email sent (EMAIL-ONBOARD-03)
8. 30-day onboarding drip sequence activates

**Manual Review Steps:**
1. Verify client entity exists in PA DOS database (file.dos.pa.gov)
2. Confirm entity number and entity type match
3. Note annual report deadline based on entity type:
   - Corporation: June 30
   - LLC: September 30
   - All others: December 31
4. Set compliance calendar reminders in SuiteDash
5. If client needs to update their DOS filing to list our CROP name:
   - Send filing instructions email (EMAIL-ONBOARD-04)
   - Provide pre-populated form link if available

## SOP-003: Annual Report Filing (Premium Tier)

**Trigger:** 60 days before client's annual report deadline
**Responsible:** Operations Manager
**Time:** 5-10 minutes per filing

**Procedure:**
1. Pull client's current information from SuiteDash
2. Navigate to file.dos.pa.gov
3. Search for client's entity by name or entity number
4. Select "File Annual Report"
5. Verify all pre-populated information is correct:
   - Entity name and jurisdiction
   - Registered office / CROP information (should list our name)
   - Governor names (directors, managers, etc.)
   - Principal officer names and titles
   - Principal office address
6. If any information needs updating: Contact client for confirmation before filing
7. Submit the annual report ($7 filing fee for for-profit entities)
8. Download the filed report and acknowledgment letter
9. Upload to client's SuiteDash portal under "Annual Reports" folder
10. Send confirmation email (EMAIL-AR-CONFIRM)
11. Log completion in the annual report tracking spreadsheet

## SOP-004: Change of Registered Office Processing

**Trigger:** Client request (new client switching to us, or existing client leaving)
**Responsible:** Operations Manager
**Time:** 10-15 minutes per change

**For new clients switching TO us:**
1. Verify active service agreement on file
2. Prepare Change of Registered Office form (DSCB:15-143)
3. Fill in: Entity name, entity number, new registered office = our CROP name
4. Client does NOT need to sign — PA DOS doesn't require original signatures
5. Submit online at file.dos.pa.gov or mail to PA Corporation Bureau
6. Filing fee: $5 (online) or $70 (if changing address)
7. Confirm change reflected in DOS database within 1-2 business days
8. Notify client of completion

**For clients leaving us (SOP-004B):**
1. Send termination acknowledgment email (EMAIL-TERM-01)
2. Inform client they must file Change of Registered Office within 30 days
3. Provide blank form and instructions
4. Continue forwarding mail for 90 days post-termination
5. After 90 days: Return any received mail to sender with "No Longer at This Address"

## SOP-005: Failed Payment / Dunning Process

**Trigger:** Stripe payment failure webhook
**Responsible:** Automated (n8n), escalated to Operations Manager at Day 14

**Dunning Sequence:**
- Day 0: Stripe retries automatically
- Day 1: Email notification of failed payment (EMAIL-DUNNING-01)
- Day 3: Second notification with update payment link (EMAIL-DUNNING-02)
- Day 7: Third notification, warning of service suspension (EMAIL-DUNNING-03)
- Day 14: Operations Manager reviews. If no response: Phone call attempt + email (EMAIL-DUNNING-04)
- Day 21: Final notice — service will be terminated in 10 days (EMAIL-DUNNING-05)
- Day 30: Service suspended. Client notified of termination and post-termination obligations (EMAIL-TERM-01)
- Day 60: If still unpaid: Initiate CROP withdrawal process (SOP-004B)

## SOP-006: Partner Firm Onboarding

**Trigger:** Signed partner agreement
**Responsible:** Operations Manager / Partner Account Manager
**Time:** 1-2 hours initial setup

**Procedure:**
1. Create partner account in SuiteDash with "Partner" role
2. Configure white-label portal:
   - Upload partner's logo
   - Set brand colors
   - Configure custom domain (if provided by partner) or subdomain
3. Create partner dashboard with:
   - Client count and status overview
   - Revenue tracking
   - Renewal schedule
   - Support ticket summary
4. Set up bulk client import template (CSV format):
   - Required fields: Entity Name, Entity Number, Entity Type, Contact Name, Contact Email, Contact Phone
   - Optional fields: Mailing Address, Annual Report Deadline, Notes
5. Process initial client import:
   - Validate all entity numbers against PA DOS database
   - Create SuiteDash accounts for each client
   - Send welcome emails with partner branding
   - Activate onboarding sequences
6. Schedule 30-day check-in call with partner
7. Provide co-marketing materials package:
   - Email templates (partner-branded)
   - Social media post templates
   - Website badge/seal image
   - Client-facing FAQ document
   - Referral link with tracking

---

# 2. COMPLETE EMAIL SEQUENCES

## Onboarding Sequence (8 Emails, 30 Days)

### EMAIL-ONBOARD-01: Welcome + Login Credentials
**Subject:** Welcome to PA CROP Services — your account is ready
**Timing:** Immediate upon payment

Hi [First Name],

Welcome to PA CROP Services! Your account is set up and ready to go.

Here are your login credentials:
- Portal URL: [portal_url]
- Email: [client_email]
- Temporary Password: [temp_password]

Please log in and change your password at your earliest convenience.

Your service tier: [Tier Name]
Your annual renewal date: [Renewal Date]

Next step: You'll receive your CROP information packet shortly with instructions for updating your PA Department of State filing to list us as your registered office provider.

If you have any questions, just reply to this email or open a support ticket in your portal.

Welcome aboard,
The PA CROP Services Team
pacropservices.com

---

### EMAIL-ONBOARD-02: Service Agreement Signed Confirmation
**Subject:** Agreement confirmed — you're all set
**Timing:** Upon e-signature completion

Hi [First Name],

Your service agreement has been signed and filed. A copy is available in your portal under "Documents."

What happens now:
1. We are now your official CROP on file with the Commonwealth of Pennsylvania
2. All service of process and legal mail will be received at our Erie office
3. Documents will be scanned and uploaded to your portal within 1 business day
4. You'll receive email notifications whenever new documents arrive

Your entity: [Entity Name]
Entity number: [Entity Number]
Your CROP: PA CROP Services (Dynasty Compliance Services, LLC)

Best,
The PA CROP Services Team

---

### EMAIL-ONBOARD-03: CROP Information Packet
**Subject:** Important: How to update your PA filing to list us as your CROP
**Timing:** Day 0 (same day as welcome)

Hi [First Name],

To complete your setup, you need to update your registered office with the PA Department of State to list PA CROP Services as your Commercial Registered Office Provider.

Here's how:

OPTION A — Online (Recommended, fastest):
1. Go to file.dos.pa.gov
2. Log in or search for your entity: [Entity Name]
3. Select "File a Change of Registered Office"
4. Choose "Commercial Registered Office Provider"
5. Enter our name: Dynasty Compliance Services, LLC
6. Submit. Fee: $5 online.

OPTION B — By Mail:
1. Download form DSCB:15-143 from your portal (we've pre-populated it for you)
2. Mail to: PA Department of State, Bureau of Corporations, P.O. Box 8722, Harrisburg, PA 17105-8722
3. Include a check for $70 payable to "Commonwealth of Pennsylvania"

Processing time: 1-2 business days for online, 5-7 business days for mail.

If you need help with this, reply to this email or call us and we'll walk you through it.

Best,
The PA CROP Services Team

---

### EMAIL-ONBOARD-04: Profile Completion Guide
**Subject:** Quick win: Complete your portal profile (2 minutes)
**Timing:** Day 1

Hi [First Name],

A quick tip to get the most out of your PA CROP Services account: take 2 minutes to complete your portal profile.

Log in at [portal_url] and make sure we have:
- Your current mailing address (where we forward physical mail)
- Your preferred phone number
- Your entity's principal office address
- Names and titles of your principal officers/governors

Why it matters: This information helps us file your annual report accurately (Premium tier), forward documents to the right address, and send compliance reminders to the right people.

Log in now: [portal_url]

Best,
The PA CROP Services Team

---

### EMAIL-ONBOARD-05: Feature Highlight — Compliance Calendar
**Subject:** Never miss a PA deadline again
**Timing:** Day 7

Hi [First Name],

Did you know your portal includes a compliance calendar that tracks every PA filing deadline for your entity?

Here's what's on your radar:
- Annual Report deadline: [Deadline based on entity type]
- Annual report filing window opens: January 1
- Fee: $7 (for-profit entities)

[If Professional or Premium tier:]
We'll send you reminders at 90, 60, 30, 14, and 7 days before your deadline. You can customize these in your portal settings.

[If Premium tier:]
Even better — we file your annual report for you. No action needed on your end. We'll send you a confirmation when it's done.

Log in to see your full compliance calendar: [portal_url]

Best,
The PA CROP Services Team

---

### EMAIL-ONBOARD-06: Feature Highlight — Document Management
**Subject:** Your documents, organized and secure
**Timing:** Day 14

Hi [First Name],

Everything we receive on your behalf gets scanned and uploaded to your secure portal — instantly accessible from anywhere.

In your Documents section, you'll find:
- Service of process and legal documents
- Government correspondence
- Your signed service agreement
- Annual report confirmations
- Formation documents (if you used our formation service)

Documents are stored with 256-bit encryption and accessible only to you. You can download, print, or share them at any time.

Pro tip: Bookmark your portal URL for quick access: [portal_url]

Best,
The PA CROP Services Team

---

### EMAIL-ONBOARD-07: Success Story / Social Proof
**Subject:** How [similar entity type] businesses use PA CROP Services
**Timing:** Day 21

Hi [First Name],

Since switching to PA CROP Services, our clients tell us the same things:

"I don't have to worry about missing a deadline anymore." — [Testimonial placeholder]

"I work from home and didn't want my address public. Problem solved." — [Testimonial placeholder]

"My CPA recommended it and the setup took 5 minutes." — [Testimonial placeholder]

We built this service because Pennsylvania business compliance shouldn't require a law degree. You focus on running your business. We handle the rest.

Questions? Suggestions? We'd love to hear from you: [portal_url]/support

Best,
The PA CROP Services Team

---

### EMAIL-ONBOARD-08: Feedback Request + Referral
**Subject:** How are we doing? (Quick 2-question survey)
**Timing:** Day 30

Hi [First Name],

You've been with us for 30 days. We'd love your feedback.

Two quick questions:
1. How would you rate your onboarding experience? (1-5 stars)
2. Is there anything we could improve?

[Survey link]

Also — know someone who could use a PA registered office provider? Our referral program gives you $20 off your next renewal for each business you refer.

Your referral link: [referral_url]

Thanks for being a PA CROP Services client.

Best,
The PA CROP Services Team

---

## Annual Report Reminder Sequence (5 Emails)

### EMAIL-AR-90: 90-Day Reminder
**Subject:** Your PA annual report is due in 90 days
**Timing:** 90 days before deadline

Hi [First Name],

This is a friendly reminder that your Pennsylvania annual report is due on [Deadline Date].

Entity: [Entity Name]
Entity Number: [Entity Number]
Filing fee: $7

[If Starter/Professional:]
You can file online at file.dos.pa.gov. Need help? Reply to this email.

[If Premium:]
Good news — we file this for you. No action needed unless your entity information has changed. If anything is different (officers, address, etc.), please update your portal profile or reply to this email.

Best,
The PA CROP Services Team

### EMAIL-AR-60: 60-Day Reminder
**Subject:** 60 days until your PA annual report deadline
**Timing:** 60 days before deadline
[Similar structure with increased urgency]

### EMAIL-AR-30: 30-Day Reminder
**Subject:** Action needed: PA annual report due in 30 days
**Timing:** 30 days before deadline
[Stronger CTA, reminder of 2027 dissolution consequences]

### EMAIL-AR-14: 14-Day Warning
**Subject:** ⚠️ 14 days: Don't miss your PA annual report
**Timing:** 14 days before deadline
[Urgency language, direct filing link, offer to help]

### EMAIL-AR-07: 7-Day Final Warning
**Subject:** FINAL REMINDER: PA annual report due in 7 days
**Timing:** 7 days before deadline
[Maximum urgency, consequences spelled out, call to action]

### EMAIL-AR-CONFIRM: Filing Confirmation
**Subject:** ✅ Your PA annual report has been filed
**Timing:** Upon filing completion

Hi [First Name],

Your Pennsylvania annual report for [Year] has been successfully filed.

Entity: [Entity Name]
Filed on: [Date]
Confirmation: Available in your portal under "Annual Reports"

Your entity is in good standing with the Commonwealth of Pennsylvania. Your next annual report will be due [Next Deadline Date].

Best,
The PA CROP Services Team

---

## Dunning Sequence (5 Emails)

### EMAIL-DUNNING-01
**Subject:** Payment issue with your PA CROP Services account
**Timing:** Day 1 after failed payment

Hi [First Name],

We tried to process your annual renewal of $[Amount] but the payment didn't go through.

This is likely a simple issue — expired card, insufficient funds, or a bank hold.

Please update your payment method here: [payment_update_url]

Your service continues uninterrupted while we sort this out.

Best,
The PA CROP Services Team

### EMAIL-DUNNING-02
**Subject:** Quick update needed: payment for PA CROP Services
**Timing:** Day 3

[Slightly more urgent, same update link]

### EMAIL-DUNNING-03
**Subject:** Important: Your PA CROP service may be interrupted
**Timing:** Day 7

Hi [First Name],

We still haven't been able to process your renewal payment of $[Amount]. If we don't receive payment within 7 days, we may need to suspend your service.

What suspension means:
- We will continue to accept mail on your behalf
- Portal access may be limited
- Compliance reminders will be paused

Update your payment now: [payment_update_url]

If you're having trouble or need to discuss your account, reply to this email.

Best,
The PA CROP Services Team

### EMAIL-DUNNING-04
**Subject:** Account at risk — please respond
**Timing:** Day 14

[Operations Manager follows up with phone call + this email. Offer payment plan if needed.]

### EMAIL-DUNNING-05
**Subject:** Final notice: PA CROP service termination in 10 days
**Timing:** Day 21

[Final warning. Spell out consequences: they'll need to file Change of Registered Office, find new CROP, etc.]

---

## Renewal / Upsell Sequence (3 Emails)

### EMAIL-RENEW-30
**Subject:** Your PA CROP renewal is coming up — here's what's new
**Timing:** 30 days before renewal

### EMAIL-RENEW-07
**Subject:** Renewing in 7 days — consider upgrading?
**Timing:** 7 days before renewal
[Show comparison of their current tier vs. next tier up, highlight 2027 changes]

### EMAIL-RENEW-CONFIRM
**Subject:** ✅ Renewal confirmed — thank you!
**Timing:** Upon successful renewal

---

## Win-Back Sequence (3 Emails, Post-Churn)

### EMAIL-WINBACK-07
**Subject:** We miss you — 20% off to come back
**Timing:** 7 days post-churn

### EMAIL-WINBACK-30
**Subject:** Your PA business still needs a registered office
**Timing:** 30 days post-churn
[Focus on 2027 risk]

### EMAIL-WINBACK-90
**Subject:** Last chance: Special rate for former PA CROP clients
**Timing:** 90 days post-churn
[Final offer, then remove from active marketing]

---

# 3. SALES SCRIPTS AND OBJECTION HANDLING

## Inbound Call Script (When Prospect Calls)

"Thank you for calling PA CROP Services, this is [Name]. How can I help you today?"

[Listen to their question/need]

**If they're asking about CROP services generally:**
"Great question. A Commercial Registered Office Provider, or CROP, is a PA-specific service where we provide an official registered office address for your business. Every PA business entity needs one — it's where the state sends legal and official correspondence. Instead of using your home address, which becomes public record, you can list our name and we handle everything."

**If they're asking about the new annual report requirement:**
"Yes, starting in 2025, every PA business entity has to file an annual report — this replaces the old decennial report. The big change is that starting in 2027, if you don't file, your business can be administratively dissolved. We help our clients stay on top of this by sending reminders and, for our Premium clients, we actually file the report for you."

**If they're ready to sign up:**
"Excellent. We have three tiers — Starter at $79 a year for basic CROP service, Professional at $179 which adds same-day document scanning and compliance tracking, and Premium at $299 which includes everything plus we file your annual report for you. Which sounds like the best fit?"

[After they choose:]
"Perfect. I can get you set up right now. I'll just need your entity name, entity number, and an email address. The whole process takes about 5 minutes."

## Outbound Partner Pitch Call Script

"Hi [Name], this is [Your Name] from PA CROP Services. I'm reaching out because we've built a registered office provider service specifically for PA businesses, and we have a partner program designed for CPA firms like yours. Do you have 3 minutes?"

[If yes:]
"Here's the quick version: Every one of your PA business clients needs a registered office or CROP. Starting in 2027, the new annual report requirement means your clients face dissolution if they don't file. We handle the CROP and compliance side — your branding, your portal, your pricing. You pay us $99 per client per year and charge whatever you want. Most partners charge $149-$199 and pocket the difference."

"The setup takes one day. We give you a white-label portal, bulk client upload, and co-marketing materials. You don't handle any mail, any scanning, any compliance tracking. We do everything."

"Would it make sense to schedule a 15-minute demo so I can show you the partner portal?"

## Objection Handling Matrix

| Objection | Response |
|-----------|----------|
| "We already have a registered agent" | "Great — who do you use? Most national providers charge $125-300 and don't offer a self-service portal, compliance calendar, or the bundle of PA-specific services we provide. If you're happy, no worries. But if you ever want to compare, we offer a free compliance audit." |
| "I'll just use my home address" | "You absolutely can. Just keep in mind that your home address becomes part of the public record — anyone can find it through a DOS search. A CROP keeps your personal address private. It's $79 a year for peace of mind." |
| "Too expensive" | "I understand. Let me put it in context: $79 a year is $6.58 a month. A single missed service of process could result in a default judgment costing thousands. And starting in 2027, missing your annual report means dissolution. We're essentially compliance insurance." |
| "I need to think about it" | "Totally fair. What specific questions can I answer to help you decide? If it's helpful, I can send you a comparison sheet showing what's included at each tier. No pressure at all." |
| "What happens to my mail?" | "When we receive anything at our Erie office addressed to your entity, we scan it the same day and upload it to your secure portal. You get an immediate email notification with a link. For Premium clients, we also call you. The originals are forwarded via USPS." |
| "Can you file my annual report?" | "For Professional tier clients, we provide filing assistance for $50. For Premium clients, we file it for you — it's included in the price. Either way, we send reminders at 90, 60, 30, 14, and 7 days before your deadline." |
| "I've never heard of you" | "We're new to the PA CROP space, but we're built on serious technology infrastructure. Our parent company operates 100+ business directory sites nationwide. We chose to focus on PA because of the new annual report requirement — we saw that most existing CROPs are running on 2010-era websites with no automation. We built the modern version." |

---

# 4. SUITEDASH CONFIGURATION SPECIFICATION

## Portal Modules to Enable
- Dashboard (custom widgets: entity status, next deadline, recent documents)
- CRM Contacts (client records with entity information custom fields)
- Projects (for tracking annual report filings and change of office requests)
- Invoicing (Stripe integration, recurring billing)
- Proposals & E-Signatures (service agreement template)
- Tickets (support request system with SLA tracking)
- Knowledge Base (self-service articles)
- Files (document management with folder structure)
- Forms (intake forms for new clients and partner onboarding)

## Custom Fields for Client Records
- Entity Name (text)
- Entity Number (text)
- Entity Type (dropdown: LLC, Corporation, Nonprofit, LP, LLP, LLP, Business Trust, Professional Association)
- Jurisdiction of Formation (dropdown: PA + all 50 states)
- Annual Report Deadline (date, auto-calculated from entity type)
- Service Tier (dropdown: Starter, Professional, Premium, Partner)
- Partner Firm (lookup, if applicable)
- DOS Filing Status (dropdown: Current, Needs Update, Pending)
- Last Annual Report Filed (date)
- Compliance Score (calculated field)

## Folder Structure for Client Files
```
/[Client Name]/
  /Legal Documents/        ← Service of process, court docs
  /Correspondence/         ← Government mail, DOS notices
  /Annual Reports/         ← Filed reports and confirmations
  /Contracts/              ← Service agreement, amendments
  /Formation Documents/    ← If we handled formation
  /Mail Archive/           ← All other forwarded mail
```

## Automation Rules in SuiteDash
1. New Contact Created → Start Onboarding Email Sequence
2. E-Signature Completed → Update DOS Filing Status to "Needs Update" + Send EMAIL-ONBOARD-03
3. Annual Report Due in 90 Days → Start AR Reminder Sequence
4. Invoice Payment Failed → Start Dunning Sequence
5. Ticket Created → Assign to Operations Manager, set 24hr SLA (Premium) / 48hr SLA (Professional) / 72hr SLA (Starter)
6. Client Inactive 60+ Days → Send Re-Engagement Email
7. Renewal Date - 30 Days → Start Renewal/Upsell Sequence

---

# 5. N8N WORKFLOW SPECIFICATIONS

## Workflow 1: New Client Onboarding
**Trigger:** Stripe checkout.session.completed webhook
**Steps:**
1. Extract customer data from Stripe session (name, email, tier, amount)
2. Create SuiteDash contact via API
3. Create SuiteDash portal account
4. Generate service agreement from template
5. Send e-signature request
6. Create Stripe subscription for recurring billing
7. Log to Google Sheets (master client tracking)
8. Send Slack notification to #new-clients channel

## Workflow 2: Payment Failed Dunning
**Trigger:** Stripe invoice.payment_failed webhook
**Steps:**
1. Identify client from Stripe customer ID
2. Check attempt count (1st, 2nd, 3rd)
3. Branch based on attempt:
   - 1st: Send EMAIL-DUNNING-01
   - 2nd: Send EMAIL-DUNNING-02
   - 3rd: Send EMAIL-DUNNING-03 + create SuiteDash ticket for Operations Manager
4. If 4th failure (14 days): Send EMAIL-DUNNING-04 + phone call task
5. If no payment after 21 days: Send EMAIL-DUNNING-05
6. If no payment after 30 days: Suspend portal access + start termination process

## Workflow 3: Annual Report Reminder Engine
**Trigger:** Daily cron at 9:00 AM
**Steps:**
1. Query SuiteDash for all active clients
2. Calculate days until annual report deadline for each client
3. Filter for milestones: 90, 60, 30, 14, 7 days
4. For each match: Send appropriate AR reminder email
5. For Premium clients at 60 days: Create "File Annual Report" project task
6. Log all reminders sent to tracking spreadsheet

## Workflow 4: Document Upload Notification
**Trigger:** SuiteDash file upload webhook (when staff uploads scanned document)
**Steps:**
1. Extract client ID and document metadata
2. Send email notification to client with portal link
3. If document type = "Service of Process":
   - Send SMS notification (if phone on file)
   - For Premium clients: Create urgent task for phone follow-up
4. Log to document tracking spreadsheet

## Workflow 5: Partner Client Bulk Import
**Trigger:** Manual (CSV uploaded to partner portal)
**Steps:**
1. Parse CSV file
2. For each row: Validate entity number against PA DOS API
3. Create SuiteDash contacts in bulk
4. Create portal accounts with partner branding
5. Send partner-branded welcome emails
6. Activate onboarding sequences
7. Update partner dashboard metrics
8. Send summary report to partner account manager

---

# 6. GOOGLE ADS CAMPAIGN SPECIFICATIONS

## Campaign 1: High Intent Search
**Budget:** $200/month
**Bidding:** Maximize conversions, target CPA $40

**Ad Group 1: "PA Registered Agent"**
Keywords:
- pennsylvania registered agent
- pa registered agent
- pa crop service
- pennsylvania crop
- commercial registered office provider pa
- pa registered office provider

Ad Copy:
Headline 1: PA Registered Agent Service | $79/Year
Headline 2: Official CROP Provider — Same-Day Document Scanning
Headline 3: Protect Your Privacy — Don't Use Your Home Address
Description 1: Licensed PA Commercial Registered Office Provider. Online portal, compliance calendar, annual report reminders. Sign up in 5 minutes.
Description 2: Keep your home address off public records. Professional registered office in Erie, PA. All service tiers include secure client portal.

**Ad Group 2: "PA Annual Report"**
Keywords:
- pa annual report filing
- pennsylvania annual report 2026
- pa annual report requirement
- file pa annual report
- pa annual report deadline

Ad Copy:
Headline 1: PA Annual Report Due Soon | We Can Help
Headline 2: Don't Risk Dissolution — File Before the Deadline
Headline 3: $7 Filing Fee + Expert Assistance from $50
Description 1: New PA annual report requirement. Don't miss your deadline. We send reminders and file for you. Premium tier: annual report filing included.
Description 2: Starting 2027, failure to file = automatic dissolution. We track your deadlines and handle compliance. Sign up for PA CROP Services today.

## Campaign 2: Remarketing
**Budget:** $100/month
**Audience:** Site visitors who didn't convert (7-30 day window)

Ad Copy:
Headline 1: Still Need a PA Registered Office?
Headline 2: Plans from $79/Year — 5-Minute Setup
Description: You visited PA CROP Services but didn't sign up. Your PA business needs a registered office. Protect your privacy, stay compliant. Sign up today.

## Campaign 3: Competitor
**Budget:** $50/month
**Keywords:** [Competitor names] + registered agent pa

Ad Copy:
Headline 1: Compare PA CROP Providers | See Why We're Different
Headline 2: Self-Service Portal + Compliance Calendar Included

---

# 7. SOCIAL MEDIA CONTENT CALENDAR (First 30 Days)

## Week 1: Launch Week
- Mon: "We're live! PA CROP Services is now accepting clients. Every PA business needs a registered office — we make it effortless. pacropservices.com"
- Wed: "Did you know? Starting 2027, PA businesses that miss their annual report face automatic dissolution. We help you stay compliant. #PABusiness"
- Fri: "Working from home? Your home address is on public record as your registered office. We keep it private for $79/year."

## Week 2: Education
- Mon: "What is a CROP? A Commercial Registered Office Provider handles your PA registered office so you don't have to. Here's how it works: [blog link]"
- Wed: "PA Annual Report Quick Guide: Corporations due June 30. LLCs due Sept 30. All others Dec 31. Fee: $7. Don't miss it."
- Fri: "3 reasons to use a CROP instead of your home address: 1. Privacy 2. Reliability 3. Never miss service of process"

## Week 3: Social Proof + Features
- Mon: "Our client portal gives you 24/7 access to every document we receive on your behalf. Same-day scanning, secure storage."
- Wed: "CPAs and attorneys: Add registered office services to your practice with zero overhead. Partner program details: pacropservices.com/partners"
- Fri: "Fun fact: There are only ~65 CROPs registered in all of Pennsylvania. That's one for every 58,000 business entities."

## Week 4: Urgency + CTA
- Mon: "The 2027 PA dissolution deadline is real. If your business isn't in compliance, you could lose your registration. We help you stay safe."
- Wed: "Set it and forget it. Our compliance calendar tracks every deadline for your PA entity. Automated reminders at 90, 60, 30, 14, and 7 days."
- Fri: "Month 1 complete! Already serving [X] PA businesses. Welcome to every new client this month. Join them: pacropservices.com"

---

# 8. PARTNER PROGRAM OPERATIONS

## Partner Tiers
| Level | Clients | Rate | Benefits |
|-------|---------|------|----------|
| Silver | 1-49 | $99/client/yr | White-label portal, bulk upload, co-marketing kit |
| Gold | 50-199 | $89/client/yr | + Dedicated account manager, quarterly reviews |
| Platinum | 200+ | $79/client/yr | + Custom integrations, priority support, API access |

## Partner Onboarding Timeline
- Day 0: Signed partner agreement, payment setup
- Day 1: Portal configured with partner branding
- Day 2: Bulk client import processed, welcome emails sent
- Day 3: Partner live, clients active
- Day 7: Check-in call with partner
- Day 30: First performance review
- Day 90: Quarterly business review, expansion discussion

## Partner Commission Structure (Referral Partners)
For partners who refer individual clients (not white-label):
- $25 referral bonus per new client who signs up and pays
- Paid via Stripe Connect monthly
- No cap on referrals
- Referral link tracked via UTM parameters

## Partner Reporting
Monthly email report to each partner containing:
- Active client count
- New clients added this month
- Clients renewed
- Clients churned
- Total revenue generated
- Support tickets opened/resolved
- Upcoming annual report deadlines

---

# 9. COMPLIANCE CALENDAR AND TRACKING

## Filing Deadlines by Entity Type
| Entity Type | Annual Report Deadline | Notes |
|-------------|----------------------|-------|
| Domestic Business Corporation | June 30 | $7 filing fee |
| Foreign Business Corporation | June 30 | $7 filing fee |
| Domestic Nonprofit Corporation | June 30 | $0 filing fee |
| Foreign Nonprofit Corporation | June 30 | $0 filing fee |
| Domestic LLC | September 30 | $7 filing fee |
| Foreign LLC | September 30 | $7 filing fee |
| Domestic LP | December 31 | $7 filing fee |
| Foreign LP | December 31 | $7 filing fee |
| Domestic LLP | December 31 | $7 filing fee |
| All other domestic filing entities | December 31 | $7 filing fee |
| All other foreign filing associations | December 31 | $7 filing fee |

## Critical Dates
- January 1: Annual report filing window opens for all entities
- June 30: Corporation annual reports due
- September 30: LLC annual reports due
- December 31: All other entity annual reports due
- January 4, 2027: First enforcement date — dissolution penalties begin for 2027 reports
- Six months after deadline: Administrative dissolution/termination/cancellation

## Internal Compliance (Our Own Business)
- PA LLC annual report: Due September 30 ($7 fee)
- CROP registration: Keep address current with DOS
- Professional liability insurance: Annual renewal
- Stripe PCI compliance: Annual review
- Data security audit: Quarterly

---

# 10. KPI DASHBOARD AND REPORTING

## Daily Metrics (5-Minute Check)
- New signups (count + tier breakdown)
- Total active clients
- Revenue received today
- Support tickets open
- Mail pieces processed

## Weekly Metrics (15-Minute Review)
- New clients this week vs. target
- Churn events (count + reasons)
- MRR change
- Email sequence performance (open rates, click rates)
- Google Ads performance (spend, clicks, conversions, CPA)
- Partner activity (new clients, support requests)

## Monthly Metrics (1-Hour Deep Dive)
- Total ARR
- Month-over-month growth rate
- Client count by tier
- Revenue by channel (direct, partner, organic, paid)
- Churn rate
- LTV:CAC ratio
- NPS score (from monthly survey)
- Annual reports filed this month
- Partner program growth

## Targets (Year 1)
| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|----------|
| Active clients | 50 | 225 | 800 |
| MRR | $620 | $2,800 | $10,000 |
| ARR run rate | $7,440 | $33,600 | $120,000 |
| Monthly churn | <1% | <0.8% | <0.5% |
| NPS | 40+ | 50+ | 50+ |
| Partner firms | 2 | 5 | 10 |

---

# 11. CLIENT ONBOARDING CHECKLIST (Internal)

For each new client, verify all boxes are checked within 48 hours:

- [ ] Payment received and confirmed in Stripe
- [ ] SuiteDash contact created with all fields populated
- [ ] Portal account activated and login email sent
- [ ] Service agreement generated and e-signature requested
- [ ] Entity verified in PA DOS database (file.dos.pa.gov)
- [ ] Annual report deadline noted and compliance calendar set
- [ ] Filing instructions sent (if client needs to update DOS record)
- [ ] Onboarding email sequence activated
- [ ] Welcome call completed (Premium tier only)
- [ ] Client added to master tracking spreadsheet

---

# 12. CRISIS AND ESCALATION PROCEDURES

## Level 1: Standard Issues
**Handled by:** Operations Manager
**Examples:** Login issues, billing questions, general inquiries
**SLA:** 24 hours (Premium), 48 hours (Professional), 72 hours (Starter)

## Level 2: Service Issues
**Handled by:** Operations Manager + Owner
**Examples:** Missed service of process, delayed document forwarding, portal outage
**SLA:** 4 hours response, 24 hours resolution
**Action:** Immediately contact affected client(s), document incident, implement fix, send follow-up

## Level 3: Legal/Compliance Issues
**Handled by:** Owner + Attorney
**Examples:** Client claims missed service of process led to default judgment, regulatory inquiry, data breach
**SLA:** 2 hours response
**Action:**
1. Do NOT admit liability
2. Document everything with timestamps
3. Contact professional liability insurance carrier
4. Engage attorney
5. Preserve all related documents and communications
6. Notify affected clients per insurance carrier guidance

## Data Breach Response
1. Identify scope of breach
2. Contain and remediate
3. Notify affected clients within 72 hours
4. Notify Pennsylvania Attorney General if >500 records affected
5. Offer credit monitoring if personal financial data exposed
6. Document and review security procedures

---

# END OF OPERATIONS BIBLE

This document contains every operational detail needed to run PA CROP Services from Day 1. All email templates, scripts, and procedures should be loaded into SuiteDash and n8n for automation. Review and update quarterly.

Last updated: March 2026
Classification: Internal — Confidential
Owner: Dynasty Empire Holdings
