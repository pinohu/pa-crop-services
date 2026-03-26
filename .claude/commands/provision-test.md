---
name: provision-test
description: Dry-run the provisioning pipeline to verify all 15 steps are wired correctly
---

# Provisioning Pipeline Test

Verify the provisioning pipeline is complete:

1. Read `api/provision.js` and count all steps
2. Verify each step has: try/catch, results.steps.push, guard condition
3. Verify tier configuration matches what's advertised on the homepage pricing cards
4. Cross-reference features promised on `public/index.html` pricing section against what `api/provision.js` actually provisions
5. Check that `api/website-builder.js` generates correct page counts per tier
6. Verify `api/generate-compliance-package.js` generates all 5 pages
7. Report any gaps between promised and provisioned features
