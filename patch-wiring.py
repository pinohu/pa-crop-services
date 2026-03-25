#!/usr/bin/env python3
"""PA CROP — Wire all unused API endpoints into admin.html and portal.html"""

def route_label(r):
    return r.split('/')[-1].replace('-',' ').replace('_',' ').capitalize()

ADMIN = [
 ("INTELLIGENCE",[
  ("compliance_intel","🔍","Compliance Intel",["/api/compliance-score","/api/compliance-dashboard","/api/dissolution-predictor","/api/entity-monitor","/api/court-monitor","/api/ucc-monitor","/api/legislative-monitor","/api/risk-model","/api/benchmark-data","/api/admin/rules/impact-preview"]),
  ("entity_ops","🏢","Entity Operations",["/api/entity-intake","/api/entity-database","/api/pa-dos-search","/api/address-verify","/api/license-verify","/api/state-config"]),
  ("obligation_mgmt","📋","Obligation Manager",["/api/annual-report-prefill","/api/generate-agreement"]),
 ]),
 ("REVENUE & GROWTH",[
  ("revenue_intel","💰","Revenue Intel",["/api/mrr-dashboard","/api/invoice-generate","/api/tax-export","/api/churn-check","/api/retarget","/api/qualify-lead","/api/market-calculator"]),
  ("partner_channel","🤝","Partner Channel",["/api/partner-intake","/api/partner-dashboard","/api/partner-commission","/api/partner-report","/api/partner-landing","/api/partners/me/portfolio","/api/referral-track","/api/referrals/share","/api/franchise-setup"]),
 ]),
 ("CONTENT & COMMS",[
  ("content_engine","✏️","Content Engine",["/api/auto-article","/api/newsletter-generate","/api/podcast-generate","/api/video-generate","/api/youtube-planner","/api/faq-expand","/api/county-pages","/api/seo-pages","/api/directory-generator"]),
  ("comms_center","📞","Communications",["/api/voice-recording","/api/whatsapp","/api/review-request","/api/notifications/test","/api/mail-process","/api/return-mail"]),
 ]),
 ("OPERATIONS",[
  ("ops_monitor","⚙️","Ops Monitor",["/api/automation-status","/api/scheduler","/api/backup-export","/api/n8n-export","/api/monitor-all","/api/uptime-monitor","/api/hosting-health","/api/error-analysis","/api/ops-digest","/api/analytics-digest","/api/api-analytics","/api/chatbot-analytics","/api/tool-connector","/api/setup-guide","/api/webinar-scheduler"]),
  ("doc_pipeline","📄","Doc Pipeline",["/api/assistant/summarize-document","/api/assistant/explain-obligation","/api/client-health-report"]),
 ]),
]

PORTAL = [
 ("comp_intel","🛡","Compliance Intel",["/api/compliance-score","/api/compliance-dashboard","/api/dissolution-predictor","/api/entity-monitor","/api/compliance-check"]),
 ("filing_actions","📝","Filing Actions",["/api/annual-report-prefill"]),
 ("entity_mgmt","🏛","My Entities",["/api/entity-intake","/api/entity-database","/api/pa-dos-search","/api/address-verify"]),
 ("portal_ai","🤖","AI Tools",["/api/assistant/summarize-document","/api/assistant/explain-obligation"]),
 ("portal_billing","💳","Invoices & Tax",["/api/invoice-generate","/api/tax-export"]),
 ("portal_referrals","🎯","Referral Center",["/api/referrals/share","/api/referral-track"]),
]

# ═══════════════════════════════════════════════════
# ADMIN PATCHING
# ═══════════════════════════════════════════════════
with open('public/admin.html','r') as f: html = f.read()

# 1. NAV
nav = '\n        <!-- ═══ WIRED API SECTIONS ═══ -->'
for grp, secs in ADMIN:
    nav += f'\n        <div class="nav-section">{grp}</div>'
    for slug,icon,label,eps in secs:
        nav += f"\n        <button class=\"nav-item\" onclick=\"showPage('{slug}')\"><span class=\"icon\">{icon}</span>{label}</button>"
html = html.replace('    </nav>', nav+'\n    </nav>', 1)

