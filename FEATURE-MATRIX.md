# PA CROP Services — Master Feature Matrix

> **Canonical product roadmap for portal + admin value stacking.**
> Every feature ties to: what the user sees, what value it delivers,
> what backend must exist, and how it drives upgrades/retention.
>
> Last updated: 2026-03-24

---

## Architecture Principles

**Portal must feel like:**
- a compliance safety net
- a business command center
- a document intelligence system
- a decision assistant
- a bundle of services worth more than the price

**Admin must feel like:**
- a control tower
- a risk management system
- a revenue optimization engine
- a trust and quality assurance layer

**Every screen should either:** reduce risk, save time, create clarity, increase revenue, or increase stickiness.

**Value layers per feature:**
- compliance value (stay compliant)
- operational value (save time, avoid mistakes)
- decision-support value (know what to do next)
- convenience value (centralize everything)
- defensibility/stickiness value (make switching away inconvenient)

---

## Implementation Status

| Symbol | Meaning |
|--------|---------|
| ✅ | API + HTML built and deployed |
| 🔧 | API built, HTML needs wiring |
| 📐 | Designed, not yet built |
| 🔲 | Future — build when demanded |

---

## 🟦 PORTAL FEATURE MATRIX (Client-Facing)

### 1.1 Compliance Command Center

| Feature | Value | Plan | Status | Backend | Upgrade Leverage |
|---------|-------|------|--------|---------|-----------------|
| Obligation timeline | Deadline visibility | All | ✅ | obligations + rules + scheduler | baseline retention |
| Entity-type deadlines | Accuracy + trust | All | ✅ | rules-service (12 types) | prevents churn |
| "Why this is due" explanation | Education | All | 🔧 | rules + KB articles | trust builder |
| Risk/penalty preview | Urgency + action | All | ✅ | compliance-check API | conversion driver |
| Readiness score per obligation | Next step clarity | Starter+ | ✅ | /portal/value?action=filing-readiness | upsell trigger |
| One-click "take action" | Reduced friction | All | ✅ | timeline API actions | engagement |
| Filing status tracking | Transparency | Starter+ | ✅ | 9-step progress tracker | retention |
| Compliance calendar | Planning | Pro+ | ✅ | /compliance-calendar iCal | upsell |

### 1.2 Document Intelligence Center

| Feature | Value | Plan | Status | Backend | Upgrade Leverage |
|---------|-------|------|--------|---------|-----------------|
| Document inbox | Centralization | All | ✅ | document-service + portal | baseline |
| AI summary per document | Time savings | Starter+ | 📐 | Needs OCR/Documentero | strong upsell |
| Urgency classification | Risk awareness | All | ✅ | document classifier | trust |
| Extracted deadlines/entities | Action clarity | Pro+ | 📐 | Needs extraction engine | premium value |
| Link doc → obligation | Context | Pro+ | ✅ | DB schema supports it | retention |
| "What should I do?" button | Guidance | All | 📐 | assistant pipeline | engagement |
| Timeline of all docs | Audit/history | Starter+ | ✅ | documents API | retention |
| Search across docs | Efficiency | Pro+ | 📐 | Needs full-text search | upsell |
| Human escalation request | Safety net | Pro+ | ✅ | /documents/:id/escalate | high-value |
| **Service of process fast-lane** | **Critical protection** | **All** | **📐** | **Needs priority alert chain** | **justifies subscription** |

### 1.3 Entity Health + Risk Layer

| Feature | Value | Plan | Status | Backend | Upgrade Leverage |
|---------|-------|------|--------|---------|-----------------|
| Overall health score | Quick insight | All | ✅ | /portal/value?action=health | baseline |
| 7-component breakdown | Transparency | Starter+ | ✅ | health API (weighted) | upsell |
| Trend over time | Awareness | Pro+ | 📐 | Needs daily snapshot cron | retention |
| Risk drivers | Actionability | Pro+ | ✅ | drivers array | upgrade |
| Benchmark vs peers | Context | Empire | 🔲 | Needs 50+ clients | premium |
| "Fix this first" suggestions | Guidance | Starter+ | ✅ | recommended_fixes | engagement |

### 1.4 Guided Action Center

