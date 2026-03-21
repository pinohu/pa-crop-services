# PA CROP Services — What Everything Means
## A Plain-English Explanation of Every File, Tool, and Concept

---

# PART 1: THE BIG PICTURE

## What is this repo?

This is the entire PA CROP Services business in a single folder. Everything needed to launch, run, and grow a Pennsylvania Commercial Registered Office Provider business — the legal documents, the website, the automation, the marketing, the AI agents that help manage it, and the scripts to install it all on a computer.

Think of it like a franchise kit. Someone could take this folder, follow the instructions, and have a working compliance business accepting payments within a few days.

## What is GitHub?

GitHub is where the folder lives online. It's like Google Drive for code and business files, but with version history — every change ever made is tracked. The address is:

**https://github.com/pinohu/pa-crop-services**

"pinohu" is your GitHub username. "pa-crop-services" is the project name. It's set to "private" so only you can see it.

## What is a "repo"?

Short for "repository." It's just a folder that Git tracks. Git is the tool that records every change — who changed what, when, and why. Each save point is called a "commit." This repo has 15 commits (15 save points).

---

# PART 2: THE FILES (every single one, explained)

## Root Files (top level of the folder)

### `.cursorrules`
**What:** A configuration file for Cursor (the AI code editor).
**Why:** When you open this folder in Cursor and ask its AI to write code, this file tells the AI: "You're working on a PA CROP business. Here's the tech stack, here's the file structure, here are the naming conventions." Without this, Cursor's AI would guess — and guess wrong.
**You touch this:** Never. It's already configured.

### `.gitignore`
**What:** A list of files that Git should NOT track.
**Why:** Some files contain secrets (API keys, passwords) or are temporary. This tells Git to ignore them so they never get uploaded to GitHub accidentally.
**You touch this:** Never.

### `PA-CROP-Execution-Plan.md`
**What:** The master instruction manual. 11 phases, every task numbered (1.1, 1.2, etc.), from forming the LLC to landing your first client.
**Why:** So that you, an AI agent, or a hired developer can follow it step by step without asking questions.
**You touch this:** Read it. Follow it. Check tasks off as you complete them.

### `PA-CROP-AI-Agent-Orchestration-Guide.md`
**What:** Tells you which AI tool to use for each task, with the exact prompt to copy-paste into each tool.
**Why:** You have Claude, ChatGPT, Cursor, OpenClaw, Lovable.dev, and others. This document is the routing table — "for this task, use this tool, say this."
**You touch this:** Reference it whenever you sit down to work on the business.

### `PA-CROP-Agent-Orchestration-Setup.md`
**What:** Instructions for setting up OpenClaw + Mission Control + Cursor as your three-tool command center.
**Why:** Tells you how to wire the tools together so they coordinate, not compete.
**You touch this:** Follow it during initial setup of your dedicated machine.

### `README.md`
**What:** The front page of the repo on GitHub. A summary of what's inside and how to get started.
**Why:** Standard practice. Anyone who opens the repo sees this first.
**You touch this:** Never (I keep it updated).

### `vercel.json`
**What:** Configuration file that tells Vercel (the website hosting service) how to deploy your site.
**Why:** When you connect this GitHub repo to Vercel, it reads this file and knows: "Serve the files from the public/ folder. Add these security headers." Without it, Vercel wouldn't know what to do.
**You touch this:** Never.

---

## `business-plan/` — The Business Plan

### `PA-CROP-360-Business-Plan.docx`
**What:** A complete, formatted Word document with 10 sections: executive summary, market analysis, legal framework, products/pricing, technology, customer acquisition, financial projections, operations, risk analysis, and exit strategy.
**Why:** You need this to show to attorneys, partners, investors, or your own records. It's the "here's the whole business on paper" document.
**You touch this:** Read it. Update it as the business evolves. Show it to potential partners.

### `generate-business-plan.js`
**What:** A Node.js script that creates the business plan .docx file programmatically.
**Why:** If you ever want to regenerate the document (e.g., after changing pricing or projections), you run this script instead of manually editing the Word doc.
**You touch this:** Only if you want to regenerate the document. Run it with: `node generate-business-plan.js`

---

## `financial-model/` — The Financial Model

### `PA-CROP-Financial-Model.xlsx`
**What:** A 4-sheet Excel spreadsheet: Assumptions, 24-Month P&L, Unit Economics, and Scenario Analysis. Has live formulas — change the assumptions and everything recalculates.
**Why:** Tells you exactly how much money you'll make at different client counts. Shows when you break even, what your margins are, and what the business is worth at exit.
**You touch this:** Open in Excel. Play with the assumptions tab. See how changing price or churn rate affects your bottom line.

