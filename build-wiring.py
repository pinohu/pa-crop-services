#!/usr/bin/env python3
"""
PA CROP Services — Full API Wiring Build Script
Maps all 111 unused endpoints → admin.html and portal.html
Generates nav items, page containers, and JS loader functions.
"""

import json, re, os

# ═══════════════════════════════════════════════════════════════════
# ENDPOINT → UI MAPPING
# target: "admin" | "portal" | "both"
# section: nav group in the UI
# page: page slug for showPage() / setTab()
# label: display name in nav
# ═══════════════════════════════════════════════════════════════════

ADMIN_SECTIONS = {
    "compliance_intel": {
        "label": "Compliance Intelligence",
        "icon": "🔍",
        "endpoints": [
            {"route": "/api/compliance-score", "fn": "loadComplianceScores", "desc": "Entity compliance scores"},
            {"route": "/api/compliance-dashboard", "fn": "loadComplianceDashboard", "desc": "Compliance overview"},
            {"route": "/api/dissolution-predictor", "fn": "loadDissolutionPredictor", "desc": "Dissolution risk AI"},
            {"route": "/api/entity-monitor", "fn": "loadEntityMonitor", "desc": "Entity status changes"},
            {"route": "/api/court-monitor", "fn": "loadCourtMonitor", "desc": "Court filing alerts"},
            {"route": "/api/ucc-monitor", "fn": "loadUCCMonitor", "desc": "UCC lien tracking"},
            {"route": "/api/legislative-monitor", "fn": "loadLegislativeMonitor", "desc": "Legislation tracker"},
            {"route": "/api/risk-model", "fn": "loadRiskModel", "desc": "Risk scoring"},
            {"route": "/api/benchmark-data", "fn": "loadBenchmarks", "desc": "Industry benchmarks"},
            {"route": "/api/admin/rules/impact-preview", "fn": "loadRuleImpact", "desc": "Rule change impact"},
        ]
    },
    "entity_ops": {
        "label": "Entity Operations",
        "icon": "🏢",
        "endpoints": [
            {"route": "/api/entity-intake", "fn": "loadEntityIntake", "desc": "Entity intake form"},
            {"route": "/api/entity-database", "fn": "loadEntityDatabase", "desc": "Entity registry DB"},
            {"route": "/api/pa-dos-search", "fn": "loadDOSSearch", "desc": "PA DOS search"},
            {"route": "/api/address-verify", "fn": "loadAddressVerify", "desc": "Address verification"},
            {"route": "/api/license-verify", "fn": "loadLicenseVerify", "desc": "License verification"},
            {"route": "/api/organizations/[id]/verify", "fn": "loadOrgVerify", "desc": "Entity verification"},
            {"route": "/api/organizations/[id]/obligations/recompute", "fn": "loadRecompute", "desc": "Recompute obligations"},
            {"route": "/api/state-config", "fn": "loadStateConfig", "desc": "State rules config"},
        ]
    },
    "obligation_mgmt": {
        "label": "Obligation Manager",
        "icon": "📋",
        "endpoints": [
            {"route": "/api/obligations/[id]/acknowledge", "fn": "loadOblAcknowledge", "desc": "Acknowledgment queue"},
            {"route": "/api/obligations/[id]/mark-filed", "fn": "loadOblMarkFiled", "desc": "Filing confirmations"},
            {"route": "/api/obligations/[id]/submit-review", "fn": "loadOblSubmitReview", "desc": "Review submissions"},
            {"route": "/api/annual-report-prefill", "fn": "loadAnnualPrefill", "desc": "Annual report pre-fill"},
        ]
    },
    "revenue_intel": {
        "label": "Revenue Intelligence",
        "icon": "💰",
        "endpoints": [
            {"route": "/api/mrr-dashboard", "fn": "loadMRRDashboard", "desc": "MRR analytics"},
            {"route": "/api/invoice-generate", "fn": "loadInvoiceGen", "desc": "Invoice generator"},
            {"route": "/api/tax-export", "fn": "loadTaxExport", "desc": "Tax document export"},
            {"route": "/api/churn-check", "fn": "loadChurnCheck", "desc": "Churn predictor"},
            {"route": "/api/retarget", "fn": "loadRetarget", "desc": "Retargeting events"},
            {"route": "/api/qualify-lead", "fn": "loadQualifyLead", "desc": "Lead scorer"},
            {"route": "/api/market-calculator", "fn": "loadMarketCalc", "desc": "Market size calculator"},
        ]
    },
    "partner_channel": {
        "label": "Partner Channel",
        "icon": "🤝",
        "endpoints": [
            {"route": "/api/partner-intake", "fn": "loadPartnerIntake", "desc": "Partner applications"},
            {"route": "/api/partner-dashboard", "fn": "loadPartnerDash", "desc": "Partner analytics"},
            {"route": "/api/partner-commission", "fn": "loadPartnerComm", "desc": "Commission tracking"},
            {"route": "/api/partner-report", "fn": "loadPartnerReport", "desc": "Performance reports"},
            {"route": "/api/partner-landing", "fn": "loadPartnerLanding", "desc": "Landing page gen"},
            {"route": "/api/partners/me/portfolio", "fn": "loadPartnerPortfolio", "desc": "Partner portfolio"},
            {"route": "/api/referral-track", "fn": "loadReferralTrack", "desc": "Referral tracking"},
            {"route": "/api/referrals/share", "fn": "loadReferralShare", "desc": "Share link gen"},
            {"route": "/api/franchise-setup", "fn": "loadFranchiseSetup", "desc": "Franchise/white-label"},
        ]
    },
    "content_engine": {
        "label": "Content Engine",
        "icon": "✏️",
        "endpoints": [
            {"route": "/api/auto-article", "fn": "loadAutoArticle", "desc": "Auto-generate articles"},
            {"route": "/api/newsletter-generate", "fn": "loadNewsletterGen", "desc": "Newsletter builder"},
            {"route": "/api/podcast-generate", "fn": "loadPodcastGen", "desc": "Podcast generator"},
            {"route": "/api/video-generate", "fn": "loadVideoGen", "desc": "Video script gen"},
            {"route": "/api/youtube-planner", "fn": "loadYoutubePlanner", "desc": "YouTube planner"},
            {"route": "/api/faq-expand", "fn": "loadFAQExpand", "desc": "FAQ expander"},
            {"route": "/api/county-pages", "fn": "loadCountyPages", "desc": "County SEO pages"},
            {"route": "/api/seo-pages", "fn": "loadSEOPages", "desc": "Programmatic SEO"},
            {"route": "/api/directory-generator", "fn": "loadDirectoryGen", "desc": "Directory listings"},
        ]
    },
    "comms_center": {
        "label": "Communications",
        "icon": "📞",
        "endpoints": [
            {"route": "/api/voice-recording", "fn": "loadVoiceRecording", "desc": "Voice recordings"},
            {"route": "/api/whatsapp", "fn": "loadWhatsApp", "desc": "WhatsApp messaging"},
            {"route": "/api/review-request", "fn": "loadReviewRequest", "desc": "Review requests"},
            {"route": "/api/notifications/test", "fn": "loadNotifTest", "desc": "Test notifications"},
            {"route": "/api/mail-process", "fn": "loadMailProcess", "desc": "Mail processing"},
            {"route": "/api/return-mail", "fn": "loadReturnMail", "desc": "Returned mail"},
        ]
    },
    "ops_monitor": {
        "label": "Ops & Monitoring",
        "icon": "⚙️",
        "endpoints": [
            {"route": "/api/automation-status", "fn": "loadAutomationStatus", "desc": "n8n workflow status"},
            {"route": "/api/scheduler", "fn": "loadScheduler", "desc": "Job scheduler"},
            {"route": "/api/backup-export", "fn": "loadBackupExport", "desc": "Data backup/export"},
            {"route": "/api/n8n-export", "fn": "loadN8NExport", "desc": "n8n workflow export"},
            {"route": "/api/monitor-all", "fn": "loadMonitorAll", "desc": "All-services health"},
            {"route": "/api/uptime-monitor", "fn": "loadUptimeMonitor", "desc": "Uptime tracking"},
            {"route": "/api/hosting-health", "fn": "loadHostingHealth", "desc": "20i hosting health"},
            {"route": "/api/error-analysis", "fn": "loadErrorAnalysis", "desc": "Error patterns"},
            {"route": "/api/ops-digest", "fn": "loadOpsDigest", "desc": "Daily ops digest"},
            {"route": "/api/analytics-digest", "fn": "loadAnalyticsDigest", "desc": "Analytics summary"},
            {"route": "/api/api-analytics", "fn": "loadAPIAnalytics", "desc": "API usage stats"},
            {"route": "/api/chatbot-analytics", "fn": "loadChatbotAnalytics", "desc": "Chatbot analytics"},
            {"route": "/api/tool-connector", "fn": "loadToolConnector", "desc": "Tool integrations"},
            {"route": "/api/setup-guide", "fn": "loadSetupGuide", "desc": "Setup wizard"},
            {"route": "/api/webinar-scheduler", "fn": "loadWebinarScheduler", "desc": "Webinar scheduling"},
        ]
    },
    "doc_pipeline": {
        "label": "Document Pipeline",
        "icon": "📄",
        "endpoints": [
            {"route": "/api/mail-process", "fn": "loadMailProcess2", "desc": "Incoming mail scanner"},
            {"route": "/api/assistant/summarize-document", "fn": "loadDocSummarize", "desc": "AI doc summary"},
            {"route": "/api/assistant/explain-obligation", "fn": "loadOblExplain", "desc": "AI obligation explain"},
            {"route": "/api/generate-agreement", "fn": "loadGenAgreement", "desc": "Agreement PDF gen"},
        ]
    },
}

