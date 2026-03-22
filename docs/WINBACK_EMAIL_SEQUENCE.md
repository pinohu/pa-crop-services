# CROP Win-Back Email Sequence
## n8n Workflow: UGGH8LOU4AR3eXk (Dynasty Pack 4: Win-Back)

Trigger: Client cancels or payment fails after dunning exhausted
Variables available: {{client_name}}, {{entity_name}}, {{plan_name}}, {{cancel_date}}, {{portal_url}}

---

### Email 1 — Day 3 After Cancellation
**Subject:** Your PA registered office for {{entity_name}} is no longer active
**From:** PA CROP Services <hello@pacropservices.com>

Hi {{client_name}},

We wanted to let you know that your PA CROP Services plan ({{plan_name}}) for {{entity_name}} is no longer active as of {{cancel_date}}.

This means:
- Your registered office address (924 W 23rd St, Erie, PA 16502) is no longer listed as your PA DOS registered office
- Documents and legal notices sent to this address will not be forwarded to you
- Your annual report reminders have been paused

If this was unintentional or you would like to reactivate, you can do so here:
https://pacropservices.com/#pricing

If you have switched to another provider, we understand. We just want to make sure your PA compliance is covered.

Reply to this email if you have any questions.

Best,
PA CROP Services

---

### Email 2 — Day 10 After Cancellation
**Subject:** Is {{entity_name}} still compliant with PA DOS?
**From:** PA CROP Services <hello@pacropservices.com>

Hi {{client_name}},

It has been about 10 days since your PA CROP Services plan ended. We wanted to check in.

If you have set up a new registered office with another provider, you are all set. But if you have not yet filed DSCB:15-108 to update your registered office address with the PA Department of State, your entity record may show a non-compliant address.

You can check your entity status at: https://www.dos.pa.gov/BusinessCharities/Business/Resources/Pages/BusinessSearch.aspx

If you would like to reactivate with PA CROP Services, we will handle the address update for you:
https://pacropservices.com/#pricing

No pressure — just making sure you are covered.

Best,
PA CROP Services

---

### Email 3 — Day 21 After Cancellation
**Subject:** The 2027 deadline is getting closer — is {{entity_name}} covered?
**From:** PA CROP Services <hello@pacropservices.com>

Hi {{client_name}},

Pennsylvania's 2027 dissolution enforcement deadline is approaching. Every PA entity that has not filed annual reports will face administrative dissolution — and foreign entities that get dissolved cannot reinstate.

We noticed your PA CROP Services plan ended on {{cancel_date}}. If you have not yet arranged a replacement registered office and annual report filing service, now is a good time to get that squared away.

We are offering a simple reactivation — same plan, same price, no setup fees:
https://pacropservices.com/#pricing

If you are already covered elsewhere, no worries at all. We just want to make sure no PA business falls through the cracks before 2027.

Best,
PA CROP Services

---

### Email 4 — Day 45 After Cancellation (Final)
**Subject:** Last check-in — PA compliance for {{entity_name}}
**From:** PA CROP Services <hello@pacropservices.com>

Hi {{client_name}},

This is our last check-in about your PA registered office for {{entity_name}}.

If you have everything handled with another provider, we wish you the best. If you ever need PA CROP services again, we are here:
https://pacropservices.com/#pricing

A few resources you might find useful regardless of your provider:
- PA Annual Report Guide: https://pacropservices.com/pa-annual-report-requirement-guide
- 2027 Dissolution Deadline: https://pacropservices.com/pa-2027-dissolution-deadline
- Free Compliance Check: https://pacropservices.com/compliance-check

Take care,
PA CROP Services
924 W 23rd St, Erie, PA 16502
814-480-0989