### `generate-financial-model.py`
**What:** A Python script that creates the Excel file.
**Why:** Same as the business plan generator — if you need to regenerate it with updated numbers.

---

## `legal/` — Legal Documents

### `CROP-01-Cover-Letter.docx`
**What:** A formal letter to the PA Bureau of Corporations requesting to be listed as a CROP. Has blank fields for your name, address, entity number, and signature.
**Why:** This is one of the documents you print, sign, and mail to Harrisburg to become an official CROP.
**You touch this:** Fill in the blanks. Print. Sign. Mail.

### `CROP-02-Statement-of-Address.docx`
**What:** The official document declaring your LLC as a CROP and providing your office address. Has blank fields.
**Why:** Goes in the same envelope as the cover letter. The Bureau needs both.
**You touch this:** Fill in the blanks. Print. Sign. Mail.

### `CROP-03-Filing-Guide.docx`
**What:** Step-by-step instructions for yourself on how to fill out and mail the above two documents.
**Why:** So you don't have to re-read the execution plan — just open this, follow the checklist.
**You touch this:** Read it, follow it, then you're done.

### `PA-CROP-Service-Agreement.docx`
**What:** The contract between you and each client. 9 sections covering what you do, what they pay, liability limits, termination, confidentiality, indemnification.
**Why:** Every CROP needs a service agreement with each client. PA law says listing a CROP without a contract can lead to penalties.
**You touch this:** Send to an attorney for review ($500-750) BEFORE using with real clients. Then use it as-is for every new client.

### `generate-crop-registration.js` / `generate-service-agreement.js`
**What:** Scripts that generate the Word documents above.
**Why:** Regeneration if needed.

---

## `marketing/` — Marketing Materials

### `marketing/seo-articles/PA-CROP-SEO-Articles.md`
**What:** 5 complete articles written for search engine optimization (SEO). Topics: What is a CROP, PA annual report guide, 2027 dissolution deadline, changing your registered office, CROP vs registered agent.
**Why:** When someone Googles "Pennsylvania CROP" or "PA annual report 2025," you want YOUR website to appear. These articles are designed to rank for those searches.
**You touch this:** The content has already been converted to HTML pages in public/. This is the source text.

### `marketing/website/index.html`
**What:** The original landing page source file.
**Why:** This is the design source. The deployed version (with Stripe links and analytics) lives in `public/index.html`.
**You touch this:** Only if you need to see the original before I added Stripe placeholders.

---

## `operations/` — How to Run the Business

### `PA-CROP-Operations-Bible.md`
**What:** The complete operations manual. 12 chapters covering every standard operating procedure (SOP): daily mail handling, client onboarding, annual report filing, payment recovery, partner management, customer support. Includes every email template word-for-word, every sales script, every objection response.
**Why:** If you hire someone to help run this business, you hand them this document. If an AI agent needs to draft an email, it reads the template from here. It's the single source of truth for "how things are done."
**You touch this:** Reference it constantly. Update it as you discover better processes.

### `PA-CROP-Unconsidered-Risks.md`
**What:** 16 blind spots and risks you hadn't accounted for, ranked by severity, each with a specific fix.
**Why:** The honest assessment of what could go wrong — from E&O insurance (existential) to Google Business Profile (quick win).
**You touch this:** Read through it. Address the red items before accepting clients.

---

## `partner-deck/` — Partner Pitch Deck

### `PA-CROP-Partner-Deck.pptx`
**What:** A 9-slide PowerPoint presentation targeting CPA firms and attorneys. Explains the white-label partner program: $99/client/year, zero work on their end, their branding.
**Why:** When you sit down with a CPA and say "I want to offer registered office services through your firm," you open this deck.
**You touch this:** Open in PowerPoint. Customize if needed. Present to potential partners.

### `generate-partner-deck.js`
**What:** Script to regenerate the PowerPoint.

---

## `public/` — THE LIVE WEBSITE

This is the folder that becomes your website. When Vercel deploys, it serves every file in this folder as a web page at pacropservices.com.

### `public/index.html`
**What:** Your main landing page. Has: navigation bar, hero section, trust statistics, urgency section (2027 deadline), 6 feature cards, 3-tier pricing table (Starter/Professional/Premium), partner section, 7-question FAQ, final CTA, footer with real article links.
**Why:** This is the page people see when they visit pacropservices.com. It's designed to explain the service and get them to click a pricing button.
**All placeholders replaced** with live Stripe Payment Links and business phone (814-480-0989). Analytics uses Plausible.

