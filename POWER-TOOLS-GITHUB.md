# PA CROP Services — Power Tools from GitHub
## What to Add, What to Skip, and Why

---

# TIER 1: ADD IMMEDIATELY (High impact, directly solves a real problem)

## 1. Paperless-ngx — Document Management System
**Repo:** https://github.com/paperless-ngx/paperless-ngx (18K+ stars)
**What it is:** Self-hosted document management system with OCR, tagging, full-text search, and automated classification.
**Why it's a game-changer for CROP:**

Your single biggest operational task is handling physical mail — scanning documents, classifying them (service of process vs. annual report notice vs. junk), forwarding them to the right client, and keeping an audit trail. Paperless-ngx was built for exactly this.

Here's how it fits:
- You scan a document → Paperless OCRs it automatically → extracts text → classifies it (lawsuit? DOS notice? correspondence?)
- AI (via n8n + OpenAI integration) reads the OCR text and determines which client it belongs to based on entity name/number
- n8n workflow automatically uploads the PDF to the client's SuiteDash folder and sends them a notification
- Full-text search across all documents — "find every document mentioning entity number 1234567"
- Complete audit trail with timestamps — critical for E&O defense ("we received and forwarded this document at 2:14 PM on March 15")

**n8n integration exists:** There are multiple n8n community nodes for Paperless-ngx, plus it has a REST API and webhook support.

**Install:** Docker one-liner on the Flint VM or your dedicated CROP machine:
```bash
docker compose up -d  # using their docker-compose.yml
```

**Cost:** $0 (open source, self-hosted)
**Impact:** Transforms your biggest manual bottleneck (mail processing) into a semi-automated pipeline. At 500+ clients, this is the difference between 2 hours/day and 15 minutes/day of mail handling.

---

## 2. OpenCorporates API — Entity Verification
**Repo:** https://github.com/pjryan126/opyncorporates (Python client)
**Also:** https://github.com/mikemaccana/opencorporates (Node.js client)
**API docs:** https://api.opencorporates.com/documentation/API-Reference
**What it is:** The world's largest open database of company information — 200M+ entities across 170+ jurisdictions, including Pennsylvania.
**Why it matters for CROP:**

When a new client signs up and gives you their entity name and number, you currently have no automated way to verify that information against the PA DOS. OpenCorporates has PA DOS data and a free API (for public benefit projects).

Use it to:
- Auto-verify entity name, entity number, status, and entity type at onboarding
- Detect if an entity has been dissolved (don't accept dissolved clients — they can't list a CROP)
- Cross-reference the entity type to set the correct annual report deadline automatically
- Periodic bulk verification — check all clients' statuses monthly and flag any that have changed

**n8n integration:** Use the HTTP Request node to call the API. Add to the onboarding workflow right after extracting customer data.

**Cost:** Free for public benefit use. Paid plans start at ~$2,250/year for commercial use. Apply for free access first — a compliance service arguably qualifies.
**Impact:** Eliminates manual entity verification. Prevents accepting invalid or dissolved entities. Automatically sets correct deadlines.

---

## 3. n8n Self-Hosted AI Starter Kit
**Repo:** https://github.com/n8n-io/self-hosted-ai-starter-kit
**What it is:** A pre-configured Docker stack that adds AI capabilities to your n8n: Ollama (local LLM), Qdrant (vector database), and n8n with LangChain integration.
**Why it matters for CROP:**

This lets your n8n workflows use AI locally — no API costs. Practical uses:
- Classify incoming scanned documents (service of process vs. annual report notice vs. marketing junk) using a local LLM reading the OCR text from Paperless-ngx
- AI-powered email drafting for client communications using templates from the Operations Bible as context
- Smart routing — "this document mentions entity number 4357259, route it to the matching client"
- Answer common client questions via a chatbot trained on your FAQ and article content (RAG)

**Install:** Docker Compose on the Flint VM alongside n8n:
```bash
git clone https://github.com/n8n-io/self-hosted-ai-starter-kit.git
cd self-hosted-ai-starter-kit
docker compose up -d
```

**Cost:** $0 (runs locally, no API fees)
**Impact:** Adds intelligence to your automation without per-call costs. The document classification alone saves significant time.

---

## 4. awesome-n8n-templates — 8,600+ Workflow Templates
**Repo:** https://github.com/zengfr/n8n-workflow-all-templates (8,615 templates)
**Also:** https://github.com/enescingoz/awesome-n8n-templates (280+ curated)
**What it is:** Massive collections of pre-built n8n workflows you can import and adapt.
**Why it matters:**

