# PA CROP Services — AI Agent Orchestration Guide
## Who Does What: Every Tool, Every Task, Every Prompt

**Purpose:** You have an army of AI agents and tools. This document tells you exactly which one to point at each task, what to say to it, and in what order. Your job is to be the conductor — copy-paste prompts, click approve, and move to the next task.

---

# YOUR TOOL ARSENAL

| Tool | What It Does Best | Access |
|------|-------------------|--------|
| **Claude (claude.ai)** | Complex document generation, code generation, strategic thinking, multi-file projects | Browser / this conversation |
| **Claude in Chrome** | Browser automation — filling forms, clicking buttons, navigating websites | Chrome extension |
| **Cursor** | AI-powered code editor — writes, edits, debugs code in your repos | Desktop app |
| **Lovable.dev** | Full-stack web app generation from prompts — builds entire React/Next.js apps | Browser app |
| **ChatGPT** | Writing assistance, email drafting, quick lookups, phone call scripts | Browser / app |
| **OpenClaw / ClawdBot** | Telegram-based AI agent on your Flint VM — runs shell commands remotely | Telegram @pinohu_bot |
| **Flint (VM agent)** | Autonomous task execution on your server — git operations, deployments, monitoring | Claude bridge |
| **n8n** | Workflow automation — webhooks, API calls, scheduled jobs, email sequences | n8n.audreysplace.place |
| **Claude Code** | Command-line AI coding agent — works directly in terminal on repos | Terminal |
| **GitHub Copilot (in Cursor)** | Inline code completion and generation | Cursor IDE |

---

# THE ORCHESTRATION SEQUENCE

Follow this EXACTLY. Each task block tells you:
- Which tool to use
- The exact prompt to give it
- What to do with the output
- What comes next

---

# ROUND 1: THINGS ONLY YOU CAN DO (30-45 minutes of clicking)
## Do these FIRST — everything else is blocked until these are done.

These are the tasks where YOU must be the human clicking buttons because they require your identity, your money, or your signature. Use **Claude in Chrome** to assist where possible.

---

### TASK 1.1: Get EIN from IRS
**Tool:** Claude in Chrome (browser automation)
**Time:** 10 minutes

Open Claude in Chrome and say:

```
Navigate to https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online

Click "Apply Online Now" then "Begin Application"

I need to apply for an EIN for a new LLC:
- Entity type: Limited Liability Company (LLC)
- Reason: Started a new business
- State: Pennsylvania
- Number of members: 1
- Entity name: PA Registered Office Services, LLC

Walk me through each page. I'll fill in my personal information (SSN, address) myself — just navigate and tell me what to enter on each screen.
```

**What you do:** Fill in your SSN, address, and personal details when prompted. Claude in Chrome handles the navigation.

**Output:** Screenshot the EIN confirmation. Download the CP 575 letter. Save the EIN number.

---

### TASK 1.2: Form the PA LLC
**Tool:** Claude in Chrome (browser automation)
**Time:** 15 minutes

```
Navigate to https://file.dos.pa.gov

I need to file a Certificate of Organization for a Domestic LLC:
- LLC Name: PA Registered Office Services, LLC
- Registered office: [YOUR ERIE STREET ADDRESS]
- County: Erie
- Organizer: [YOUR FULL NAME]

Help me navigate through the filing process. Click "Initial Forms" tab, then "Certificate of Organization — Domestic LLC". Walk me through each field. I'll handle the payment ($125).
```

**What you do:** Enter payment info. Approve the filing.

**Output:** Save the Entity Number and Certificate of Organization.

---

### TASK 1.3: Call the Bureau
**Tool:** ChatGPT (phone call script)
**Time:** 5 minutes

Open ChatGPT and say:

```
I'm about to call the PA Bureau of Corporations at (717) 787-1057. I just formed PA Registered Office Services, LLC (entity number [YOUR NUMBER]) and want to register as a CROP under 15 Pa.C.S. § 109. 

Give me an exact phone script — what to say when they answer, follow-up questions to ask, and what to write down from their responses.
```

**What you do:** Make the phone call. Read the script. Write down their answers.

---

### TASK 1.4: Fill Out and Mail CROP Registration
**Tool:** You (physical paper, pen, mailbox)
**Time:** 20 minutes

