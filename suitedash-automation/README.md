# PA CROP Services — SuiteDash Automation Layer

Adapted from [pinohu/SuiteDash](https://github.com/pinohu/SuiteDash) dynasty-suitedash-deployment system.

## Architecture

```
Client Signup (Stripe / Website / Partner)
        ↓
   n8n Webhook → Master Event Router
        ↓
   ┌─────────────────────────────────────┐
   │       Specialized Agents            │
   │  Lead Qualification → Service Match │
   │  Workflow Orchestrator              │
   │  Client Communication              │
   │  Performance Analytics              │
   │  Failure Detection → QA/Audit       │
   └─────────────────────────────────────┘
        ↓
   SuiteDash API + AiTable + Stripe
        ↓
   Client Portal (branded per tier/partner)
```

## What's Here

| Directory | Contents | Source |
|-----------|----------|--------|
| `n8n/` | 6 importable workflow JSONs | Adapted from SuiteDash repo |
| `agents/` | 5 AI agent modules (Node.js) | Adapted from SuiteDash repo |
| `scripts/` | Emergency stop + connection verification | Direct from SuiteDash repo |
| `suitedash/` | Onboarding flow + CROP niche config | New for PA CROP |
| `suitedash/niche_configs/` | `pa_crop.json` — complete configuration | New for PA CROP |

## n8n Workflows

| # | Workflow | Status | Notes |
|---|----------|--------|-------|
| 03 | Renewal Sequence | Direct reuse | 90-day renewal drip, change email content |
| 04 | Win-Back (Churned) | Direct reuse | Weekly churn recovery, add 2027 urgency |
| 05 | Failure Handler (DLQ) | Direct reuse | Error catching with exponential backoff |
| 06 | Data Sync | Direct reuse | SuiteDash ↔ AiTable bidirectional sync |
| 08 | Master Event Router | Direct reuse | Central event orchestration backbone |
| 09 | QA Audit | Direct reuse | Daily system integrity checks |

### Workflows to Build (not yet in this repo)

| # | Workflow | Priority | Notes |
|---|----------|----------|-------|
| 01 | CROP Onboarding | Critical | Adapt from SuiteDash 01_onboarding.json with CROP fields |
| 02 | Engagement Scoring | High | Adapt scoring formula for CROP portal metrics |
| 07 | Lead Qualification | High | Adapt scoring for entity type, multi-entity, AR risk |
| 10 | Annual Report Reminder | Critical | NEW — daily cron checking 90/60/30/14/7-day windows |
| 11 | Stripe Dunning | High | NEW — payment failure → 5-step recovery sequence |
| 12 | Partner Bulk Import | Medium | NEW — CSV upload → batch SuiteDash account creation |

## CROP Niche Config

`suitedash/niche_configs/pa_crop.json` contains the complete configuration:

- 21 custom fields (Entity Name, Entity Number, Entity Type, Annual Report Deadline, etc.)
- Sales pipeline: 7 stages (Website Lead → Active Client)
- Service pipeline: 6 stages (Onboarding → Renewal Approaching)
- 8 circles for client segmentation
- Kickoff form with 10 fields + 6 automations
- 5-step onboarding FLOW
- Project template with 5 tasks
- 6-folder document structure
- 8 email angles for onboarding sequence
- Annual report deadline lookup by entity type
- PA state filing fee reference table

## Setup

1. Copy `env/.env.example` to `.env` and fill in credentials
2. Import n8n workflows: `n8n/*.json`
3. Deploy niche config: review `suitedash/niche_configs/pa_crop.json`
4. Configure SuiteDash per the Operations Bible in `/operations/`
5. Run connection verification: `node scripts/verify-connections.js`

## Dependencies from SuiteDash Repo

This automation layer depends on the architecture documented in:
- `SuiteDash_Complete_Architecture_Map.md` (53KB — every SuiteDash page/API mapped)
- `SuiteDash_Full_Deployment_System.md` (37KB — step-by-step configuration)
- `SuiteDash_AI_Agent_Layer.md` (37KB — agent architecture and prompts)
- `SuiteDash_Strategic_Guardrails.md` (22KB — production reality checks)

These files live in the parent [SuiteDash repo](https://github.com/pinohu/SuiteDash).
