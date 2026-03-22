# CROP Renewal Email Sequence
## n8n Workflow: wRLXTGXW60MDLUnI (Dynasty Pack 3: Renewal Sequence)

Trigger: Annual renewal date approaching
Variables available: {{client_name}}, {{entity_name}}, {{plan_name}}, {{renewal_date}}, {{annual_fee}}, {{portal_url}}

---

### Email 1 — 60 Days Before Renewal
**Subject:** Your PA CROP renewal is coming up on {{renewal_date}}
**From:** PA CROP Services <hello@pacropservices.com>

Hi {{client_name}},

Quick heads-up: your PA CROP Services plan ({{plan_name}}) for {{entity_name}} renews on {{renewal_date}}.

No action needed right now — your card on file will be charged {{annual_fee}} automatically. If you need to update your payment method or make any changes, you can do that in your portal:

{{portal_url}}

If you have questions about your plan or want to upgrade, just reply to this email.

Best,
PA CROP Services
924 W 23rd St, Erie, PA 16502
814-480-0989

---

### Email 2 — 30 Days Before Renewal
**Subject:** 30 days until your {{plan_name}} renewal
**From:** PA CROP Services <hello@pacropservices.com>

Hi {{client_name}},

Your {{plan_name}} plan for {{entity_name}} renews in 30 days ({{renewal_date}}).

Here is what we have handled for you this year:
- Maintained your licensed PA registered office address on file with the PA Department of State
- Scanned and uploaded all documents received at your registered office
- Sent annual report deadline reminders ahead of the September 30 deadline

Your {{annual_fee}} renewal will process automatically. If you need to update your payment details or have questions, log in here: {{portal_url}}

Thank you for trusting PA CROP Services with your Pennsylvania compliance.

Best,
PA CROP Services

---

### Email 3 — 14 Days Before Renewal
**Subject:** {{entity_name}} — renewal in 2 weeks
**From:** PA CROP Services <hello@pacropservices.com>

Hi {{client_name}},

Your {{plan_name}} plan renews on {{renewal_date}} (14 days from now). Your card on file will be charged {{annual_fee}}.

Need to make changes? Log in at {{portal_url}} or reply to this email.

A quick reminder: if your registered office service lapses, your PA DOS record will show a non-compliant registered office. This can affect your ability to receive service of process and government correspondence — and could put your entity at risk during the 2027 enforcement period.

We are here to keep you compliant. Reply anytime.

Best,
PA CROP Services

---

### Email 4 — 3 Days Before Renewal
**Subject:** Renewing in 3 days — {{entity_name}}
**From:** PA CROP Services <hello@pacropservices.com>

Hi {{client_name}},

Final reminder: your {{plan_name}} plan ({{annual_fee}}) renews on {{renewal_date}}.

If everything looks good, no action needed. If you need to update your payment method, please log in now: {{portal_url}}

Thank you for another year with PA CROP Services.

Best,
PA CROP Services
924 W 23rd St, Erie, PA 16502