1. Open CROP-01-Cover-Letter.docx and CROP-02-Statement-of-Address.docx
2. Fill in all blanks with your information
3. Print both
4. Sign both
5. Write a $70 check to "Commonwealth of Pennsylvania"
6. Put in envelope → Bureau of Corporations, P.O. Box 8722, Harrisburg, PA 17105-8722
7. Mail via USPS Certified Mail

**No AI can do this for you.** It requires your signature and a physical check.

---

### TASK 2.1: Open Business Bank Account
**Tool:** You (in person or online)
**Time:** 15-30 minutes

**If online (Mercury, Relay, or Novo):**
Use Claude in Chrome:
```
Navigate to https://mercury.com/signup
Help me open a business checking account for:
- Business name: PA Registered Office Services, LLC
- EIN: [YOUR EIN]
- State: Pennsylvania
- Address: [YOUR ERIE ADDRESS]
Walk me through each step.
```

**What you do:** Enter your personal info, upload ID, approve.

---

### TASK 2.2: Create Stripe Account
**Tool:** Claude in Chrome
**Time:** 15 minutes

```
Navigate to https://dashboard.stripe.com/register

Help me create a Stripe account for my business:
- Business type: LLC
- Legal name: PA Registered Office Services, LLC
- EIN: [YOUR EIN]
- Address: [YOUR ERIE ADDRESS]
- Industry: Professional Services
- Website: pacropservices.com
- Statement descriptor: PACROPSERVICES

Walk me through the entire onboarding flow. I'll enter my bank account details and personal info myself.
```

---

### TASK 2.3: Create Stripe Products
**Tool:** Claude in Chrome
**Time:** 10 minutes

```
I'm in the Stripe dashboard. Navigate to Product Catalog.

Create three recurring products:

Product 1:
- Name: PA CROP Services — Starter
- Description: PA registered office address, mail forwarding, annual report reminders, online portal
- Price: $79.00/year (recurring, yearly)

Product 2:
- Name: PA CROP Services — Professional  
- Description: Everything in Starter plus same-day scanning, compliance calendar, filing assistance, business address
- Price: $179.00/year (recurring, yearly)

Product 3:
- Name: PA CROP Services — Premium
- Description: Everything in Professional plus annual report filing, unlimited mail forwarding, notarization, dedicated support
- Price: $299.00/year (recurring, yearly)

After creating each one, copy the Price ID (price_...) and show it to me.
```

---

### TASK 2.4: Create Stripe Payment Links
**Tool:** Claude in Chrome
**Time:** 5 minutes

```
In Stripe dashboard, go to Payment Links.

Create three payment links, one for each product we just created:
1. Starter ($79/year) — create link, copy URL
2. Professional ($179/year) — create link, copy URL  
3. Premium ($299/year) — create link, copy URL

For each link:
- Allow promotion codes: Yes
- Collect: email, name, phone, billing address
- After payment: redirect to https://pacropservices.com/welcome.html

Show me all three URLs when done.
```

**Save these three URLs.** You'll give them to Claude/Cursor to put in the website.

---

### TASK 3.1: Register Domain
**Tool:** Claude in Chrome
**Time:** 5 minutes

```
Navigate to https://www.namecheap.com/domains/registration/results/?domain=pacropservices.com

Help me purchase pacropservices.com. Walk me through checkout. I'll enter payment info.
```

---

### TASK 3.2: Set Up Business Email
**Tool:** Claude in Chrome
**Time:** 15 minutes

```
Navigate to https://app.emailit.com

Help me set up email sending for pacropservices.com:
1. Go to Sending Domains → Add Domain → pacropservices.com
2. Copy the SPF and DKIM DNS records shown
3. Add those records to my domain DNS
4. Verify the domain
5. Go to Credentials → Create SMTP Credential
6. Copy the SMTP host, port, username, and password

Then help me set up email RECEIVING:
- If domain is on Cloudflare: go to Cloudflare → Email → Email Routing
- Add forwarding rules: hello@, partners@, support@ → my personal email
- This is free and instant
```

---

### TASK 3.3: Get Business Phone
**Tool:** Claude in Chrome
**Time:** 5 minutes

```
Navigate to https://voice.google.com

Help me get a Google Voice number:
- Preferred area code: 814 (Erie, PA)
- Link to my personal phone

After setup, I need to record a voicemail greeting. Give me the exact script to read:
"You've reached PA CROP Services. We're a Commercial Registered Office Provider serving Pennsylvania businesses. Please leave your name, company name, and phone number, and we'll return your call within one business day. For immediate assistance, email hello@pacropservices.com."
```