### `public/welcome.html`
**What:** The page a customer sees immediately after paying on Stripe. Shows a green checkmark, "Welcome to PA CROP Services!", and a 4-step onboarding timeline.
**Why:** After someone pays $79-299, they need immediate reassurance that it worked and what happens next. This page provides that.
**Phone number set:** 814-480-0989

### `public/compliance-check.html`
**What:** An interactive quiz — 6 questions about the visitor's PA business compliance status. At the end, it calculates a risk score (Low/Medium/High) and shows specific risks they face, then offers PA CROP Services as the solution.
**Why:** This is a "lead generation magnet." People who take a quiz are far more likely to buy than people who just read a sales page. You can share this link on social media, in emails, and in Google Ads. It's designed to educate and create urgency at the same time.
**Nobody needs to touch this:** It works as-is. The quiz runs entirely in the browser — no server needed.

### `public/what-is-a-pennsylvania-crop.html` (and the other 4 article pages)
**What:** Full-length SEO articles, each as a standalone web page with its own title, meta description, Schema.org markup (structured data that helps Google understand the page), and links to other articles.
**Why:** These are designed to rank in Google search results. When someone Googles "what is a CROP in Pennsylvania," your article should appear. Each article has a CTA at the bottom that links to your pricing page.

### `public/404.html`
**What:** A custom error page that appears when someone visits a URL that doesn't exist on your site (e.g., pacropservices.com/nonexistent).
**Why:** Instead of a generic ugly error page, they see your branding and links to useful pages. Professional touch.

### `public/sitemap.xml`
**What:** A machine-readable list of every page on your website.
**Why:** You submit this to Google Search Console. Google reads it and knows which pages to crawl and index. Without it, Google might miss some of your pages.

### `public/robots.txt`
**What:** Instructions for search engine crawlers. Says "you're allowed to crawl everything" and points to the sitemap.
**Why:** Standard web practice. Every professional website has one.

---

## `openclaw/` — AI Agent System

### What is OpenClaw?
OpenClaw is an open-source AI assistant that runs on your own computer. Unlike ChatGPT or Claude (which run in a browser), OpenClaw runs as a background program on your machine. You can talk to it through Telegram, Discord, WhatsApp, or a web interface. It can use tools — browse the web, read files, run code, manage your calendar.

The key difference: it runs 24/7 on YOUR hardware, under YOUR control, with YOUR API keys.

### `openclaw/openclaw-agents.json`
**What:** Configuration file that defines 4 AI agents for the CROP business:
- **CROP CEO** — the coordinator. Knows the execution plan, assigns tasks, reports status.
- **CROP Developer** — writes code, deploys the website, builds n8n workflows.
- **CROP Marketer** — writes SEO articles, social media posts, email campaigns.
- **CROP Operations** — monitors n8n workflows, tracks Stripe payments, manages SuiteDash.

Each agent has a "system prompt" — a detailed instruction set that tells it who it is, what it knows, and what it's responsible for.
**Why:** Instead of one generic AI that does everything poorly, you have 4 specialists that each excel at their domain.

### `openclaw/openclaw-config.json`
**What:** The main OpenClaw configuration file. Tells OpenClaw which agents exist, which communication channels to use, and how to route messages.
**Why:** When you message your Telegram bot, OpenClaw looks at this file to decide which agent should respond.

### `openclaw/openclaw-install-windows.ps1`
**What:** A PowerShell script with step-by-step commands to install OpenClaw on a Windows machine.
**Why:** Reference guide if you're doing it manually instead of using the one-line installer.

### `openclaw/deploy.sh`
**What:** A one-command script that sets up all 4 agent workspaces and merges the config.
**Why:** Saves you from running 10 separate commands.

### `openclaw/workspaces/crop-*/SOUL.md`
**What:** "SOUL" files are OpenClaw's way of giving an agent its personality and knowledge. Each agent has one. It contains the agent's identity, responsibilities, communication style, and reference to key documents.
**Why:** When the CROP CEO agent wakes up, it reads its SOUL.md to remember who it is and what it should be doing. Think of it as the agent's job description + employee handbook combined.

---

## `setup/` — One-Command Machine Installer

