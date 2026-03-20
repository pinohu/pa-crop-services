# PA CROP Services — Agent Orchestration Setup
## Turn Your Computer Into a Self-Running Business Factory

---

# THE RECOMMENDED STACK

You don't need 10 orchestration frameworks. You need 3 tools that actually talk to each other.

```
┌─────────────────────────────────────────────────────────────────┐
│                    YOUR COMPUTER (Windows)                       │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ OpenClaw        │  │ Cursor IDE      │  │ Claude in      │  │
│  │ + Mission       │  │ + Copilot       │  │ Chrome         │  │
│  │   Control       │  │                 │  │                │  │
│  │                 │  │ Writes code     │  │ Drives your    │  │
│  │ Orchestrates    │  │ in your repos   │  │ browser for    │  │
│  │ ALL agents,     │  │ on command      │  │ form-filling   │  │
│  │ tracks tasks,   │  │                 │  │ and admin      │  │
│  │ routes work     │  │                 │  │ tasks          │  │
│  └────────┬────────┘  └────────┬────────┘  └───────┬────────┘  │
│           │                    │                    │            │
│           └────────────────────┼────────────────────┘            │
│                                │                                │
│                    ┌───────────▼──────────┐                     │
│                    │   n8n (on Flint VM)  │                     │
│                    │   Automation engine  │                     │
│                    │   Webhooks, crons,   │                     │
│                    │   API calls          │                     │
│                    └──────────────────────┘                     │
│                                                                 │
│  Also available:                                                │
│  • Lovable.dev (browser) — builds full React apps from prompts │
│  • ChatGPT (browser/app) — quick writing and email drafting    │
│  • Claude Code (terminal) — CLI-based code agent               │
└─────────────────────────────────────────────────────────────────┘
```

---

# TOOL 1: OPENCLAW + MISSION CONTROL (The Brain)

## Why This Is the Centerpiece

You already have OpenClaw/ClawdBot on your Flint VM. Mission Control adds:
- **Visual task board** (Kanban) — see all PA CROP tasks, assign them to agents
- **Agent management** — create, configure, and monitor multiple AI agents from one dashboard
- **Approval flows** — agents request your approval before taking sensitive actions
- **Live feed** — real-time stream of everything every agent is doing
- **API access** — automation can create tasks and trigger agents programmatically

## Installation (on your local machine)

### Step 1: Install OpenClaw locally (if not already)
```bash
# Open PowerShell or Terminal
npm install -g openclaw@latest

# Run the onboarding
openclaw onboard --install-daemon

# Verify
openclaw --version
openclaw gateway status
```

### Step 2: Install Mission Control
```bash
# Clone the repo
git clone https://github.com/abhi1693/openclaw-mission-control.git
cd openclaw-mission-control

# Option A: Docker (recommended — one command)
docker compose up -d

# Option B: Local install
npm install
cp .env.example .env.local
# Edit .env.local — set your OpenClaw gateway URL and auth token
npm run dev
```