---

### TASK 3.4: Google Business Profile
**Tool:** Claude in Chrome
**Time:** 10 minutes

```
Navigate to https://business.google.com

Create a Google Business Profile:
- Business name: PA CROP Services
- Category: Registered Agent (or Business Management Consultant if not available)
- Address: [YOUR ERIE ADDRESS]
- Service area: Pennsylvania (entire state)  
- Phone: [YOUR BUSINESS PHONE]
- Website: https://pacropservices.com
- Hours: Monday-Friday 9 AM - 5 PM

Add this description: "Licensed Pennsylvania Commercial Registered Office Provider (CROP). We provide registered office addresses, document scanning, compliance monitoring, and annual report filing services for PA business entities. Plans from $79/year."

Walk me through verification setup.
```

---

### TASK 4.1: Get E&O Insurance
**Tool:** Claude in Chrome
**Time:** 20 minutes

```
Navigate to https://www.insureon.com

Help me get an Errors & Omissions (E&O) insurance quote:
- Business: PA Registered Office Services, LLC
- State: Pennsylvania
- Type: Professional services / Business services
- Employees: 1
- Revenue estimate: $50,000 (year 1)
- Coverage needed: $1,000,000 per occurrence / $1,000,000 aggregate
- Deductible: $1,000 or $2,500

Walk me through the application. I'll review the quote and approve the purchase.
```

---

# ROUND 2: SOFTWARE DEVELOPMENT (AI agents do everything)
## Start these as soon as you have: domain registered, Stripe payment link URLs, and API keys.

---

### TASK 5.1-5.5: Build and Deploy the Website
**Tool:** Cursor (AI code editor)
**Time:** 45-60 minutes

Open Cursor. Open the `pa-crop-services` repo. Open the AI chat panel (Cmd+L or Ctrl+L) and paste this prompt:

```
I need you to do the following tasks in order. Read the entire repo first to understand context.

TASK 1: Update the landing page
- Open marketing/website/index.html
- Replace the three "Get started" href="#signup" links in the pricing section with these Stripe Payment Links:
  - Starter button: [PASTE STARTER STRIPE LINK]
  - Professional button: [PASTE PROFESSIONAL STRIPE LINK]  
  - Premium button: [PASTE PREMIUM STRIPE LINK]
- Replace (XXX) XXX-XXXX with [YOUR PHONE NUMBER]
- Plausible Analytics is already embedded — no action needed

TASK 2: Create the deployment structure
- Create a /public directory in the repo root
- Copy marketing/website/index.html to public/index.html
- Create a vercel.json in the repo root with:
  {"buildCommand":"","outputDirectory":"public"}

TASK 3: Convert SEO articles to HTML pages
- Read marketing/seo-articles/PA-CROP-SEO-Articles.md
- Convert each of the 5 articles into standalone HTML pages in public/
- Each page should:
  - Have the same nav and footer as index.html
  - Have proper <title> and <meta description> tags
  - Include Schema.org Article markup
  - Have internal links to other articles and back to the pricing page
  - Have a CTA at the bottom: "Need a PA registered office? Plans from $79/year"
  - Plausible Analytics script is already included
- Name them:
  - public/what-is-a-pennsylvania-crop.html
  - public/pa-annual-report-requirement-guide.html
  - public/pa-2027-dissolution-deadline.html
  - public/how-to-change-registered-office-pennsylvania.html
  - public/crop-vs-registered-agent-pennsylvania.html

TASK 4: Create a welcome/success page
- Create public/welcome.html — the page customers see after Stripe checkout
- Should say: "Welcome to PA CROP Services! Your payment has been received. You'll receive a welcome email within the next few minutes with your portal login credentials. If you have any questions, email hello@pacropservices.com"

TASK 5: Create sitemap.xml and robots.txt in public/
- sitemap.xml listing all 7 pages (index + 5 articles + welcome)
- robots.txt allowing all crawlers, pointing to the sitemap

TASK 6: Commit everything and push to GitHub
- git add -A
- git commit -m "Deploy-ready website with Stripe checkout and SEO articles"
- git push origin main

Do all 6 tasks in sequence. Show me the changes as you go.
```

**What you do:** Review Cursor's output. Click "Accept" on each change. If it asks questions, answer them.