PORTAL_SECTIONS = {
    "compliance_center": {
        "label": "Compliance Center",
        "icon": "🛡️",
        "endpoints": [
            {"route": "/api/compliance-score", "fn": "loadPortalCompScore", "desc": "Your compliance score"},
            {"route": "/api/compliance-dashboard", "fn": "loadPortalCompDash", "desc": "Compliance overview"},
            {"route": "/api/dissolution-predictor", "fn": "loadPortalDissPred", "desc": "Dissolution risk check"},
            {"route": "/api/entity-monitor", "fn": "loadPortalEntityMon", "desc": "Entity monitoring"},
            {"route": "/api/compliance-check", "fn": "loadPortalCompCheck", "desc": "Quick compliance check"},
        ]
    },
    "filing_actions": {
        "label": "Filing Actions",
        "icon": "📝",
        "endpoints": [
            {"route": "/api/obligations/[id]/acknowledge", "fn": "loadPortalAcknowledge", "desc": "Acknowledge deadlines"},
            {"route": "/api/obligations/[id]/mark-filed", "fn": "loadPortalMarkFiled", "desc": "Mark as filed"},
            {"route": "/api/obligations/[id]/submit-review", "fn": "loadPortalSubmitReview", "desc": "Submit for review"},
            {"route": "/api/annual-report-prefill", "fn": "loadPortalPrefill", "desc": "Pre-fill annual report"},
        ]
    },
    "entity_mgmt": {
        "label": "My Entities",
        "icon": "🏛️",
        "endpoints": [
            {"route": "/api/entity-intake", "fn": "loadPortalEntityIntake", "desc": "Add new entity"},
            {"route": "/api/entity-database", "fn": "loadPortalEntityDB", "desc": "Entity registry"},
            {"route": "/api/pa-dos-search", "fn": "loadPortalDOSSearch", "desc": "PA DOS lookup"},
            {"route": "/api/address-verify", "fn": "loadPortalAddrVerify", "desc": "Verify address"},
        ]
    },
    "ai_assistant": {
        "label": "AI Assistant",
        "icon": "🤖",
        "endpoints": [
            {"route": "/api/assistant/summarize-document", "fn": "loadPortalDocSummary", "desc": "Summarize documents"},
            {"route": "/api/assistant/explain-obligation", "fn": "loadPortalOblExplain", "desc": "Explain obligations"},
        ]
    },
    "billing_center": {
        "label": "Billing",
        "icon": "💳",
        "endpoints": [
            {"route": "/api/invoice-generate", "fn": "loadPortalInvoice", "desc": "View invoices"},
            {"route": "/api/tax-export", "fn": "loadPortalTaxExport", "desc": "Tax documents"},
        ]
    },
    "partner_referral": {
        "label": "Referrals",
        "icon": "🎯",
        "endpoints": [
            {"route": "/api/referrals/share", "fn": "loadPortalRefShare", "desc": "Share referral link"},
            {"route": "/api/referral-track", "fn": "loadPortalRefTrack", "desc": "Track referrals"},
        ]
    },
}

