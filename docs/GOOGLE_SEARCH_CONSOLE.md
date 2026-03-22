# Google Search Console — Setup Guide
## PA CROP Services

### Step 1: Add Property
1. Go to: https://search.google.com/search-console/welcome
2. Click "Add property"
3. Choose "Domain" (covers all subdomains and www)
4. Enter: pacropservices.com

### Step 2: Verify via DNS (Recommended)
1. GSC will show you a TXT record like:
   `google-site-verification=abc123xyz`
2. Go to Cloudflare DNS for pacropservices.com
3. Add a TXT record:
   - Name: @
   - Content: google-site-verification=abc123xyz
   - TTL: Auto
4. Click "Verify" in GSC

### Alternative: HTML Meta Tag Verification
1. GSC gives you: `<meta name="google-site-verification" content="TOKEN">`
2. In the GitHub repo, edit `public/index.html`
3. Find the comment: `<!-- Google Search Console verification -->`
4. Uncomment and replace GSC_VERIFICATION_TOKEN with your actual token
5. Commit and push — Vercel auto-deploys
6. Click "Verify" in GSC

### Step 3: Submit Sitemap
After verification:
1. In GSC left menu → Sitemaps
2. Enter: `sitemap.xml`
3. Click Submit

### Step 4: Request Indexing (Priority Pages)
After verification, request indexing for these URLs:
- https://pacropservices.com/
- https://pacropservices.com/what-is-a-pennsylvania-crop
- https://pacropservices.com/pa-annual-report-requirement-guide
- https://pacropservices.com/pa-2027-dissolution-deadline
- https://pacropservices.com/compliance-check

To request indexing:
1. GSC → URL Inspection (top search bar)
2. Enter the URL
3. Click "Request Indexing"

### Step 5: Monitor Weekly
Check these reports each week:
- Performance → Queries (what searches you appear for)
- Coverage → Errors (any crawl problems)
- Core Web Vitals (page speed scores)
- Enhancements → Breadcrumbs, FAQs (confirm schema is detected)

---

## Expected Timeline

- Day 1: Property verified, sitemap submitted
- Week 1-2: Google crawls and indexes all 19 pages
- Week 2-4: Pages start appearing in search results
- Month 2-3: Rankings stabilize and improve
- Month 3+: FAQPage schema triggers expandable FAQ snippets in SERP

## What to Watch For

In the Enhancements section, you should see:
- "FAQ" enhancement detected (from FAQPage schema on homepage + articles)
- "Breadcrumbs" detected (from BreadcrumbList schema on all articles)
- "HowTo" detected (from how-to-change article)

These rich results increase click-through rate significantly.