---

### TASK 5.4-5.5: Deploy to Vercel
**Tool:** Claude in Chrome OR Cursor terminal
**Time:** 10 minutes

**Option A — Cursor terminal:**
```bash
# In Cursor terminal, from the repo root:
npm i -g vercel
vercel --prod
# Follow the prompts: select pinohu account, link to existing project or create new
```

**Option B — Claude in Chrome:**
```
Navigate to https://vercel.com/dashboard

Help me deploy the pa-crop-services repository:
1. Click "Add New" → "Project"
2. Import from GitHub: pinohu/pa-crop-services
3. Framework: Other
4. Output directory: public
5. Deploy

Then add the custom domain:
- Go to Settings → Domains → Add "pacropservices.com"
- Show me the DNS records I need to add

Then help me add those DNS records in my domain registrar.
```

---

### TASK 6.1-6.6: Build n8n Workflows
**Tool:** Claude (this conversation or a new one)
**Time:** 1-2 hours

Come back to Claude and say:

```
I have the following credentials ready:
- Stripe Secret Key: sk_live_...
- Stripe Webhook Secret: whsec_...
- SuiteDash API Public ID: ...
- SuiteDash API Secret: ...
- SuiteDash Base URL: ...
- SMTP Host: smtp.emailit.com (from Emailit credentials)
- SMTP User: hello@pacropservices.com
- SMTP Pass: ...
- AiTable API Key: ...
- AiTable Datasheet ID: ...

Build me these n8n workflow JSON files that I can import directly:

1. CROP New Client Onboarding: Stripe checkout.session.completed → create SuiteDash contact → send welcome email → log to AiTable → send notification

2. Annual Report Reminder Engine: Daily cron at 9 AM → get all clients → calculate days until deadline by entity type → send 90/60/30/14/7-day reminder emails

3. Payment Failed Dunning: Stripe invoice.payment_failed → 5-step email recovery with wait nodes (day 1, 3, 7, 14, 21)

Generate each as a complete, importable n8n workflow JSON file. Use my real credentials in the environment variable references.
```

**What you do:** Download the JSON files. Go to n8n.audreysplace.place. Import each one. Activate them.

---

### TASK 6.2: Import Existing Workflows
**Tool:** Claude in Chrome
**Time:** 15 minutes

```
Navigate to https://n8n.audreysplace.place

Help me import n8n workflow files:
1. Click "Workflows" in the left sidebar
2. For each JSON file I provide, click "Add workflow" → "Import from file" → select the file → Import
3. After importing, open each workflow and help me update any credential placeholders with my real API keys

I have 6 existing workflows to import from the pa-crop-services repo (suitedash-automation/n8n/ folder):
- 03_renewal.json
- 04_winback.json
- 05_failure_handler.json
- 06_data_sync.json
- 08_master_event_router.json
- 09_qa_audit.json

Plus 3 new ones that Claude will generate for me.

Let's start with the first file.
```

---

### TASK 7: Configure SuiteDash
**Tool:** Claude in Chrome (for the extensive UI configuration)
**Time:** 1-2 hours

This is the longest single task. Claude in Chrome navigates the SuiteDash admin panel while you approve changes.

```
Navigate to [YOUR SUITEDASH PORTAL URL] and log in as admin.

I need to configure this SuiteDash instance for PA CROP Services. I have a complete configuration spec. Let me walk you through it step by step.

STEP 1 — BRANDING:
Go to Profile Avatar → Your Branding → Platform Branding
- Upload this logo: [provide logo file or describe]
- Set primary color: #534AB7
- Set accent color: #1B4F8A
- Set sidebar color: #1E2333

STEP 2 — CRM CUSTOM FIELDS:
Go to Settings → CRM → Custom Fields
Create these fields one by one (I'll tell you each one):

Field 1: "Entity Name" — Type: Text — Required: Yes
Field 2: "Entity Number" — Type: Text — Required: Yes  
Field 3: "Entity Type" — Type: Dropdown — Options: Domestic Business Corporation, Foreign Business Corporation, Domestic Nonprofit Corporation, Foreign Nonprofit Corporation, Domestic LLC, Foreign LLC, Domestic LP, Foreign LP, Domestic LLP, Business Trust, Professional Association, Other
[continue for all 21 fields from the pa_crop.json config]

Tell me when you're on the Custom Fields page and I'll give you each field one at a time.
```