| Feature | Value | Plan | Status | Backend | Upgrade Leverage |
|---------|-------|------|--------|---------|-----------------|
| Top 3 priorities | Focus | All | ✅ | timeline API actions | retention |
| Tasks waiting on user | Accountability | All | ✅ | 'provide_info' actions | engagement |
| Tasks we handle for you | Confidence | Starter+ | ✅ | 'no_action' managed | upsell |
| "What we handled" counter | Perceived value | All | 📐 | audit event counts | **strongest retention** |
| "Remind me later" | Flexibility | All | 📐 | Needs snooze mechanism | usability |
| Estimated completion time | Planning | Pro+ | 🔲 | workflow metrics | premium |
| Action completion tracking | Progress | Starter+ | ✅ | audit events | retention |

### 1.5 Filing Readiness Workspace

| Feature | Value | Plan | Status | Backend | Upgrade Leverage |
|---------|-------|------|--------|---------|-----------------|
| Filing checklist | Clarity | Starter+ | ✅ | /portal/value?action=filing-readiness | upsell |
| Missing info detection | Efficiency | Pro+ | ✅ | missing array | premium |
| Upload required docs | Convenience | All | ✅ | /documents/upload | baseline |
| Filing fee display | Transparency | All | ✅ | fee_usd | trust |
| Readiness score | Confidence | Pro+ | ✅ | confidence % | upsell |
| "We file for you" option | Time savings | Pro+ | ✅ | entitlements check | **strong upsell** |
| Filing confirmation archive | Recordkeeping | Starter+ | ✅ | filed_confirmed state | retention |

### 1.6 Communication Center

| Feature | Value | Plan | Status | Backend | Upgrade Leverage |
|---------|-------|------|--------|---------|-----------------|
| Message center | Central comms | All | 📐 | SuiteDash messaging | baseline |
| Reminder history | Transparency | All | ✅ | notification history | trust |
| Delivery status | Confidence | Starter+ | ✅ | sent/scheduled/failed | retention |
| Multi-channel prefs | Control | Starter+ | ✅ | email/SMS toggles | upsell |
| Add team contacts | Collaboration | Pro+ | 📐 | client-service | upgrade |
| CPA/attorney routing | Professional | Pro+ | 📐 | partner-service | premium |

### 1.7 Business Stack (Value Visibility)

| Feature | Value | Plan | Status | Backend | Upgrade Leverage |
|---------|-------|------|--------|---------|-----------------|
| Services in plan | Awareness | All | ✅ | /portal/value?action=business-stack | retention |
| Value received this year | Perceived ROI | Starter+ | 📐 | audit event counts | **retention** |
| Savings vs alternatives | Price anchoring | Starter+ | ✅ | savings calculator | conversion |
| Activate additional | Expansion | All | ✅ | available-to-activate | upsell |
| Hosting/domain/email status | Centralization | Starter+ | ✅ | 20i hosting panel | bundle value |

### 1.8 Multi-Entity Portfolio

| Feature | Value | Plan | Status | Backend | Upgrade Leverage |
|---------|-------|------|--------|---------|-----------------|
| Portfolio dashboard | Scale visibility | Pro+ | ✅ | entity switcher | strong upsell |
| Cross-entity deadlines | Efficiency | Pro+ | 📐 | aggregated view | retention |
| Risk heatmap | Risk awareness | Empire | 🔲 | risk engine | premium |
| Bulk actions | Time savings | Empire | 🔲 | workflow-service | high-tier |
| Portfolio doc inbox | Centralization | Pro+ | 🔲 | document-service | retention |

### 1.9 Knowledge + Certification

| Feature | Value | Plan | Status | Backend | Upgrade Leverage |
|---------|-------|------|--------|---------|-----------------|
| 25 compliance articles | Education | All | ✅ | /portal/knowledge-base | trust |
| Search + categories | Efficiency | All | ✅ | KB search API | usability |
| Guided onboarding | Activation | Starter+ | ✅ | onboarding checklist | retention |
| 5-lesson academy | Engagement | All | 🔧 | portal HTML built | retention |
| Certification badges | Credibility | Pro+ | 🔧 | completion tracking | premium |
| Progress tracking | Engagement | Starter+ | 🔧 | progress bar + checks | retention |

### 1.10 AI Copilot

