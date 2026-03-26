---
name: audit-compliance
description: Audit all HTML and JS files for compliance accuracy — entity-type deadline differentiation, dissolution mechanics, fee amounts
---

# Compliance Content Audit

Run the compliance content validator and fix any violations:

1. Run `node api/validate-content.js` to check for compliance violations
2. Grep all public HTML files for "September 30" without entity-type qualification
3. Grep for "December 31, 2027" as a universal enforcement date (this is wrong — each entity type has its own date)
4. Grep for hardcoded fee amounts that don't match current PA DOS fees
5. Verify all registered-office city pages use the three-group deadline structure
6. Fix any violations found
7. Report results