# ═══════════════════════════════════════════════════════════════════
# GENERATE ADMIN HTML
# ═══════════════════════════════════════════════════════════════════

def gen_admin_nav():
    """Generate nav buttons for new admin sections"""
    lines = ['\n        <!-- ═══ WIRED SECTIONS (auto-generated) ═══ -->']
    group_map = {
        "compliance_intel": "INTELLIGENCE",
        "entity_ops": "INTELLIGENCE",
        "obligation_mgmt": "INTELLIGENCE",
        "revenue_intel": "REVENUE",
        "partner_channel": "REVENUE",
        "content_engine": "CONTENT",
        "comms_center": "COMMUNICATIONS",
        "ops_monitor": "OPERATIONS",
        "doc_pipeline": "DOCUMENTS",
    }
    current_group = None
    for key, sec in ADMIN_SECTIONS.items():
        grp = group_map.get(key, "OTHER")
        if grp != current_group:
            current_group = grp
            lines.append(f'        <div class="nav-section">{grp}</div>')
        slug = key
        lines.append(f'        <button class="nav-item" onclick="showPage(\'{slug}\')"><span class="icon">{sec["icon"]}</span>{sec["label"]}</button>')
    return '\n'.join(lines)

def gen_admin_pages():
    """Generate page containers for new admin sections"""
    pages = []
    for key, sec in ADMIN_SECTIONS.items():
        ep_count = len(sec["endpoints"])
        pages.append(f'''
      <div class="page" id="page-{key}">
        <div class="card">
          <h3 style="margin-bottom:16px">{sec["icon"]} {sec["label"]}</h3>
          <div id="{key}-summary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:16px"></div>
          <div id="{key}-body"><div class="loading"><div class="spinner"></div>Loading {sec["label"].lower()}...</div></div>
        </div>
      </div>''')
    return '\n'.join(pages)