**Continue with the same session for pipelines, circles, FLOW, document templates, email templates, and folder generator. Feed Claude in Chrome one step at a time.**

---

### ALTERNATIVE TASK 7: Use Lovable.dev for a Client-Facing Portal
**Tool:** Lovable.dev
**Time:** 30-60 minutes

If you want a custom client-facing portal INSTEAD of or IN ADDITION TO SuiteDash:

Go to https://lovable.dev and enter this prompt:

```
Build a client portal web app for a Pennsylvania Commercial Registered Office Provider (CROP) business called "PA CROP Services."

The portal needs:

1. LOGIN PAGE
- Email/password authentication
- "Forgot password" flow
- Clean, professional design with brand colors: primary #534AB7, accent #1B4F8A, dark #1E2333

2. CLIENT DASHBOARD (after login)
- Entity information card: Entity Name, Entity Number, Entity Type, Service Tier
- Compliance status: "Good Standing" / "Action Required" badges
- Next deadline countdown: "Annual report due in X days"
- Recent documents list (with download links)
- Quick action buttons: "Contact Support", "View Documents", "Billing"

3. DOCUMENTS PAGE
- List of all documents organized in folders: Legal Documents, Correspondence, Annual Reports, Contracts
- Each document shows: name, date uploaded, type, download button
- Upload indicator when new documents arrive

4. COMPLIANCE PAGE
- Annual report deadline with countdown timer
- Filing status: "Filed" / "Due" / "Overdue"
- Reminder preferences (toggle email, SMS)
- Entity information that can be updated

5. BILLING PAGE
- Current plan display (Starter/Professional/Premium)
- Payment history table
- "Update payment method" button (links to Stripe customer portal)
- "Upgrade plan" option

6. SUPPORT PAGE
- Contact form (name, subject, message)
- FAQ section with expandable items
- Business hours and phone number
- Email: hello@pacropservices.com

Tech stack: React + Tailwind + Supabase for auth and database.
Make it mobile-responsive.
```

**What Lovable gives you:** A fully built React app with all these pages. You can then deploy it to Vercel or Netlify.

**When to use this:** If you want a custom portal that's not dependent on SuiteDash. Good for Phase 11 (scaling) but not required for launch.

---

### TASK 8: Content and SEO
**Tool:** Cursor already handled this in Task 5.1-5.5

If the articles need refinement, open them in Cursor and say:

```
Review each HTML article in public/. For each one:
1. Ensure the <title> tag is under 60 characters and includes the primary keyword
2. Ensure the <meta description> is 150-160 characters with a CTA
3. Add Schema.org Article markup in a <script type="application/ld+json"> block
4. Add internal links to at least 2 other articles and the homepage
5. Add FAQ schema for any Q&A content
6. Ensure all images have alt text (if any)
7. Add a "Last updated: March 2026" date for freshness signals
```

---

# ROUND 3: TESTING AND LAUNCH

### TASK 9.1: Test the Full Flow
**Tool:** You + Claude in Chrome
**Time:** 15 minutes

```
Help me test the full customer journey on pacropservices.com:

1. Navigate to https://pacropservices.com
2. Click the "Professional" plan "Get started" button
3. Complete the Stripe checkout with test card 4242 4242 4242 4242 (exp: any future date, CVC: any 3 digits)
4. After payment, verify we land on the welcome page
5. Check: did the n8n webhook fire? (navigate to n8n.audreysplace.place → Executions)
6. Check: was a SuiteDash contact created? (navigate to SuiteDash → CRM → Contacts)
7. Check: was the welcome email sent? (check hello@pacropservices.com inbox)

Walk me through each check.
```

**IMPORTANT:** Use Stripe test mode first (toggle "Test mode" in Stripe dashboard). Switch to live mode only after everything works.

---

### TASK 9.2: Onboard Founding Clients
**Tool:** ChatGPT (for personalized outreach emails)
**Time:** 30 minutes

```
I'm launching PA CROP Services, a Pennsylvania Commercial Registered Office Provider. I need to onboard 5 founding clients from my personal network.

Write 5 personalized outreach messages (one for each person below) offering them free CROP service for the first year in exchange for testing the flow and writing a Google review:

1. [Name] — owns an LLC in Erie, works from home
2. [Name] — CPA friend who has multiple business entities
3. [Name] — colleague at Gannon who has a side business
4. [Name] — SubTo community member with PA real estate LLCs
5. [Name] — [describe their situation]

Each message should be casual, personal, and explain what a CROP is in one sentence. Include a link to pacropservices.com.
```