### `setup/install.sh`
**What:** A bash script (for Linux, macOS, or WSL2) that installs everything from scratch on a brand new machine: Node.js, Git, Docker, OpenClaw, Mission Control, Vercel CLI, Claude Code, the repo, and all agent workspaces.
**Why:** You buy a dedicated mini PC for $100, plug it in, run one command, and 5 minutes later it's a fully configured CROP operations command center.
**Run it with:** `curl -fsSL https://raw.githubusercontent.com/pinohu/pa-crop-services/main/setup/install.sh | bash`

### `setup/install.ps1`
**What:** The same thing but for Windows (PowerShell script).
**Run it with:** `Set-ExecutionPolicy Bypass -Scope Process -Force; irm https://raw.githubusercontent.com/pinohu/pa-crop-services/main/setup/install.ps1 | iex`

### `setup/README.md`
**What:** Explains the one-liner commands and hardware requirements.

---

## `suitedash-automation/` — The Automation Engine

### What is SuiteDash?
SuiteDash is an all-in-one business platform you already own (136 licenses). It provides: a client portal (where clients log in to see their documents), a CRM (tracks all client information), billing, e-signatures, email marketing, tickets/support, and file storage. Think of it as Salesforce + DocuSign + Freshdesk combined, but for small businesses.

### What is n8n?
n8n (pronounced "n-eight-n") is a workflow automation tool. It's like Zapier or Make.com, but self-hosted (runs on your Flint VM at n8n.audreysplace.place). It connects different services together: "When X happens in Stripe, do Y in SuiteDash, then send Z email."

Each workflow is a chain of steps (called "nodes") that trigger automatically.

### `suitedash-automation/n8n/01_crop_onboarding.json`
**What:** A workflow that fires when a new customer pays on Stripe. It automatically:
1. Receives the Stripe payment notification
2. Extracts the customer's name, email, and which tier they bought
3. Creates a new contact in SuiteDash
4. Sends them a welcome email
5. Logs the new client to AiTable (a database)
**Why:** Without this, you'd have to manually create each new client's account after every payment. This makes it instant and automatic.
**Status:** Imported to n8n. Needs SMTP email credentials configured before activating.

### `suitedash-automation/n8n/02_crop_annual_report_reminders.json`
**What:** The core value proposition of the business. This workflow runs every day at 9 AM. It:
1. Gets all active clients from the database
2. Looks up each client's entity type (LLC, corporation, etc.)
3. Calculates how many days until their annual report deadline
4. If they're at 90, 60, 30, 14, or 7 days out, sends them a reminder email
5. Each reminder gets progressively more urgent (the 7-day email has red warning language)
**Why:** This is what clients are paying you for. They don't want to miss their annual report and get dissolved. This automation ensures nobody falls through the cracks, even at 1,000+ clients.

### `suitedash-automation/n8n/10_crop_dunning.json`
**What:** "Dunning" means recovering failed payments. When a client's credit card fails (expired, declined, insufficient funds), this workflow:
1. Day 1: Sends a polite "payment issue" email with a button to update their card
2. Day 3: Sends a follow-up reminder
3. Day 7: Sends a warning that service may be interrupted
4. Day 14: Sends a final notice with dissolution consequences
**Why:** Without this, failed payments silently become lost clients. This recovers 30-50% of them automatically.

### `suitedash-automation/n8n/03_renewal.json`
**What:** Handles subscription renewal reminders. Sends clients a notice before their annual subscription renews.
**Why:** Reduces surprise chargebacks (when clients dispute charges they forgot about).

### `suitedash-automation/n8n/04_winback.json`
**What:** A "win-back" campaign for clients who cancel. Sends them a sequence of emails over several weeks trying to bring them back.
**Why:** It's 5x cheaper to retain a client than acquire a new one.

### `suitedash-automation/n8n/05_failure_handler.json`
**What:** A "dead letter queue" — catches any workflow that errors out and logs the failure for investigation.
**Why:** Without this, broken workflows fail silently and you'd never know. This ensures every error is captured and can be fixed.

### `suitedash-automation/n8n/06_data_sync.json`
**What:** Keeps SuiteDash and AiTable in sync. If a client's information changes in one system, this workflow updates the other.
**Why:** You don't want mismatched data between your CRM and your database.

### `suitedash-automation/n8n/08_master_event_router.json`
**What:** A central hub that receives events from all sources (Stripe, SuiteDash, website forms) and routes them to the correct workflow.
**Why:** Instead of every service talking to every other service directly (which gets messy), everything goes through this router. Clean architecture.