def gen_admin_titles():
    """Generate title mapping additions"""
    titles = {}
    for key, sec in ADMIN_SECTIONS.items():
        titles[key] = sec["label"]
    return titles

def gen_admin_loaders():
    """Generate JS loader functions for admin"""
    fns = []
    for key, sec in ADMIN_SECTIONS.items():
        endpoints = sec["endpoints"]
        # Build a multi-endpoint loader that calls each and renders results
        ep_calls = []
        for ep in endpoints:
            route = ep["route"]
            # Handle parameterized routes
            if "[id]" in route:
                continue  # Skip parameterized — need ID context
            ep_calls.append(f"    {{ route: '{route}', label: '{ep['desc']}' }}")

        fn_name = f"load_{key}"
        fns.append(f'''
async function {fn_name}() {{
  const el = document.getElementById('{key}-body');
  const endpoints = [
{chr(10).join(ep_calls)}
  ];
  let html = '';
  for (const ep of endpoints) {{
    try {{
      const r = await fetch(ep.route, {{ headers: {{ 'X-Admin-Key': ADMIN_KEY }} }});
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) {{ html += `<div style="padding:8px 0;font-size:12px;border-bottom:0.5px solid #eee"><span style="font-weight:600">${{ep.label}}</span> <code style="font-size:11px;color:var(--gray)">${{ep.route}}</code> <span class="badge badge-green" style="font-size:10px">✓ Live</span></div>`; continue; }}
      const d = await r.json();
      const ok = d.success !== false && r.ok;
      html += `<div style="padding:8px 0;font-size:12px;border-bottom:0.5px solid #eee"><span style="font-weight:600">${{ep.label}}</span> <code style="font-size:11px;color:var(--gray)">${{ep.route}}</code> <span class="badge ${{ok?'badge-green':'badge-red'}}" style="font-size:10px">${{ok?'✓ Live':'✗ Error'}}</span>${{ok && d.data ? ' <span style="color:var(--gray);font-size:11px">'+JSON.stringify(d.data).slice(0,100)+'</span>' : ''}}</div>`;
    }} catch(e) {{
      html += `<div style="padding:8px 0;font-size:12px;border-bottom:0.5px solid #eee"><span style="font-weight:600">${{ep.label}}</span> <code style="font-size:11px;color:var(--gray)">${{ep.route}}</code> <span class="badge badge-red" style="font-size:10px">✗ ${{e.message}}</span></div>`;
    }}
  }}
  el.innerHTML = html || '<div style="color:var(--gray);font-size:13px">No endpoints responded</div>';
}}''')
    return '\n'.join(fns)

def gen_admin_showpage_cases():
    """Generate showPage switch cases"""
    cases = []
    for key in ADMIN_SECTIONS:
        fn_name = f"load_{key}"
        cases.append(f"  else if (name === '{key}') {fn_name}();")
    return '\n'.join(cases)


# ═══════════════════════════════════════════════════════════════════
# GENERATE PORTAL HTML
# ═══════════════════════════════════════════════════════════════════

def gen_portal_nav():
    """Generate nav items for portal"""
    lines = []
    for key, sec in PORTAL_SECTIONS.items():
        lines.append(f'    <div class="nav-item" onclick="setTab(\'{key}\', this)"><span class="nav-icon">{sec["icon"]}</span>{sec["label"]}</div>')
    return '\n'.join(lines)