Instead of building every workflow from scratch, search these collections for:
- Stripe subscription management workflows (already built and tested)
- Email automation patterns (welcome sequences, drip campaigns)
- Google Sheets / AiTable sync workflows
- AI-powered document processing chains
- CRM integration patterns

**Cost:** $0
**Impact:** Saves hours of workflow development. Many patterns are battle-tested.

---

# TIER 2: ADD WHEN YOU HAVE 50+ CLIENTS (Good tools, but premature now)

## 5. RAGFlow — Enterprise Knowledge Base
**Repo:** https://github.com/infiniflow/ragflow (70K+ stars)
**What it is:** Open-source RAG (Retrieval-Augmented Generation) engine that lets AI answer questions using your own documents as context.
**Why it matters later:**

Once you have 100+ clients generating documents, support tickets, and compliance questions, you can feed everything into RAGFlow and build:
- A client-facing AI chatbot that answers "when is my annual report due?" by looking up their actual entity data
- An internal knowledge base that answers "what's the SOP for handling a service of process for a foreign LLC?" by reading the Operations Bible
- Smart search across all client documents

**Not needed now** because you don't have enough data or clients to justify the complexity.
**Cost:** $0 (self-hosted)

---

## 6. n8n CRM Dashboard
**Repo:** https://github.com/n8n-community/crm-n8n-dashboard
**What it is:** A pre-built CRM dashboard that integrates with n8n workflows — real-time updates, campaign management, customer analytics.
**Why it matters later:**

When SuiteDash's built-in reporting isn't enough (or if you want a standalone metrics view), this gives you a visual dashboard showing: new clients this month, MRR trend, churn rate, workflow execution stats, and campaign performance.

**Not needed now** because you don't have clients generating data yet.
**Cost:** $0

---

## 7. Docspell — Document Processing Pipeline
**Repo:** https://github.com/eikek/docspell
**What it is:** Personal document organizer that auto-tags and categorizes incoming documents using AI.
**Why it's an alternative to Paperless-ngx:**

Docspell is more focused on automated classification — it learns from your corrections over time. Good if you want the AI to get smarter at routing client documents without manual tagging.

**Consider if** Paperless-ngx doesn't meet your classification needs.
**Cost:** $0

---

# TIER 3: SKIP (Interesting but not relevant to CROP)

| Tool | Why Skip |
|------|----------|
| ComplianceAsCode | IT/security compliance (SOC2, HIPAA), not business entity compliance |
| strongdm/comply | Same — SOC2 compliance framework, not PA CROP relevant |
| compliance-framework | Cloud infrastructure compliance, not business compliance |
| OpenRFPs scrapers | Government procurement RFP scraping — not CROP related |
| Open States scrapers | Legislative bill tracking — not CROP related |
| Ansible/Rudder/ArgoCD | Server configuration management — overkill for your stack |
| GitHub Agentic Workflows | Still in technical preview, cool but premature for business automation |

---

# THE RECOMMENDED UPGRADE PATH

## Today (add to the dedicated machine install):
1. **Paperless-ngx** — Docker container alongside your other services. Connect to n8n via the community node or REST API. This handles your #1 operational bottleneck.

2. **OpenCorporates Python/Node client** — Add entity verification to your onboarding n8n workflow. One HTTP Request node addition.

3. **awesome-n8n-templates repo** — Clone it locally. Search for Stripe, email, and CRM patterns before building custom workflows.

## Month 2 (when you have paying clients):
4. **n8n AI Starter Kit** — Add local AI to your n8n for document classification and smart routing.

## Month 3+ (when you have 50+ clients):
5. **RAGFlow** — Client-facing AI chatbot + internal knowledge base.
6. **n8n CRM Dashboard** — Visual metrics beyond SuiteDash reporting.

---

# HOW PAPERLESS-NGX + N8N + SUITEDASH WORK TOGETHER

```
Physical mail arrives at Erie office
         ↓
You scan it (ScanSnap or phone app)
         ↓
Scan goes to Paperless-ngx consume folder (auto-upload)
         ↓
Paperless-ngx OCRs the document
         ↓
n8n workflow triggers (Paperless webhook or polling)
         ↓
n8n Code node extracts entity name/number from OCR text
         ↓
n8n looks up the client in SuiteDash by entity number
         ↓
n8n uploads the PDF to the client's SuiteDash folder
         ↓
n8n sends the client an email: "New document received"
         ↓
Paperless-ngx archives the original with full audit trail
         ↓
Total human time: ~30 seconds per document (scan and drop)
Everything else is automatic.
```

This pipeline is the single biggest operational upgrade you can make. It turns the "15 minutes per client per year of manual mail handling" into "30 seconds per document regardless of client count."