### `suitedash-automation/n8n/09_qa_audit.json`
**What:** A daily quality check. Runs every day and verifies: Are all workflows running? Are there any stuck clients in onboarding? Any failed emails? Any data mismatches?
**Why:** Catches problems before they affect clients.

### `suitedash-automation/agents/`
**What:** Node.js modules for AI-powered agent behaviors: orchestrating workflows, detecting failures, analyzing performance, and running quality audits.
**Why:** These extend n8n's capabilities with AI decision-making.

### `suitedash-automation/scripts/emergency-stop.js`
**What:** A panic button. Deactivates all workflows instantly if something goes wrong.
**Why:** If a bug is sending wrong emails to all clients, you hit this to stop everything immediately.

### `suitedash-automation/scripts/verify-connections.js`
**What:** Tests all API connections (Stripe, SuiteDash, AiTable, SMTP) and reports which ones are working.
**Why:** Run this after setting up credentials to make sure everything is connected properly.

### `suitedash-automation/suitedash/niche_configs/pa_crop.json`
**What:** A complete configuration blueprint for SuiteDash specific to the CROP business. Defines:
- 21 custom fields (Entity Name, Entity Number, Entity Type, Annual Report Deadline, etc.)
- 2 pipelines (Client Acquisition with 7 stages, Service Delivery with 6 stages)
- 8 circles (groups) for segmenting clients by tier, status, and risk
- 5-step onboarding FLOW (form → e-sign → file download → checklist → welcome call)
- All annual report deadline dates by entity type
- PA state filing fee reference table
**Why:** Instead of manually setting up SuiteDash by clicking through menus for hours, this file is the blueprint. An AI agent or developer reads this and configures SuiteDash exactly to spec.

### `suitedash-automation/suitedash/onboarding_flow.json`
**What:** The specific SuiteDash FLOW configuration for the 5-step client onboarding process.
**Why:** Defines the exact sequence a new client goes through after signing up.

### `suitedash-automation/env/.env.example`
**What:** A template showing every API key and credential needed to run the automation. Has placeholder values like `YOUR_STRIPE_SECRET_KEY_HERE`.
**Why:** You copy this file, rename it to `.env`, and fill in your real credentials. The workflows read from this file so credentials are never hardcoded in the workflow files themselves.

---

# PART 3: THE TOOLS (what each one does)

## Tools That Run Your Business

### Vercel
**What it is:** A web hosting service that makes your website live on the internet.
**What it does for you:** When you push code to GitHub, Vercel automatically updates your website within 60 seconds. No manual uploading, no FTP, no server management. Free for your usage level.
**Cost:** $0

### Stripe
**What it is:** Online payment processing.
**What it does for you:** Handles credit card payments, subscriptions (annual billing), invoices, and payment recovery. Clients click a button on your website → Stripe collects the money → deposits it in your bank account.
**Cost:** 2.9% + $0.30 per transaction (deducted automatically from each payment)

### SuiteDash
**What it is:** Your back-office platform.
**What it does for you:** Client login portal (clients see their documents), CRM (tracks all client info and history), e-signatures (clients sign the service agreement electronically), email marketing, and support tickets.
**Cost:** $0 (you already own 136 lifetime licenses from AppSumo)

### n8n
**What it is:** Workflow automation (like Zapier but self-hosted).
**What it does for you:** Connects everything together automatically. "When Stripe gets a payment → create the SuiteDash contact → send the welcome email → log to the database." Runs on your Flint VM at n8n.audreysplace.place.
**Cost:** $0 (self-hosted)

### AiTable
**What it is:** An online database/spreadsheet (like Airtable).
**What it does for you:** Stores structured data — client records, engagement scores, event logs, metrics. The n8n workflows read from and write to AiTable.
**Cost:** Free tier or existing license

## Tools That Help You Build and Manage

### OpenClaw
**What it is:** An AI assistant that runs on your own computer (not in a browser).
**What it does for you:** You message it via Telegram and it can read files, write code, search the web, manage tasks, and coordinate other AI agents. It runs 24/7 as a background service. The 4 CROP agents (CEO, Developer, Marketer, Ops) are all OpenClaw agents.
**Cost:** $0 (open source). Uses your Anthropic API key for the AI brain.

### Mission Control
**What it is:** A visual dashboard for OpenClaw.
**What it does for you:** Shows a Kanban board (columns: Backlog → In Progress → Review → Done) where you see all tasks, which agent is working on what, and a live feed of agent activity. It's like a project management tool (Trello/Asana) but connected to your AI agents.
**Cost:** $0 (open source)

