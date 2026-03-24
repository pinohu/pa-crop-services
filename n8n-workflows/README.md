# n8n Workflow Import Guide — Compliance Engine Scheduler

## Files

| File | Purpose | Schedule |
|------|---------|----------|
| `corp-reminder-cycle.json` | Process June 30 deadline reminders (corps) | Daily 8am ET |
| `llc-reminder-cycle.json` | Process Sept 30 deadline reminders (LLCs) | Daily 8am ET |
| `other-reminder-cycle.json` | Process Dec 31 deadline reminders (LPs/LLPs/trusts) | Daily 8am ET |
| `overdue-escalation.json` | Auto-escalate overdue entities, alert Ike | Daily 8am ET |
| `weekly-compliance-digest.json` | Portfolio summary email to Ike | Monday 9am ET |

## Prerequisites

1. **Upstash Redis provisioned** and env vars set in Vercel (MANUAL-ACTIONS.md #1)
2. **At least one entity registered** in the compliance engine (MANUAL-ACTIONS.md #7)
3. **SuiteDash API credential** configured in n8n (see below)
4. **EMAILIT_API_KEY** set in n8n environment variables

## Import Steps

### 1. Create SuiteDash credential in n8n

1. Go to n8n → Settings → Credentials → Add Credential
2. Type: **Header Auth**
3. Name: `SuiteDash API`
4. Add two header parameters:
   - `X-Public-ID` = your SuiteDash Public ID
   - `X-Secret-Key` = your SuiteDash Secret Key
5. Save — note the credential ID

### 2. Set n8n environment variable

In n8n Settings → Variables, add:
- `EMAILIT_API_KEY` = your Emailit API key

### 3. Import each workflow

For each JSON file:

1. Go to n8n → Workflows → Import from File
2. Select the JSON file
3. In the "Get All Clients" node, update the credential reference:
   - Click the node → Credential → select your "SuiteDash API" credential
4. **Test the workflow manually** (click Execute Workflow) to verify:
   - SuiteDash returns contacts
   - Scheduler API responds
   - No errors in any node
5. **Activate** the workflow (toggle in top right)

### 4. Verify

After activating all 5 workflows:
- Check n8n Executions page the next day
- The compliance dashboard (`/api/compliance-dashboard?adminKey=CROP-ADMIN-2026-IKE`) should show recent events
- Ike should receive the weekly digest email on Monday

## How It Works

```
n8n Cron (daily 8am)
    ↓
SuiteDash API → get all client contacts
    ↓
Code node → filter by entity type, extract IDs
    ↓
POST /api/scheduler → compliance engine evaluates each entity
    ↓
Returns: which entities need reminders (with days, priority, plan info)
    ↓
For each reminder:
    ├── Emailit → send personalized reminder email
    └── POST /api/entity-status → log the reminder delivery
```

The compliance engine handles all the deadline math, state transitions, and risk scoring.
n8n is just the scheduler and email transport layer.

## Customizing Email Templates

The reminder email HTML is inline in each workflow's "Send Reminder Email" node.
Edit the `jsonBody` parameter to customize:
- Subject line format
- Email body layout
- Managed vs self-file messaging
- CTA links

The overdue email is in the "Send Urgent Overdue Email" node and includes
special handling for foreign entities (cannot reinstate warning).