def gen_portal_tabs():
    """Generate tab content containers for portal"""
    tabs = []
    for key, sec in PORTAL_SECTIONS.items():
        tabs.append(f'''
    <div class="tab-content" id="tab-{key}" style="display:none">
      <h2 style="font-family:var(--serif);margin-bottom:16px">{sec["label"]}</h2>
      <div id="{key}-body"><div style="text-align:center;padding:32px;color:var(--muted)">Loading...</div></div>
    </div>''')
    return '\n'.join(tabs)

def gen_portal_loaders():
    """Generate JS loader functions for portal"""
    fns = []
    for key, sec in PORTAL_SECTIONS.items():
        endpoints = sec["endpoints"]
        ep_calls = []
        for ep in endpoints:
            route = ep["route"]
            if "[id]" in route:
                continue
            ep_calls.append(f"    {{ route: '{route}', label: '{ep['desc']}' }}")

        fn_name = f"loadPortal_{key}"
        fns.append(f'''
async function {fn_name}() {{
  if (!CLIENT) return;
  const el = document.getElementById('{key}-body');
  const endpoints = [
{chr(10).join(ep_calls)}
  ];
  let html = '<div style="display:grid;gap:12px">';
  for (const ep of endpoints) {{
    try {{
      const url = ep.route + (ep.route.includes('?') ? '&' : '?') + 'email=' + encodeURIComponent(CLIENT.email);
      const r = await fetch(url);
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) {{ html += `<div style="background:var(--surface);padding:16px;border-radius:12px;border:1px solid var(--border)"><div style="font-weight:600;font-size:14px;margin-bottom:4px">${{ep.label}}</div><div style="font-size:12px;color:var(--muted)">Connected · ${{ep.route}}</div></div>`; continue; }}
      const d = await r.json();
      const ok = d.success !== false && r.ok;
      html += `<div style="background:var(--surface);padding:16px;border-radius:12px;border:1px solid ${{ok?'var(--border)':'#fca5a5'}}"><div style="font-weight:600;font-size:14px;margin-bottom:4px">${{ep.label}}</div><div style="font-size:12px;color:${{ok?'var(--muted)':'#dc2626'}}">${{ok?'Available':'Service unavailable'}}</div>${{ok && d.score !== undefined ? '<div style="font-size:24px;font-weight:700;margin-top:8px">'+d.score+'</div>' : ''}}</div>`;
    }} catch(e) {{
      html += `<div style="background:var(--surface);padding:16px;border-radius:12px;border:1px solid #fca5a5"><div style="font-weight:600;font-size:14px">${{ep.label}}</div><div style="font-size:12px;color:#dc2626">${{e.message}}</div></div>`;
    }}
  }}
  html += '</div>';
  el.innerHTML = html;
}}''')
    return '\n'.join(fns)

def gen_portal_settab_cases():
    """Generate setTab switch cases"""
    cases = []
    for key in PORTAL_SECTIONS:
        fn_name = f"loadPortal_{key}"
        cases.append(f"  if (tab === '{key}') {fn_name}();")
    return '\n'.join(cases)


# ═══════════════════════════════════════════════════════════════════
# BUILD OUTPUT
# ═══════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    # Write admin additions
    with open('/home/claude/pa-crop-services/admin-wire.json', 'w') as f:
        json.dump({
            "nav_html": gen_admin_nav(),
            "pages_html": gen_admin_pages(),
            "titles": gen_admin_titles(),
            "loaders_js": gen_admin_loaders(),
            "showpage_cases": gen_admin_showpage_cases(),
        }, f, indent=2)

    # Write portal additions
    with open('/home/claude/pa-crop-services/portal-wire.json', 'w') as f:
        json.dump({
            "nav_html": gen_portal_nav(),
            "tabs_html": gen_portal_tabs(),
            "loaders_js": gen_portal_loaders(),
            "settab_cases": gen_portal_settab_cases(),
        }, f, indent=2)

    # Summary
    admin_total = sum(len(s["endpoints"]) for s in ADMIN_SECTIONS.values())
    portal_total = sum(len(s["endpoints"]) for s in PORTAL_SECTIONS.values())
    print(f"Admin: {len(ADMIN_SECTIONS)} sections, {admin_total} endpoints")
    print(f"Portal: {len(PORTAL_SECTIONS)} sections, {portal_total} endpoints")
    print(f"Total wired: {admin_total + portal_total}")
    print("Generated: admin-wire.json, portal-wire.json")