### Cursor
**What it is:** A code editor (like VS Code) with AI built in.
**What it does for you:** You open the pa-crop-services folder in Cursor, and its AI can read all your files, understand the project context (via .cursorrules), and write/edit code when you ask it. "Update the pricing on the landing page" → Cursor writes the code.
**Cost:** $0 (free tier) or $20/month (Pro)

### Claude Code
**What it is:** A command-line AI coding tool from Anthropic.
**What it does for you:** You type a request in your terminal ("convert these articles to HTML pages") and it edits files directly. More powerful than Cursor for large multi-file operations.
**Cost:** Uses your Anthropic API credits

### Claude in Chrome
**What it is:** Browser automation built into your Claude Pro subscription.
**What it does for you:** You tell Claude to "fill out the Stripe account form" and it navigates your browser, clicks buttons, and fills in fields. You handle the personal info (SSN, bank account); it handles the navigation.
**Cost:** Included with Claude Pro ($20/month, which you already pay)

---

# PART 4: KEY CONCEPTS

## What is a CROP?
A Commercial Registered Office Provider. Every Pennsylvania business must have a "registered office" — a physical address where the state and courts can deliver official documents. A CROP provides that address professionally. Think of it as a P.O. Box for legal mail, except it must be a real street address with a real person available during business hours.

## What is the 2027 Dissolution Deadline?
Starting in 2027, Pennsylvania will dissolve businesses that fail to file their annual reports. This is new — before 2025, PA only required reports every 10 years. Now it's annual. The 2025 and 2026 reports have a grace period (no penalties). Starting 2027, miss it and your business gets dissolved 6 months later. Foreign entities (businesses formed in other states but registered in PA) cannot reinstate — they lose their name permanently.

This deadline is YOUR primary marketing angle. It creates urgency.

## What is a "webhook"?
A webhook is an automatic notification between two systems. When a customer pays on Stripe, Stripe sends a message (the "webhook") to your n8n workflow saying "hey, someone just paid." The workflow then does its thing. You set up the webhook once and it fires every time the event happens.

## What is a "pipeline" in SuiteDash?
A visual representation of where each client is in a process. Like a conveyor belt with stages. For example, the Client Acquisition pipeline has stages: Website Lead → Contacted → Pricing Reviewed → Agreement Sent → Agreement Signed → Active Client → Lost. You drag clients from stage to stage (or automation does it for you).

## What is a "circle" in SuiteDash?
A group of clients. Like a mailing list. You put all Starter tier clients in the "CROP-Starter" circle, all Professional clients in "CROP-Professional," etc. Then you can send targeted emails to just one group.

## What is "dunning"?
The process of recovering failed payments. When a credit card is declined (expired, maxed out, wrong number), dunning is the automated sequence of emails that asks the customer to update their payment method before their service gets interrupted.

## What does "deploy" mean?
Making something live on the internet. When you "deploy to Vercel," you're taking the files from your computer/GitHub and making them available at pacropservices.com for anyone to visit.

## What is a "placeholder"?
A temporary fake value in the code that you replace with a real value. For example, `STRIPE_STARTER_LINK` is a placeholder. Before the website works, you replace it with your actual Stripe Payment Link URL (something like `https://buy.stripe.com/abc123`).

---

# PART 5: HOW IT ALL CONNECTS

```
A customer Googles "Pennsylvania registered agent"
         ↓
Your SEO article ranks and they click
         ↓
They read the article → click "View plans" at the bottom
         ↓
They land on pacropservices.com → see pricing
         ↓
They click "Get started" on the Professional plan ($179/yr)
         ↓
Stripe Payment Link opens → they enter credit card → pay
         ↓
Stripe fires a webhook to n8n (01_crop_onboarding workflow)
         ↓
n8n automatically:
  1. Creates their account in SuiteDash
  2. Sends them a welcome email
  3. Logs them in AiTable
         ↓
They get an email with portal login → sign the service agreement
         ↓
You list them in the PA CROP list → forward their mail
         ↓
Every day, n8n checks if their annual report deadline is approaching
  → sends reminders at 90, 60, 30, 14, 7 days
         ↓
If their card fails at renewal, n8n runs the dunning sequence
  → 4 emails over 14 days to recover the payment
         ↓
You collect $179/year with ~15 minutes/year of manual work per client
```

That's the entire business in one flow.

---

**This document lives in the repo. If any concept is still unclear, ask.**