| Feature | Value | Plan | Status | Backend | Upgrade Leverage |
|---------|-------|------|--------|---------|-----------------|
| Ask about obligation | Clarity | All | ✅ | /assistant/explain-obligation | baseline |
| Ask about document | Understanding | Starter+ | ✅ | /assistant/summarize-document | upsell |
| Source-backed answers | Trust | All | ✅ | sources array | retention |
| Confidence indicator | Transparency | Pro+ | ✅ | confidence score | premium |
| Draft messages/emails | Productivity | Pro+ | 📐 | AI generation | upsell |
| Escalate to human | Safety | Pro+ | ✅ | /assistant/escalate | high value |

---

## 🟥 ADMIN FEATURE MATRIX (Operations)

### 2.1 Ops Command Center

| Feature | Value | Status | Backend | Business Impact |
|---------|-------|--------|---------|----------------|
| Clients at risk | Prioritization | ✅ | command-center API | reduces churn |
| Overdue obligations | Compliance control | ✅ | obligation grid | core ops |
| Failed notifications | Reliability | ✅ | notification failures | prevents misses |
| New documents queue | Awareness | ✅ | document-review API | responsiveness |
| AI escalations | Oversight | ✅ | ai-review API | trust |
| New signups | Growth | ✅ | SuiteDash clients | awareness |
| Churn-risk accounts | Retention | ✅ | billing-retention API | revenue |

### 2.2 Client 360

| Feature | Value | Status | Backend | Business Impact |
|---------|-------|--------|---------|----------------|
| Full client profile | Context | ✅ | /admin/client-360 | efficiency |
| Entity + obligations | Visibility | ✅ | joined queries | core ops |
| Document history | Traceability | ✅ | documents for org | compliance |
| Billing status | Revenue view | ✅ | billing account | retention |
| AI conversation log | Transparency | ✅ | ai_conversations | QA |
| Risk score | Prioritization | ✅ | health computation | ops efficiency |
| Churn + upsell signals | Revenue | ✅ | signal detection | growth |
| Internal notes | Collaboration | 📐 | client metadata | productivity |

### 2.3 Obligation Management Console

| Feature | Value | Status | Backend | Business Impact |
|---------|-------|--------|---------|----------------|
| Obligation queue | Control | ✅ | obligation explorer | core ops |
| Overdue queue | Urgency | ✅ | status filter | compliance |
| Bulk recompute | Accuracy | ✅ | /recompute endpoint | scale |
| Manual override | Flexibility | ✅ | state transition API | safety |
| Filing confirmation | Tracking | ✅ | mark-filed endpoint | compliance |
| **Filing ops queue** | **Managed plan ops** | **✅** | **/admin/filing-queue** | **revenue delivery** |

### 2.4 Rules Management

| Feature | Value | Status | Backend | Business Impact |
|---------|-------|--------|---------|----------------|
| Rule viewer | Visibility | ✅ | /admin/rules GET | awareness |
| Create new rule | Expansion | ✅ | /admin/rules POST | growth |
| Publish rule | Activation | ✅ | /admin/rules/publish | compliance |
| Version history | Auditability | ✅ | version field + audit | compliance |
| Preview impact | Safety | 📐 | obligation recompute | risk control |
| Rollback | Recovery | 📐 | supersede mechanism | reliability |

### 2.5 Document Review Queue

| Feature | Value | Status | Backend | Business Impact |
|---------|-------|--------|---------|----------------|
| Critical doc queue | Risk handling | ✅ | /admin/document-review | protection |
| Urgency override | Accuracy | ✅ | /documents/:id/classify | QA |
| Escalation workflow | Response speed | ✅ | /documents/:id/escalate | SLA |
| Reviewer assignment | Accountability | 📐 | metadata field | operations |
| SLA tracking | Performance | 📐 | timestamp diff | reliability |

### 2.6 Notification Operations Console

| Feature | Value | Status | Backend | Business Impact |
|---------|-------|--------|---------|----------------|
| Delivery tracking | Reliability | ✅ | /admin/notification-ops | core promise |
| Failed delivery alerts | Visibility | ✅ | failures list | prevents misses |
| Template performance | Optimization | ✅ | per-template stats | growth |
| Scheduled queue | Planning | ✅ | scheduled list | awareness |
| Resend action | Recovery | 📐 | retry mechanism | reliability |