### Step 3: Open Mission Control
- Go to: http://localhost:4000
- Connect to your OpenClaw Gateway (default: ws://localhost:18789)
- You should see your existing ClawdBot agent

### Step 4: Create PA CROP Agents in OpenClaw
Add these to your `~/.openclaw/openclaw.json`:

```json
{
  "agents": {
    "list": [
      {
        "id": "crop-ceo",
        "name": "CROP CEO",
        "model": "anthropic/claude-sonnet-4-6",
        "workspace": "~/.openclaw/workspaces/crop-ceo",
        "systemPrompt": "You are the CEO agent for PA CROP Services. You coordinate all other agents, track progress against the execution plan, and make decisions. You have access to the full PA CROP business plan, operations bible, and execution plan. Your job is to ensure every task gets done in the right order by the right agent."
      },
      {
        "id": "crop-developer",
        "name": "CROP Developer",
        "model": "anthropic/claude-sonnet-4-6",
        "workspace": "~/.openclaw/workspaces/crop-developer",
        "systemPrompt": "You are the developer agent for PA CROP Services. You write code, configure systems, deploy websites, build n8n workflows, and handle all technical tasks. You work in the pinohu/pa-crop-services GitHub repo. You use Cursor for code editing and the terminal for git/deployment operations."
      },
      {
        "id": "crop-marketer",
        "name": "CROP Marketer",
        "model": "anthropic/claude-sonnet-4-6",
        "workspace": "~/.openclaw/workspaces/crop-marketer",
        "systemPrompt": "You are the marketing agent for PA CROP Services. You write SEO articles, social media posts, email campaigns, partner outreach emails, and ad copy. You follow the content calendar and marketing playbook in the Operations Bible."
      },
      {
        "id": "crop-ops",
        "name": "CROP Operations",
        "model": "anthropic/claude-sonnet-4-6",
        "workspace": "~/.openclaw/workspaces/crop-ops",
        "systemPrompt": "You are the operations agent for PA CROP Services. You monitor n8n workflows, check for errors, track client metrics, generate reports, and manage the SuiteDash configuration. You follow the SOPs in the Operations Bible."
      }
    ]
  },
  "bindings": [
    {"agentId": "crop-ceo", "match": {"channel": "telegram"}},
    {"agentId": "crop-developer", "match": {"channel": "cli"}}
  ]
}
```

### Step 5: Set Up Agent Workspaces
```bash
# Create workspace directories
mkdir -p ~/.openclaw/workspaces/crop-ceo
mkdir -p ~/.openclaw/workspaces/crop-developer
mkdir -p ~/.openclaw/workspaces/crop-marketer
mkdir -p ~/.openclaw/workspaces/crop-ops

# Clone the repo into the developer workspace
cd ~/.openclaw/workspaces/crop-developer
git clone https://github.com/pinohu/pa-crop-services.git

# Copy the execution plan and orchestration guide into the CEO workspace
cp pa-crop-services/PA-CROP-Execution-Plan.md ~/.openclaw/workspaces/crop-ceo/
cp pa-crop-services/PA-CROP-AI-Agent-Orchestration-Guide.md ~/.openclaw/workspaces/crop-ceo/
cp pa-crop-services/operations/PA-CROP-Operations-Bible.md ~/.openclaw/workspaces/crop-ops/

# Restart OpenClaw to load new agents
openclaw gateway restart
```

### Step 6: Load Tasks into Mission Control
Open Mission Control at http://localhost:4000 and create a board called "PA CROP Launch". Add these task columns:
- **Backlog** — all tasks from the Execution Plan
- **Assigned** — tasks assigned to an agent
- **In Progress** — agents actively working
- **Review** — needs your approval
- **Done** — completed

Create tasks for every numbered item in the Execution Plan (1.1, 1.2, 1.3, etc.) and tag each with the responsible agent.

---

# TOOL 2: CURSOR (The Developer's Hands)

## Why Cursor
Cursor is an AI-native code editor (VS Code fork) that writes, edits, and debugs code using Claude or GPT-4. It works directly in your repos. When the CROP Developer agent needs code written, Cursor is the tool that executes it.

## Installation
```
# Download from https://cursor.sh
# Install like any app
# Open Cursor
# Sign in (free tier works, Pro $20/month for more completions)
```

## Configuration for PA CROP
1. Open Cursor
2. File → Open Folder → select your `pa-crop-services` repo clone
3. Add a `.cursorrules` file to the repo root:

```
# .cursorrules — PA CROP Services

You are working on PA CROP Services, a Pennsylvania Commercial Registered Office Provider business.

Key context:
- Entity name: PA Registered Office Services, LLC
- Domain: pacropservices.com
- Brand: PA CROP Services
- Technology: Vercel (hosting), Stripe (payments), SuiteDash (CRM/portal), n8n (automation), AiTable (data)

Repository structure:
- /public — deployed website (HTML, Vercel)
- /business-plan — business plan and generator
- /financial-model — Excel model and generator
- /legal — service agreement, CROP registration docs
- /marketing — website and SEO articles
- /operations — operations bible, risk analysis
- /partner-deck — partner pitch deck
- /suitedash-automation — n8n workflows, AI agents, niche config

When writing code:
- Use vanilla HTML/CSS/JS for the marketing site (no frameworks — it's a static site on Vercel)
- Use Node.js for n8n workflow JSON generation
- Follow the SuiteDash API conventions: X-Public-ID + X-Secret-Key headers
- Stripe integration uses Payment Links (not custom checkout sessions) for simplicity
- All email templates use the copy from operations/PA-CROP-Operations-Bible.md

When asked to "deploy", commit to git and push to the main branch — Vercel auto-deploys from GitHub.
```

4. Open the Cursor AI panel (Cmd+L) and it now has full context of the project

## How to Use Cursor for PA CROP Tasks
Any time you need code written, open Cursor and paste the task prompt from the Orchestration Guide. Cursor reads the `.cursorrules`, understands the project structure, and writes code that fits.

---

# TOOL 3: CLAUDE IN CHROME (The Browser Hands)

## Why Claude in Chrome
This is the tool that fills out forms, navigates government websites, configures SuiteDash, and handles every browser-based task that normally requires you clicking through UIs.

## Installation
- Claude in Chrome is built into your Claude Pro subscription
- Open Chrome → go to claude.ai → the extension activates automatically
- When you ask Claude to interact with your browser, it uses the computer_use tools

## How to Use for PA CROP
Every task tagged [HUMAN REQUIRED] in the Execution Plan can be ASSISTED by Claude in Chrome. You still need to provide personal info and approve actions, but Claude navigates for you.

---

# THE DAILY WORKFLOW

## Morning (5 minutes)
1. Open Mission Control (http://localhost:4000)
2. Check the Live Feed — see what agents did overnight (if any cron tasks ran)
3. Review any tasks in the "Review" column — approve or reject
4. Move approved tasks to "Done"
5. Assign next tasks from Backlog to agents

## When You Have 30 Minutes to Work
1. Open the Execution Plan — find the next incomplete phase
2. Check if the task is [HUMAN REQUIRED] or [AI CAN DO]
3. If [HUMAN REQUIRED]: Open Claude in Chrome, paste the prompt from the Orchestration Guide
4. If [AI CAN DO]: Open Cursor (for code) or Mission Control (to assign to an agent)
5. Review output, approve, move to next task

## When You're Away
- n8n workflows run on schedule (annual report reminders, engagement scoring, etc.)
- Flint monitors for errors and alerts you via Telegram
- OpenClaw agents can run background tasks in their workspaces
- Nothing critical requires your presence except physical mail handling

---

# ALTERNATIVE / ADDITIONAL TOOLS

## If You Want More Coding Power: Claude Code (CLI)
```bash
# Install
npm install -g @anthropic-ai/claude-code

# Use in the repo directory
cd pa-crop-services
claude-code "Convert all 5 SEO articles from markdown to HTML pages with proper meta tags and Schema.org markup"
```
Claude Code runs in your terminal and edits files directly. More powerful than Cursor for large multi-file operations.

## If You Want a Full App Built Fast: Lovable.dev
Go to https://lovable.dev and paste a prompt. It builds entire React apps with auth, database, and deployment in minutes. Use this for:
- Client portal (if you want one beyond SuiteDash)
- Partner dashboard
- Internal metrics dashboard
- Compliance assessment quiz page

## If You Want Multi-Agent Coding: CrewAI
```bash
pip install crewai

# Define agents in Python
from crewai import Agent, Task, Crew

developer = Agent(
    role="PA CROP Developer",
    goal="Build and deploy the PA CROP Services website and automation",
    backstory="Senior full-stack developer working on a PA compliance business"
)

marketer = Agent(
    role="PA CROP Content Writer",
    goal="Write SEO-optimized content about PA business compliance",
    backstory="Expert content marketer specializing in B2B compliance services"
)

# Define tasks
build_website = Task(
    description="Update the landing page with Stripe payment links and deploy to Vercel",
    agent=developer
)

write_articles = Task(
    description="Convert 5 SEO article outlines into full HTML pages with meta tags",
    agent=marketer
)

# Run the crew
crew = Crew(agents=[developer, marketer], tasks=[build_website, write_articles])
result = crew.kickoff()
```

CrewAI is best for orchestrating multi-step AI workflows where agents build on each other's work. Use it for complex content production pipelines or multi-file code generation.

## If You Want to Coordinate Cursor + Claude Code + Codex: Composio Agent Orchestrator
```bash
git clone https://github.com/ComposioHQ/agent-orchestrator.git
cd agent-orchestrator
pnpm install && pnpm build
pnpm dev  # Opens web dashboard
```
This is specifically built for coordinating parallel coding agents across different branches and PRs. Best for when you have multiple features being built simultaneously.

---

# MY RECOMMENDATION: START SIMPLE, ADD COMPLEXITY ONLY WHEN NEEDED

## Day 1 Setup (30 minutes):
1. Install OpenClaw locally (if not already) + Mission Control via Docker
2. Install Cursor + configure with .cursorrules
3. You already have Claude in Chrome

## Day 1 Workflow:
- Mission Control = your task board (what needs to be done)
- Claude in Chrome = your browser automation (government forms, Stripe, SuiteDash)
- Cursor = your code editor (website updates, n8n workflows, deployment)

## Week 2 (only if needed):
- Add Claude Code for heavier terminal-based coding
- Add CrewAI if you want automated content production pipelines

## Month 2 (only if needed):
- Add Composio Agent Orchestrator for parallel development work
- Add more OpenClaw agents for monitoring, reporting, and client communications

The mistake most people make: installing 10 tools on day one and spending all their time configuring orchestration instead of doing the work. Start with 3 tools. Add more only when you hit a wall that the existing tools can't handle.

---

# WIRING IT ALL TOGETHER

Here's how information flows between the tools for a typical PA CROP task:

```
Example: "Deploy the landing page with Stripe checkout"

1. YOU open Mission Control → see the task in Backlog
2. YOU assign it to "CROP Developer" agent
3. YOU open Cursor with the pa-crop-services repo
4. YOU paste the task prompt from the Orchestration Guide into Cursor's AI panel
5. CURSOR writes the code changes (updates HTML, adds Stripe links)
6. CURSOR shows you the diff — you click "Accept"
7. YOU (or Cursor) runs: git add -A && git commit -m "Add Stripe checkout" && git push
8. VERCEL auto-deploys from GitHub (webhook fires automatically)
9. YOU go back to Mission Control → move task to "Done"
10. MISSION CONTROL shows the task complete in the Live Feed

Total human effort: 5 minutes of copy-pasting and clicking "Accept"
Total AI effort: Cursor wrote all the code
Total automation: Vercel deployed without any action
```

```
Example: "Fill out the Stripe account application"

1. YOU open Mission Control → see the task in Backlog
2. This is [HUMAN REQUIRED] — can't be fully automated
3. YOU open Claude in Chrome
4. YOU paste: "Navigate to stripe.com/register. Help me create an account for PA Registered Office Services, LLC..."
5. CLAUDE IN CHROME navigates to Stripe, clicks through the form
6. YOU enter your personal info (SSN, bank account) when prompted
7. CLAUDE IN CHROME fills in business details (name, EIN, address)
8. YOU click "Submit"
9. YOU go back to Mission Control → move task to "Done"

Total human effort: 10 minutes (mostly entering personal info)
Total AI effort: Claude navigated the entire form
```

---

# COST SUMMARY

| Tool | Monthly Cost | Notes |
|------|-------------|-------|
| OpenClaw | $0 | Open source, self-hosted |
| Mission Control | $0 | Open source, self-hosted |
| Cursor | $0-20 | Free tier works; Pro for more completions |
| Claude Pro | $20 | You already have this |
| Claude in Chrome | $0 | Included with Claude Pro |
| ChatGPT Plus | $20 | You already have this |
| n8n | $0 | Self-hosted on Flint VM |
| Lovable.dev | $0-20 | Free tier for basic apps |
| Claude Code | $0 | Included with Claude subscription + API usage |
| CrewAI | $0 | Open source (uses your API keys for LLM calls) |
| **Total new cost** | **$0-20/month** | Cursor Pro is the only potential new expense |

---

**END OF AGENT ORCHESTRATION SETUP GUIDE**