# 2. PAGES
pages = '\n      <!-- ═══ WIRED API PAGES ═══ -->'
for grp, secs in ADMIN:
    for slug,icon,label,eps in secs:
        pages += f'\n      <div class="page" id="page-{slug}"><div class="panel"><div class="panel-header"><div class="panel-title">{icon} {label} <span style="font-size:12px;color:var(--gray);font-weight:400">({len(eps)} endpoints)</span></div><button class="btn btn-outline btn-sm" onclick="load_{slug}()">⟳ Refresh</button></div><div class="panel-body" id="{slug}-body"><div class="loading"><div class="spinner"></div>Loading...</div></div></div></div>'
html = html.replace('\n<script>\nconst API =', pages+'\n\n<script>\nconst API =', 1)

# 3. TITLES
t = ''
for grp,secs in ADMIN:
    for slug,icon,label,eps in secs:
        t += f", {slug}:'{label}'"
html = html.replace("billing:'Billing & Retention' };", f"billing:'Billing & Retention'{t} }};", 1)

# 4. showPage CASES
c = ''
for grp,secs in ADMIN:
    for slug,icon,label,eps in secs:
        c += f"\n  else if (name === '{slug}') load_{slug}();"
html = html.replace("  else if (name === 'billing') loadBillingRetention();\n}", f"  else if (name === 'billing') loadBillingRetention();{c}\n}}", 1)

# 5. LOADERS
L = '\n// ═══ AUTO-WIRED API LOADERS ═══'
for grp,secs in ADMIN:
    for slug,icon,label,eps in secs:
        ej = ','.join([f"{{r:'{e}',l:'{route_label(e)}'}}" for e in eps])
        L += f"""
async function load_{slug}() {{
  const el = document.getElementById('{slug}-body');
  const eps = [{ej}];
  let h='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">';
  for(const ep of eps){{try{{const r=await fetch(ep.r,{{headers:{{'X-Admin-Key':ADMIN_KEY}}}});const ok=r.ok;let det='';try{{const d=await r.json();if(d.success===false)det='<div style="color:#dc2626;font-size:11px;margin-top:4px">'+(d.error||'Error')+'</div>';else{{const ks=Object.keys(d).filter(k=>k!=='success'&&k!=='generated_at').slice(0,3);det='<div style="font-size:11px;color:var(--gray);margin-top:4px">'+ks.map(k=>{{const v=d[k];if(typeof v==='number')return k+': <b>'+v+'</b>';if(typeof v==='string')return k+': '+v.slice(0,30);if(Array.isArray(v))return k+': '+v.length+' items';if(v&&typeof v==='object')return k+': object';return''}}).filter(Boolean).join(' · ')+'</div>'}}}}catch(_){{}}h+=`<div style="background:${{ok?'var(--bg,#f8fafc)':'#fef2f2'}};padding:14px;border-radius:8px;border:1px solid ${{ok?'#e5e7eb':'#fca5a5'}}"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:600;font-size:13px">${{ep.l}}</span><span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${{ok?'#f0fdf4':'#fef2f2'}};color:${{ok?'#15803d':'#dc2626'}}">${{ok?'Live':'Err'}}</span></div><code style="font-size:10px;color:var(--gray);display:block;margin-top:4px">${{ep.r}}</code>${{det}}<button onclick="testEP('${{ep.r}}')" style="margin-top:8px;font-size:11px;padding:3px 10px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer">Test →</button></div>`;}}catch(e){{h+=`<div style="background:#fef2f2;padding:14px;border-radius:8px;border:1px solid #fca5a5"><span style="font-weight:600;font-size:13px">${{ep.l}}</span><code style="font-size:10px;color:var(--gray);display:block;margin-top:4px">${{ep.r}}</code><div style="color:#dc2626;font-size:11px;margin-top:4px">${{e.message}}</div></div>`}}}}h+='</div>';el.innerHTML=h;
}}"""
L += """
async function testEP(route){try{const r=await fetch(route,{headers:{'X-Admin-Key':ADMIN_KEY}});const d=await r.json();const w=window.open('','_blank','width=640,height=480');w.document.write('<pre style=\"font:12px/1.5 monospace;padding:16px;white-space:pre-wrap\">'+JSON.stringify(d,null,2)+'</pre>');}catch(e){toast('Test failed: '+e.message,'error');}}"""

html = html.replace('<script>\n// Remove Vercel dev toolbar', L+'\n</script>\n<script>\n// Remove Vercel dev toolbar', 1)