### 2.7 AI Quality Console

| Feature | Value | Status | Backend | Business Impact |
|---------|-------|--------|---------|----------------|
| Conversation review | Oversight | ✅ | /admin/ai-review | trust |
| Confidence tracking | QA | ✅ | score filter | accuracy |
| Flagged responses | Safety | ✅ | escalation filter | compliance |
| Disputed answers | Feedback | 📐 | review status field | improvement |
| No-answer patterns | Gap finding | 📐 | analytics | coverage |

### 2.8 Billing + Retention Console

| Feature | Value | Status | Backend | Business Impact |
|---------|-------|--------|---------|----------------|
| MRR/ARR dashboard | Revenue clarity | ✅ | /admin/billing-retention | growth |
| Plan distribution | Segmentation | ✅ | plan breakdown | strategy |
| Churn risk detection | Retention | ✅ | churn signals | revenue |
| Upgrade candidates | Expansion | ✅ | upsell detection | upsell |
| Renewal forecast | Planning | ✅ | 90-day lookahead | cash flow |
| Save offers | Recovery | 📐 | offer engine | retention |
| LTV by plan | Strategy | 📐 | cohort analysis | pricing |

### 2.9 Partner Management

| Feature | Value | Status | Backend | Business Impact |
|---------|-------|--------|---------|----------------|
| Partner tracking | Distribution | ✅ | /partners/me/portfolio | growth |
| Referral performance | Optimization | ✅ | referral stats | revenue |
| Commission tracking | Accountability | 📐 | commission fields | operations |
| White-label config | Expansion | 🔲 | SuiteDash branding | scale |
| Partner portal | Self-service | 🔲 | role-based portal | efficiency |

### 2.10 Workflow + Failure Console

| Feature | Value | Status | Backend | Business Impact |
|---------|-------|--------|---------|----------------|
| Job queue visibility | Reliability | ✅ | /admin/workflow-failures | uptime |
| Failed job details | Debugging | ✅ | error + attempt info | stability |
| Retry action | Recovery | 📐 | retry mechanism | resilience |
| Dead letter queue | Alerting | 📐 | status field | awareness |
| Impacted clients | Context | 📐 | correlation join | ops |

### 2.11 Audit Viewer

| Feature | Value | Status | Backend | Business Impact |
|---------|-------|--------|---------|----------------|
| Full event history | Traceability | ✅ | /admin/audit | compliance |
| Change diffs (before/after) | Transparency | ✅ | before_json/after_json | trust |
| Actor tracking | Accountability | ✅ | actor_type + actor_id | governance |
| Event type filter | Efficiency | ✅ | query params | usability |
| Correlation chain | Context | 📐 | correlation_id | debugging |

---

## Execution Priority

### Ship Now (v5.0 — current sprint)

Portal:
1. Wire JS for all rebuilt tabs (KB, entity health, business stack, referrals, certification)
2. Dashboard savings calculator widget
3. Real activity feed from audit events
4. Service of process fast-lane alert

Admin:
5. Client 360 HTML page
6. Filing queue HTML page
7. Revenue dashboard rendering
8. Notification ops rendering

### Ship Next (v5.1 — after first paying client)

9. "What we handled for you" counter
10. AI copilot contextual buttons
11. Communication center (secondary contacts, CPA routing)
12. Document "What should I do?" button
13. Action snooze ("remind me later")

### Ship When Demanded (v6.0+)

14. Document AI summarization (needs OCR)
15. Health score trend over time (needs daily cron)
16. Multi-entity portfolio heatmap
17. Benchmark comparisons (needs 50+ clients)
18. Draft CPA messages via AI
19. Partner management console (white-label)
20. Full-text document search

---

## Psychological Framework

Both portal and admin should repeatedly show:
- **What we're watching for you** → obligation timeline, monitoring badge
- **What we already handled** → activity feed, "handled for you" counter
- **What risk we reduced** → risk preview, penalty warnings, health score
- **What value you received** → savings calculator, services list, filing confirmations
- **What you would have paid elsewhere** → market price comparison
- **What is included in your plan today** → business stack, entitlements

This turns the system from a utility into a no-brainer subscription.

---

*This file is the canonical product roadmap. Implementation status tracked here.*
*Last updated: 2026-03-24*