---

### TASK 9.3: CPA Partner Outreach
**Tool:** ChatGPT + Claude in Chrome
**Time:** 1 hour

First, use ChatGPT to generate the outreach list:

```
Find 10 CPA firms in Erie, Pittsburgh, and Philadelphia PA that I should contact about a white-label CROP partner program. For each, I need:
- Firm name
- Managing partner name (if findable)
- Email or contact form URL
- Why they're a good fit (size, services, client base)

Focus on mid-size firms (5-20 employees) that serve small business clients.
```

Then use Claude in Chrome to send the emails:

```
Help me send personalized partner outreach emails.

Navigate to my email at hello@pacropservices.com.

For each CPA firm on my list, compose and send an email using this template:

Subject: Add registered office services to your practice — zero overhead

[Personalize opening based on the firm]

I run PA CROP Services, a new Commercial Registered Office Provider in Erie. I built a partner program specifically for CPA firms:

- You refer clients who need a PA registered office
- We handle everything — address, mail, scanning, compliance, annual report reminders
- Your branding on the client portal
- You pay us $99/client/year and charge whatever you want
- Zero operational work on your end

With the new PA annual report requirement (and dissolution penalties starting 2027), your clients are going to need this. I'd love 15 minutes to show you the partner portal.

Available this week? You can also see the service at pacropservices.com.

[Your name]
PA CROP Services
hello@pacropservices.com
[Phone number]

Send to each firm. Wait for my approval before sending each one.
```

---

# ROUND 4: AUTOMATION FOR ONGOING OPERATIONS

### ONGOING: Use Flint for Daily Monitoring
**Tool:** Flint (via Claude bridge or Telegram @pinohu_bot)

Send to Flint:

```
@flint New standing task: 

Daily at 9 AM Eastern:
1. Check n8n workflow executions at n8n.audreysplace.place — report any failures
2. Check Stripe dashboard for new payments and failed payments
3. Report: new client count, total MRR, any issues

Weekly on Monday at 9 AM:
1. Pull weekly metrics: new clients, churned clients, total active, MRR
2. Check Google Search Console for any crawl errors
3. Report summary to me

If any n8n workflow fails, alert me immediately via Telegram.
```

---

### ONGOING: Use OpenClaw for Content Generation
**Tool:** OpenClaw / ClawdBot

```
@clawdbot Weekly content task:

Every Monday, generate:
1. One new SEO blog post (800-1,200 words) targeting a PA compliance keyword
2. Three social media posts (LinkedIn format) about PA business compliance
3. One email newsletter for existing clients with compliance tips

Topics to cycle through:
- PA annual report filing tips
- What happens if your LLC is dissolved
- Why privacy matters for your registered office
- How to prepare for the 2027 deadline
- County venue selection explained
- LLC vs Corporation: which needs what in PA

Save all content to the pa-crop-services repo under /content/[date]/
```

---

# TOOL DECISION MATRIX

For ANY future task related to PA CROP Services, use this decision tree:

```
Is it a LEGAL/FINANCIAL action requiring my signature or money?
  → YES → I do it myself (with Claude in Chrome assisting the browser navigation)
  → NO ↓

Is it CODE that needs to be written, edited, or debugged?
  → YES → Cursor (for existing repo work) or Lovable.dev (for new apps)
  → NO ↓

Is it a DOCUMENT that needs to be generated (DOCX, PPTX, XLSX)?
  → YES → Claude (claude.ai, this conversation)
  → NO ↓

Is it a BROWSER TASK (filling forms, navigating dashboards)?
  → YES → Claude in Chrome
  → NO ↓

Is it a WRITING TASK (emails, social posts, scripts)?
  → YES → ChatGPT (fast, conversational) or Claude (for longer/strategic)
  → NO ↓

Is it a WORKFLOW/AUTOMATION task?
  → YES → n8n (build the workflow) + Claude (generate the JSON)
  → NO ↓

Is it a MONITORING/REPORTING task?
  → YES → Flint (set up standing task via bridge)
  → NO ↓

Is it a DEPLOYMENT/SERVER task?
  → YES → Flint VM (via Claude bridge) or Cursor terminal
  → NO ↓

Is it a FULL APP/PORTAL that needs to be built from scratch?
  → YES → Lovable.dev (generates entire React apps) or Cursor (for more control)
```

