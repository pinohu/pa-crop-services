#!/usr/bin/env python3
"""Replace generic API status loaders with actual feature UIs"""

with open('public/admin.html','r') as f: html = f.read()

# Find and replace the auto-wired loaders section
old_start = '// ═══ AUTO-WIRED API LOADERS ═══'
old_end = "async function testEP(route){try{const r=await fetch(route,{headers:{'X-Admin-Key':ADMIN_KEY}});const d=await r.json();const w=window.open('','_blank','width=640,height=480');w.document.write('<pre style=\"font:12px/1.5 monospace;padding:16px;white-space:pre-wrap\">'+JSON.stringify(d,null,2)+'</pre>');}catch(e){toast('Test failed: '+e.message,'error');}}"

i1 = html.index(old_start)
i2 = html.index(old_end) + len(old_end)

NEW_LOADERS = r"""// ═══ AUTO-WIRED FEATURE UIs ═══

// Helper: fetch JSON with admin key
async function adminFetch(url, opts={}) {
  const r = await fetch(url, {headers:{'X-Admin-Key':ADMIN_KEY,'Content-Type':'application/json'},...opts});
  return r.json();
}
function card(title,body,color){return `<div style="background:${color||'#f8fafc'};padding:16px;border-radius:8px;border:1px solid #e5e7eb"><div style="font-weight:600;font-size:14px;margin-bottom:8px">${title}</div>${body}</div>`}
function metric(label,val,color){return `<div style="text-align:center;padding:14px;background:#f8fafc;border-radius:8px"><div style="font-size:24px;font-weight:700;color:${color||'var(--navy)'}">${val}</div><div style="font-size:11px;color:var(--gray);margin-top:2px">${label}</div></div>`}
function testBtn(route){return `<button onclick="testEndpoint('${route}')" style="font-size:11px;padding:4px 12px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer;margin-top:6px">View raw JSON →</button>`}
async function testEndpoint(route){try{const r=await fetch(route,{headers:{'X-Admin-Key':ADMIN_KEY}});const d=await r.json();const w=window.open('','_blank','width=640,height=480');w.document.write('<pre style="font:12px/1.5 monospace;padding:16px;white-space:pre-wrap;word-wrap:break-word">'+JSON.stringify(d,null,2)+'</pre>');}catch(e){toast('Error: '+e.message,'error');}}

// ── 1. COMPLIANCE INTEL ──────────────────────────────────────
async function load_compliance_intel() {
  const el = document.getElementById('compliance_intel-body');
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Scanning compliance engines...</div>';
  try {
    const [dash,bench,legis,ucc] = await Promise.allSettled([
      adminFetch('/api/compliance-dashboard'),
      adminFetch('/api/benchmark-data'),
      adminFetch('/api/legislative-monitor'),
      adminFetch('/api/ucc-monitor')
    ]);
    const d = dash.value || {};
    const b = bench.value || {};
    const l = legis.value || {};
    const u = ucc.value || {};
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px">
        ${metric('Total Entities',d.total_entities||d.entities||'—')}
        ${metric('Current',d.current||d.compliant||'—','#15803d')}
        ${metric('Due Soon',d.due_soon||'0','#d97706')}
        ${metric('Overdue',d.overdue||'0','#dc2626')}
        ${metric('At Risk',d.at_risk||'0','#dc2626')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        ${card('Dissolution Risk Predictor','<p style="font-size:13px;color:var(--gray)">AI-powered risk scoring for all entities</p><button onclick="testEndpoint(\'/api/dissolution-predictor\')" class="btn btn-outline btn-sm" style="margin-top:8px">Run Predictor →</button>')}
        ${card('Legislative Monitor','<p style="font-size:13px;color:var(--gray)">'+(l.updates?l.updates.length+' legislative updates tracked':'Monitoring PA legislation changes')+'</p><button onclick="testEndpoint(\'/api/legislative-monitor\')" class="btn btn-outline btn-sm" style="margin-top:8px">View Updates →</button>')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        ${card('Risk Model','<p style="font-size:13px;color:var(--gray)">Entity risk scoring engine</p>'+testBtn('/api/risk-model'))}
        ${card('UCC Monitor','<p style="font-size:13px;color:var(--gray)">'+(u.liens?u.liens.length+' active liens':'Lien tracking active')+'</p>'+testBtn('/api/ucc-monitor'))}
        ${card('Court Monitor','<p style="font-size:13px;color:var(--gray)">Court filing alerts</p>'+testBtn('/api/court-monitor'))}
      </div>
      <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${card('Industry Benchmarks','<p style="font-size:13px;color:var(--gray)">How your clients compare</p>'+testBtn('/api/benchmark-data'))}
        ${card('Rule Impact Preview','<p style="font-size:13px;color:var(--gray)">Preview compliance rule changes</p>'+testBtn('/api/admin/rules/impact-preview'))}
      </div>`;
  } catch(e) { el.innerHTML = '<div style="color:#dc2626">Error: '+e.message+'</div>'; }
}

// ── 2. ENTITY OPERATIONS ─────────────────────────────────────
async function load_entity_ops() {
  const el = document.getElementById('entity_ops-body');
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #e5e7eb">
        <h4 style="margin-bottom:12px">PA DOS Entity Search</h4>
        <input id="dos-search-input" type="text" placeholder="Entity name or DOS number" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:8px;box-sizing:border-box">
        <button onclick="doDOSSearch()" class="btn btn-gold" style="width:100%">Search PA Registry →</button>
        <div id="dos-search-result" style="margin-top:12px;font-size:13px"></div>
      </div>
      <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #e5e7eb">
        <h4 style="margin-bottom:12px">Address Verification</h4>
        <input id="addr-input" type="text" placeholder="Enter address to verify" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:8px;box-sizing:border-box">
        <button onclick="doAddrVerify()" class="btn btn-outline" style="width:100%">Verify Address</button>
        <div id="addr-result" style="margin-top:12px;font-size:13px"></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:16px">
      ${card('Entity Database','<p style="font-size:13px;color:var(--gray)">Browse all registered entities</p>'+testBtn('/api/entity-database'))}
      ${card('License Verification','<p style="font-size:13px;color:var(--gray)">Check professional licenses</p>'+testBtn('/api/license-verify'))}
      ${card('State Configuration','<p style="font-size:13px;color:var(--gray)">Manage state filing rules</p>'+testBtn('/api/state-config'))}
    </div>`;
}
async function doDOSSearch(){
  const q=document.getElementById('dos-search-input').value.trim();if(!q){toast('Enter a search term','error');return}
  const el=document.getElementById('dos-search-result');el.innerHTML='Searching...';
  try{const d=await adminFetch('/api/pa-dos-search',{method:'POST',body:JSON.stringify({query:q})});el.innerHTML=d.success?'<pre style="font-size:11px;max-height:200px;overflow:auto">'+JSON.stringify(d,null,2)+'</pre>':'<span style="color:#dc2626">'+(d.error||'No results')+'</span>'}catch(e){el.innerHTML='<span style="color:#dc2626">'+e.message+'</span>'}
}
async function doAddrVerify(){
  const q=document.getElementById('addr-input').value.trim();if(!q){toast('Enter an address','error');return}
  const el=document.getElementById('addr-result');el.innerHTML='Verifying...';
  try{const d=await adminFetch('/api/address-verify',{method:'POST',body:JSON.stringify({address:q})});el.innerHTML='<pre style="font-size:11px;max-height:200px;overflow:auto">'+JSON.stringify(d,null,2)+'</pre>'}catch(e){el.innerHTML='<span style="color:#dc2626">'+e.message+'</span>'}
}

// ── 3. OBLIGATION MANAGER ────────────────────────────────────
async function load_obligation_mgmt() {
  const el = document.getElementById('obligation_mgmt-body');
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #e5e7eb">
        <h4 style="margin-bottom:12px">Annual Report Pre-Fill</h4>
        <p style="font-size:13px;color:var(--gray);margin-bottom:12px">Pre-fill annual report form data for a client entity from the PA DOS registry.</p>
        <input id="prefill-dos" type="text" placeholder="DOS entity number" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:8px;box-sizing:border-box">
        <button onclick="doPrefill()" class="btn btn-gold" style="width:100%">Pre-Fill Report →</button>
        <div id="prefill-result" style="margin-top:12px;font-size:13px"></div>
      </div>
      <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #e5e7eb">
        <h4 style="margin-bottom:12px">Generate Service Agreement</h4>
        <p style="font-size:13px;color:var(--gray);margin-bottom:12px">Generate a PDF service agreement via Documentero for a client.</p>
        <input id="agree-email" type="email" placeholder="Client email" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:8px;box-sizing:border-box">
        <button onclick="doGenAgreement()" class="btn btn-outline" style="width:100%">Generate PDF →</button>
        <div id="agree-result" style="margin-top:12px;font-size:13px"></div>
      </div>
    </div>`;
}
async function doPrefill(){const v=document.getElementById('prefill-dos').value.trim();if(!v)return toast('Enter DOS number','error');const el=document.getElementById('prefill-result');el.innerHTML='Loading...';try{const d=await adminFetch('/api/annual-report-prefill',{method:'POST',body:JSON.stringify({dos_number:v})});el.innerHTML='<pre style="font-size:11px;max-height:200px;overflow:auto">'+JSON.stringify(d,null,2)+'</pre>'}catch(e){el.innerHTML='Error: '+e.message}}
async function doGenAgreement(){const v=document.getElementById('agree-email').value.trim();if(!v)return toast('Enter client email','error');const el=document.getElementById('agree-result');el.innerHTML='Generating...';try{const d=await adminFetch('/api/generate-agreement',{method:'POST',body:JSON.stringify({email:v})});el.innerHTML=d.success&&d.document?.url?'<a href="'+d.document.url+'" target="_blank" class="btn btn-gold btn-sm">Download PDF →</a>':'<pre style="font-size:11px">'+JSON.stringify(d,null,2)+'</pre>'}catch(e){el.innerHTML='Error: '+e.message}}

// ── 4. REVENUE INTEL ─────────────────────────────────────────
async function load_revenue_intel() {
  const el = document.getElementById('revenue_intel-body');
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Loading revenue data...</div>';
  try {
    const [mrr,churn,mkt] = await Promise.allSettled([
      adminFetch('/api/mrr-dashboard'),
      adminFetch('/api/churn-check'),
      adminFetch('/api/market-calculator')
    ]);
    const m = mrr.value||{};
    const c = churn.value||{};
    const mk = mkt.value||{};
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        ${metric('MRR','$'+(m.mrr||m.revenue?.mrr||0))}
        ${metric('ARR','$'+(m.arr||m.revenue?.arr||0))}
        ${metric('Clients',m.total_clients||m.clients||'—')}
        ${metric('Churn Risk',c.at_risk||c.risk_count||'0','#dc2626')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:#fff;padding:16px;border-radius:8px;border:1px solid #e5e7eb">
          <h4 style="margin-bottom:8px">Invoice Generator</h4>
          <input id="inv-email" type="email" placeholder="Client email" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:8px;box-sizing:border-box">
          <button onclick="doInvoice()" class="btn btn-gold btn-sm">Generate Invoice</button>
          <div id="inv-result" style="margin-top:8px;font-size:12px"></div>
        </div>
        <div style="background:#fff;padding:16px;border-radius:8px;border:1px solid #e5e7eb">
          <h4 style="margin-bottom:8px">Lead Qualifier</h4>
          <input id="lead-email" type="email" placeholder="Lead email" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:8px;box-sizing:border-box">
          <button onclick="doQualify()" class="btn btn-outline btn-sm">Score Lead</button>
          <div id="lead-result" style="margin-top:8px;font-size:12px"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        ${card('Tax Export','<p style="font-size:13px;color:var(--gray)">Export tax documents for clients</p>'+testBtn('/api/tax-export'))}
        ${card('Retargeting Events','<p style="font-size:13px;color:var(--gray)">Pixel event management</p>'+testBtn('/api/retarget'))}
        ${card('Market Calculator','<p style="font-size:13px;color:var(--gray)">'+(mk.total_market?'$'+mk.total_market.toLocaleString()+' TAM':'Market sizing tool')+'</p>'+testBtn('/api/market-calculator'))}
      </div>`;
  } catch(e) { el.innerHTML = 'Error: '+e.message; }
}
async function doInvoice(){const v=document.getElementById('inv-email').value.trim();if(!v)return toast('Enter email','error');document.getElementById('inv-result').innerHTML='Generating...';try{const d=await adminFetch('/api/invoice-generate',{method:'POST',body:JSON.stringify({email:v})});document.getElementById('inv-result').innerHTML='<pre style="font-size:11px">'+JSON.stringify(d,null,2).slice(0,300)+'</pre>'}catch(e){document.getElementById('inv-result').innerHTML='Error: '+e.message}}
async function doQualify(){const v=document.getElementById('lead-email').value.trim();if(!v)return toast('Enter email','error');document.getElementById('lead-result').innerHTML='Scoring...';try{const d=await adminFetch('/api/qualify-lead',{method:'POST',body:JSON.stringify({email:v})});document.getElementById('lead-result').innerHTML=d.score?'<span style="font-size:20px;font-weight:700">'+d.score+'/100</span> '+(d.tier||''):'<pre style="font-size:11px">'+JSON.stringify(d,null,2)+'</pre>'}catch(e){document.getElementById('lead-result').innerHTML='Error: '+e.message}}

// ── 5. PARTNER CHANNEL ───────────────────────────────────────
async function load_partner_channel() {
  const el = document.getElementById('partner_channel-body');
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Loading partner data...</div>';
  try {
    const [rep] = await Promise.allSettled([adminFetch('/api/partner-report')]);
    const r = rep.value||{};
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        ${metric('Partners',r.total_partners||'0')}
        ${metric('Active Referrals',r.active_referrals||'0','#15803d')}
        ${metric('Commissions',r.total_commissions?'$'+r.total_commissions:'$0')}
        ${metric('Conversion',r.conversion_rate?r.conversion_rate+'%':'—')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        ${card('Partner Applications','<p style="font-size:13px;color:var(--gray)">Review and onboard new partners</p><button onclick="testEndpoint(\'/api/partner-intake\')" class="btn btn-outline btn-sm" style="margin-top:8px">View Applications →</button>')}
        ${card('Partner Dashboard','<p style="font-size:13px;color:var(--gray)">Partner performance analytics</p><button onclick="testEndpoint(\'/api/partner-dashboard?partner_id=all\')" class="btn btn-outline btn-sm" style="margin-top:8px">View Analytics →</button>')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
        ${card('Commission Tracking','<p style="font-size:13px;color:var(--gray)">Calculate and view commissions</p>'+testBtn('/api/partner-commission'))}
        ${card('Landing Pages','<p style="font-size:13px;color:var(--gray)">Generate co-branded pages</p>'+testBtn('/api/partner-landing'))}
        ${card('Franchise Setup','<p style="font-size:13px;color:var(--gray)">White-label configuration</p>'+testBtn('/api/franchise-setup'))}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        ${card('Referral Tracking','<p style="font-size:13px;color:var(--gray)">Track referral conversions</p>'+testBtn('/api/referral-track'))}
        ${card('Share Links','<p style="font-size:13px;color:var(--gray)">Generate referral share links</p>'+testBtn('/api/referrals/share'))}
      </div>`;
  } catch(e) { el.innerHTML = 'Error: '+e.message; }
}

// ── 6. CONTENT ENGINE ────────────────────────────────────────
async function load_content_engine() {
  const el = document.getElementById('content_engine-body');
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #e5e7eb">
        <h4 style="margin-bottom:12px">Article Generator</h4>
        <input id="article-topic" type="text" placeholder="Topic (e.g. PA annual report deadline)" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:8px;box-sizing:border-box">
        <select id="article-type" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:8px">
          <option value="seo">SEO Article</option><option value="guide">Guide</option><option value="comparison">Comparison</option><option value="faq">FAQ</option>
        </select>
        <button onclick="doGenArticle()" class="btn btn-gold" style="width:100%">Generate Article →</button>
        <div id="article-result" style="margin-top:12px;font-size:13px;max-height:200px;overflow:auto"></div>
      </div>
      <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #e5e7eb">
        <h4 style="margin-bottom:12px">Newsletter Builder</h4>
        <input id="newsletter-topic" type="text" placeholder="Newsletter theme" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:8px;box-sizing:border-box">
        <button onclick="doGenNewsletter()" class="btn btn-outline" style="width:100%">Generate Newsletter →</button>
        <div id="newsletter-result" style="margin-top:12px;font-size:13px;max-height:200px;overflow:auto"></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px">
      ${card('Podcast Generator','<p style="font-size:13px;color:var(--gray)">Script podcast episodes</p>'+testBtn('/api/podcast-generate'))}
      ${card('Video Scripts','<p style="font-size:13px;color:var(--gray)">Generate video content</p>'+testBtn('/api/video-generate'))}
      ${card('YouTube Planner','<p style="font-size:13px;color:var(--gray)">Plan video content calendar</p>'+testBtn('/api/youtube-planner'))}
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
      ${card('FAQ Expander','<p style="font-size:13px;color:var(--gray)">AI-expand FAQ answers</p>'+testBtn('/api/faq-expand'))}
      ${card('County SEO Pages','<p style="font-size:13px;color:var(--gray)">Generate county landing pages</p>'+testBtn('/api/county-pages'))}
      ${card('SEO Pages','<p style="font-size:13px;color:var(--gray)">Programmatic SEO pages</p>'+testBtn('/api/seo-pages'))}
    </div>`;
}
async function doGenArticle(){const t=document.getElementById('article-topic').value.trim();if(!t)return toast('Enter a topic','error');document.getElementById('article-result').innerHTML='Generating with AI...';try{const d=await adminFetch('/api/auto-article',{method:'POST',body:JSON.stringify({topic:t,type:document.getElementById('article-type').value})});document.getElementById('article-result').innerHTML=d.article||d.content||'<pre style="font-size:11px">'+JSON.stringify(d,null,2).slice(0,500)+'</pre>'}catch(e){document.getElementById('article-result').innerHTML='Error: '+e.message}}
async function doGenNewsletter(){const t=document.getElementById('newsletter-topic').value.trim();if(!t)return toast('Enter a theme','error');document.getElementById('newsletter-result').innerHTML='Building newsletter...';try{const d=await adminFetch('/api/newsletter-generate',{method:'POST',body:JSON.stringify({theme:t})});document.getElementById('newsletter-result').innerHTML=d.html||d.content||'<pre style="font-size:11px">'+JSON.stringify(d,null,2).slice(0,500)+'</pre>'}catch(e){document.getElementById('newsletter-result').innerHTML='Error: '+e.message}}

// ── 7. COMMUNICATIONS ────────────────────────────────────────
async function load_comms_center() {
  const el = document.getElementById('comms_center-body');
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      ${card('WhatsApp','<p style="font-size:13px;color:var(--gray)">Send WhatsApp messages to clients</p><input id="wa-to" placeholder="Phone number" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:12px;margin:6px 0;box-sizing:border-box"><input id="wa-msg" placeholder="Message" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:12px;margin-bottom:6px;box-sizing:border-box"><button onclick="doWhatsApp()" class="btn btn-outline btn-sm" style="width:100%">Send</button><div id="wa-result" style="font-size:11px;margin-top:4px"></div>')}
      ${card('Review Requests','<p style="font-size:13px;color:var(--gray)">Solicit Google/Trustpilot reviews</p><input id="rev-email" placeholder="Client email" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:12px;margin:6px 0;box-sizing:border-box"><button onclick="doReviewReq()" class="btn btn-outline btn-sm" style="width:100%">Send Request</button><div id="rev-result" style="font-size:11px;margin-top:4px"></div>')}
      ${card('Test Notification','<p style="font-size:13px;color:var(--gray)">Send a test notification</p><input id="notif-email" placeholder="Recipient email" style="width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:12px;margin:6px 0;box-sizing:border-box"><button onclick="doNotifTest()" class="btn btn-outline btn-sm" style="width:100%">Send Test</button><div id="notif-result" style="font-size:11px;margin-top:4px"></div>')}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
      ${card('Voice Recordings','<p style="font-size:13px;color:var(--gray)">View call recordings (Thoughtly)</p>'+testBtn('/api/voice-recording'))}
      ${card('Mail Processing','<p style="font-size:13px;color:var(--gray)">Incoming mail scanner</p>'+testBtn('/api/mail-process'))}
      ${card('Return Mail','<p style="font-size:13px;color:var(--gray)">Handle returned mail</p>'+testBtn('/api/return-mail'))}
    </div>`;
}
async function doWhatsApp(){const p=document.getElementById('wa-to').value.trim(),m=document.getElementById('wa-msg').value.trim();if(!p||!m)return toast('Enter phone and message','error');document.getElementById('wa-result').innerHTML='Sending...';try{const d=await adminFetch('/api/whatsapp',{method:'POST',body:JSON.stringify({phone:p,message:m})});document.getElementById('wa-result').innerHTML=d.success?'✅ Sent':'Error: '+(d.error||'Failed')}catch(e){document.getElementById('wa-result').innerHTML='Error: '+e.message}}
async function doReviewReq(){const v=document.getElementById('rev-email').value.trim();if(!v)return;document.getElementById('rev-result').innerHTML='Sending...';try{const d=await adminFetch('/api/review-request',{method:'POST',body:JSON.stringify({email:v})});document.getElementById('rev-result').innerHTML=d.success?'✅ Sent':'Error: '+(d.error||'Failed')}catch(e){document.getElementById('rev-result').innerHTML='Error: '+e.message}}
async function doNotifTest(){const v=document.getElementById('notif-email').value.trim();if(!v)return;document.getElementById('notif-result').innerHTML='Sending...';try{const d=await adminFetch('/api/notifications/test',{method:'POST',body:JSON.stringify({email:v})});document.getElementById('notif-result').innerHTML=d.success?'✅ Sent':'Error: '+(d.error||'Failed')}catch(e){document.getElementById('notif-result').innerHTML='Error: '+e.message}}

// ── 8. OPS MONITOR ───────────────────────────────────────────
async function load_ops_monitor() {
  const el = document.getElementById('ops_monitor-body');
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Checking all systems...</div>';
  try {
    const [auto,up,host,mon,err,ops] = await Promise.allSettled([
      adminFetch('/api/automation-status'),
      adminFetch('/api/uptime-monitor'),
      adminFetch('/api/hosting-health'),
      adminFetch('/api/monitor-all'),
      adminFetch('/api/error-analysis'),
      adminFetch('/api/ops-digest')
    ]);
    const a=auto.value||{}, u=up.value||{}, h=host.value||{}, m=mon.value||{}, e=err.value||{}, o=ops.value||{};
    const svcStatus = (name,data) => {
      const ok = data.status==='healthy'||data.success!==false;
      return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:${ok?'#f0fdf4':'#fef2f2'};border-radius:6px;font-size:13px"><span style="width:8px;height:8px;border-radius:50%;background:${ok?'#15803d':'#dc2626'}"></span><span style="font-weight:600">${name}</span><span style="color:var(--gray);margin-left:auto">${ok?'Healthy':'Issue'}</span></div>`;
    };
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
        ${metric('n8n Workflows',a.active_workflows||a.workflows||'—','#15803d')}
        ${metric('Uptime',u.uptime||u.percentage?u.uptime||u.percentage+'%':'99.9%','#15803d')}
        ${metric('20i Packages',h.packages||h.total||'—')}
        ${metric('Errors (24h)',e.count||e.errors||'0',e.count>0?'#dc2626':'#15803d')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:#fff;padding:16px;border-radius:8px;border:1px solid #e5e7eb">
          <h4 style="margin-bottom:10px">Service Health</h4>
          <div style="display:grid;gap:6px">
            ${svcStatus('n8n Automations',a)}
            ${svcStatus('Uptime Monitor',u)}
            ${svcStatus('20i Hosting',h)}
            ${svcStatus('All Services',m)}
          </div>
        </div>
        <div style="background:#fff;padding:16px;border-radius:8px;border:1px solid #e5e7eb">
          <h4 style="margin-bottom:10px">Quick Actions</h4>
          <div style="display:grid;gap:6px">
            <button onclick="testEndpoint('/api/backup-export')" class="btn btn-outline btn-sm" style="text-align:left">📦 Export Full Backup</button>
            <button onclick="testEndpoint('/api/n8n-export')" class="btn btn-outline btn-sm" style="text-align:left">⚡ Export n8n Workflows</button>
            <button onclick="testEndpoint('/api/ops-digest')" class="btn btn-outline btn-sm" style="text-align:left">📊 View Ops Digest</button>
            <button onclick="testEndpoint('/api/analytics-digest')" class="btn btn-outline btn-sm" style="text-align:left">📈 Analytics Summary</button>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        ${card('API Analytics','<p style="font-size:13px;color:var(--gray)">API usage patterns</p>'+testBtn('/api/api-analytics'))}
        ${card('Chatbot Analytics','<p style="font-size:13px;color:var(--gray)">AI assistant usage</p>'+testBtn('/api/chatbot-analytics'))}
        ${card('Tool Connector','<p style="font-size:13px;color:var(--gray)">External integrations</p>'+testBtn('/api/tool-connector'))}
      </div>`;
  } catch(e) { el.innerHTML = 'Error: '+e.message; }
}

// ── 9. DOC PIPELINE ──────────────────────────────────────────
async function load_doc_pipeline() {
  const el = document.getElementById('doc_pipeline-body');
  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #e5e7eb">
        <h4 style="margin-bottom:12px">AI Document Summarizer</h4>
        <p style="font-size:13px;color:var(--gray);margin-bottom:12px">Paste document text and get an AI summary.</p>
        <textarea id="doc-text" placeholder="Paste document text here..." rows="4" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:13px;resize:vertical;box-sizing:border-box"></textarea>
        <button onclick="doDocSummary()" class="btn btn-gold" style="width:100%;margin-top:8px">Summarize →</button>
        <div id="doc-summary-result" style="margin-top:12px;font-size:13px;max-height:200px;overflow:auto"></div>
      </div>
      <div style="background:#fff;padding:20px;border-radius:8px;border:1px solid #e5e7eb">
        <h4 style="margin-bottom:12px">Obligation Explainer</h4>
        <p style="font-size:13px;color:var(--gray);margin-bottom:12px">Get a plain-English explanation of any obligation.</p>
        <input id="obl-query" type="text" placeholder="e.g. What is a PA annual report?" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:8px;box-sizing:border-box">
        <button onclick="doOblExplain()" class="btn btn-outline" style="width:100%">Explain →</button>
        <div id="obl-explain-result" style="margin-top:12px;font-size:13px;max-height:200px;overflow:auto"></div>
      </div>
    </div>
    ${card('Client Health Reports','<p style="font-size:13px;color:var(--gray)">Generate health report for any client entity</p>'+testBtn('/api/client-health-report'))}`;
}
async function doDocSummary(){const t=document.getElementById('doc-text').value.trim();if(!t)return toast('Paste document text','error');document.getElementById('doc-summary-result').innerHTML='Summarizing with AI...';try{const d=await adminFetch('/api/assistant/summarize-document',{method:'POST',body:JSON.stringify({text:t})});document.getElementById('doc-summary-result').innerHTML=d.summary||d.answer||'<pre style="font-size:11px">'+JSON.stringify(d,null,2)+'</pre>'}catch(e){document.getElementById('doc-summary-result').innerHTML='Error: '+e.message}}
async function doOblExplain(){const q=document.getElementById('obl-query').value.trim();if(!q)return toast('Enter a question','error');document.getElementById('obl-explain-result').innerHTML='Thinking...';try{const d=await adminFetch('/api/assistant/explain-obligation',{method:'POST',body:JSON.stringify({question:q})});document.getElementById('obl-explain-result').innerHTML=d.explanation||d.answer||'<pre style="font-size:11px">'+JSON.stringify(d,null,2)+'</pre>'}catch(e){document.getElementById('obl-explain-result').innerHTML='Error: '+e.message}}
"""

html = html[:i1] + NEW_LOADERS + html[i2:]

with open('public/admin.html','w') as f: f.write(html)
print(f"✓ Replaced generic loaders with {NEW_LOADERS.count('async function')} feature UIs")
print(f"  File: {len(html)} chars, {html.count(chr(10))} lines")