with open('public/admin.html','w') as f: f.write(html)
atotal = sum(len(ep) for _,secs in ADMIN for _,_,_,ep in secs)
print(f"✓ Admin: {atotal} endpoints across {sum(len(s) for _,s in ADMIN)} sections")

# ═══════════════════════════════════════════════════
# PORTAL PATCHING
# ═══════════════════════════════════════════════════
with open('public/portal.html','r') as f: html = f.read()

# 1. NAV
nav = '\n      <div class="nav-group">\n        <div class="nav-label">More Features</div>'
for slug,icon,label,eps in PORTAL:
    nav += f'\n        <div class="nav-item" tabindex="0" role="button" onclick="setTab(\'{slug}\',this)"><span style="font-size:16px;width:20px;display:inline-block;text-align:center">{icon}</span> {label}</div>'
nav += '\n      </div>'
html = html.replace('      <div class="sidebar-footer">', nav+'\n      <div class="sidebar-footer">', 1)

# 2. TABS
tabs = '\n      <!-- ═══ WIRED PORTAL TABS ═══ -->'
for slug,icon,label,eps in PORTAL:
    tabs += f'\n      <div id="tab-{slug}" class="hidden"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 style="font-family:var(--serif);font-size:24px">{label}</h2><button onclick="loadPortal_{slug}()" style="font-size:12px;padding:6px 14px;border:1px solid var(--border,#eee);border-radius:8px;background:var(--surface,#fff);cursor:pointer">Refresh</button></div><div id="{slug}-body"><div style="text-align:center;padding:32px;color:var(--ink3,#999)">Loading...</div></div></div>'

# Insert tabs before the script section
html = html.replace('\n<script>\nlet CLIENT', tabs+'\n\n<script>\nlet CLIENT', 1)

# 3. LOADERS
L = '\n// ═══ AUTO-WIRED PORTAL LOADERS ═══'
for slug,icon,label,eps in PORTAL:
    ej = ','.join([f"{{r:'{e}',l:'{route_label(e)}'}}" for e in eps])
    L += f"""
async function loadPortal_{slug}(){{
  if(!CLIENT)return;const el=document.getElementById('{slug}-body');const eps=[{ej}];
  let h='';for(const ep of eps){{try{{const url=ep.r+(ep.r.includes('?')?'&':'?')+'email='+encodeURIComponent(CLIENT.email);const r=await fetch(url);let d={{}};try{{d=await r.json()}}catch(_){{}}const ok=r.ok&&d.success!==false;h+=`<div style="background:var(--surface,#fff);padding:16px;border-radius:12px;border:1px solid ${{ok?'var(--border,#eee)':'#fca5a5'}};margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:600;font-size:15px">${{ep.l}}</div><span style="font-size:10px;padding:2px 10px;border-radius:10px;background:${{ok?'#f0fdf4':'#fef2f2'}};color:${{ok?'#15803d':'#dc2626'}};font-weight:600">${{ok?'Available':'Unavailable'}}</span></div>${{d.score!==undefined?'<div style="font-size:28px;font-weight:700;margin-top:8px;color:var(--accent,#C9982A)">'+d.score+'</div>':''}}</div>`}}catch(e){{h+=`<div style="background:#fef2f2;padding:16px;border-radius:12px;border:1px solid #fca5a5;margin-bottom:12px"><div style="font-weight:600;font-size:15px">${{ep.l}}</div><div style="font-size:12px;color:#dc2626;margin-top:4px">${{e.message}}</div></div>`}}}}el.innerHTML=h;
}}"""
html = html.replace('function doLogout()', L+'\n\nfunction doLogout()', 1)

# 4. HOOK setTab
hook = '\n  // Auto-wired tab loaders\n'
for slug,icon,label,eps in PORTAL:
    hook += f"  if(id==='{slug}')loadPortal_{slug}();\n"
html = html.replace(
    "  // Close mobile sidebar\n  document.getElementById('sidebar').classList.remove('open');\n  document.getElementById('overlay').classList.remove('show');\n}",
    f"  // Close mobile sidebar\n  document.getElementById('sidebar').classList.remove('open');\n  document.getElementById('overlay').classList.remove('show');\n{hook}}}",
    1
)

with open('public/portal.html','w') as f: f.write(html)
ptotal = sum(len(ep) for _,_,_,ep in PORTAL)
print(f"✓ Portal: {ptotal} endpoints across {len(PORTAL)} sections")
print(f"\n✅ Total: {atotal+ptotal} endpoints wired")