---

# THE 3-HOUR SPEED RUN

If you want to get EVERYTHING done as fast as possible today, here's the parallel execution plan:

```
HOUR 1 (You + Claude in Chrome):
├── 0:00-0:10  Get EIN (irs.gov)
├── 0:10-0:25  Form LLC (file.dos.pa.gov)
├── 0:25-0:30  Call Bureau (phone)
├── 0:30-0:45  Create Stripe account + products + payment links
├── 0:45-0:55  Register domain + point DNS
└── 0:55-1:00  Set up Google Voice number

HOUR 2 (Cursor does the coding while you do admin):
├── YOU: Set up Emailit sending domain + Cloudflare forwarding (15 min)
├── YOU: Create Google Business Profile (10 min)
├── YOU: Start E&O insurance application (15 min)
├── CURSOR: Update landing page with Stripe links (auto)
├── CURSOR: Convert 5 articles to HTML (auto)
├── CURSOR: Create vercel.json + deploy structure (auto)
├── CURSOR: Create sitemap.xml, robots.txt (auto)
└── CURSOR: Push to GitHub (auto)

HOUR 3 (Deploy + automate):
├── 2:00-2:10  Deploy to Vercel (Cursor terminal or Claude in Chrome)
├── 2:10-2:15  Connect custom domain
├── 2:15-2:30  Claude generates 3 n8n workflow JSONs
├── 2:30-2:45  Import workflows to n8n (Claude in Chrome)
├── 2:45-2:55  Connect Stripe webhooks to n8n
└── 2:55-3:00  Test the full flow with a test card payment

POST HOUR 3 (SuiteDash — can be done later today or tomorrow):
├── Configure SuiteDash branding (Claude in Chrome, 15 min)
├── Create custom fields (Claude in Chrome, 30 min)
├── Create pipelines and circles (Claude in Chrome, 15 min)
└── Set up email templates (Claude in Chrome, 30 min)
```

---

# WHAT EACH TOOL COSTS YOU

| Tool | Cost | Notes |
|------|------|-------|
| Claude (claude.ai) | $20/month (Pro) | You're already paying this |
| Claude in Chrome | Included with Claude Pro | Browser automation |
| Cursor | $20/month (Pro) | AI code editor |
| Lovable.dev | Free tier or $20/month | Full-stack app builder |
| ChatGPT | $20/month (Plus) | You're likely already paying |
| Flint/OpenClaw | $0 | Self-hosted on your VM |
| n8n | $0 | Self-hosted |
| Vercel | $0 | Free tier for personal projects |
| GitHub | $0 | Free for private repos |
| **Total additional** | **$0-40/month** | You likely already have Claude + ChatGPT |

---

# AFTER LAUNCH: THE AUTONOMOUS OPERATING SYSTEM

Once everything is live, this is how the business runs day-to-day with minimal human input:

```
AUTOMATED (zero human touch):
├── Website live 24/7 → Stripe collects payments
├── n8n onboarding workflow → creates SuiteDash accounts
├── n8n welcome email → sends within 60 seconds of payment
├── n8n annual report reminders → fires at 90/60/30/14/7 days
├── n8n dunning → recovers failed payments automatically
├── n8n renewal → handles subscription renewals
├── n8n engagement scoring → tracks client activity daily
├── n8n QA audit → checks system health daily
├── Flint → monitors everything, alerts on failures
└── SEO articles → drive organic traffic continuously

SEMI-AUTOMATED (human reviews, AI executes):
├── Partner onboarding → Claude in Chrome assists setup
├── Content creation → OpenClaw generates, you approve
├── Email campaigns → ChatGPT drafts, you approve
└── Support tickets → Claude drafts responses, you send

MANUAL (human required):
├── Check physical mailbox (5 min/day)
├── Scan and upload documents (10 min/day)
├── Make partner outreach calls (30 min/week)
└── Strategic decisions (as needed)
```

**Total human time per day at 500 clients: 15-30 minutes.**
**Total human time per week: 2-3 hours.**
**Everything else runs on autopilot.**

---

**END OF AI AGENT ORCHESTRATION GUIDE**

This document is the conductor's score. You point each instrument at its part, give the downbeat, and the orchestra plays itself.

Last updated: March 20, 2026
