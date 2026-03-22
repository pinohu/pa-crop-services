// PA CROP Services — AI Compliance Chatbot Embed
// Add <script src="/embed/chatbot.js"></script> to any page
(function(){
const css = document.createElement('style');
css.textContent = `.chat-fab{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:#534AB7;color:#fff;border:none;cursor:pointer;box-shadow:0 4px 16px rgba(83,74,183,.4);display:flex;align-items:center;justify-content:center;z-index:9000;transition:transform .2s}.chat-fab:hover{transform:scale(1.08)}.chat-fab svg{width:24px;height:24px}.chat-panel{position:fixed;bottom:90px;right:24px;width:380px;max-width:calc(100vw - 48px);height:500px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);display:none;flex-direction:column;z-index:9001;overflow:hidden;font-family:'DM Sans',sans-serif}.chat-panel.open{display:flex}.chat-head{background:#1B4F8A;color:#fff;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}.chat-head h4{margin:0;font-size:14px;font-weight:600}.chat-head button{background:none;border:none;color:#fff;cursor:pointer;font-size:18px}.chat-body{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px}.chat-msg{max-width:85%;padding:10px 14px;border-radius:12px;font-size:14px;line-height:1.5}.chat-msg.bot{background:#f0f4ff;color:#1E2333;align-self:flex-start;border-bottom-left-radius:4px}.chat-msg.user{background:#534AB7;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}.chat-input-wrap{display:flex;border-top:1px solid #eee;padding:10px 12px;gap:8px}.chat-input-wrap input{flex:1;border:1px solid #ddd;border-radius:8px;padding:10px 12px;font-size:14px;outline:none;font-family:inherit}.chat-input-wrap input:focus{border-color:#534AB7}.chat-input-wrap button{background:#534AB7;color:#fff;border:none;border-radius:8px;padding:10px 16px;cursor:pointer;font-weight:600;font-size:14px}.chat-input-wrap button:disabled{opacity:.5}@media(max-width:480px){.chat-panel{width:calc(100vw - 24px);right:12px;bottom:80px;height:calc(100vh - 100px)}}`;
document.head.appendChild(css);

const fab = document.createElement('button');
fab.className = 'chat-fab';
fab.title = 'Ask about PA compliance';
fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
fab.onclick = function(){ panel.classList.toggle('open'); if(panel.classList.contains('open')) inp.focus(); };
document.body.appendChild(fab);

const panel = document.createElement('div');
panel.className = 'chat-panel';
panel.innerHTML = `<div class="chat-head"><h4>PA Compliance Assistant</h4><button onclick="this.closest('.chat-panel').classList.remove('open')">&times;</button></div><div class="chat-body" id="cb-body"><div class="chat-msg bot">Hi! I can help with PA registered office questions, annual reports, compliance deadlines, and more. What would you like to know?</div></div><div class="chat-input-wrap"><input id="cb-input" placeholder="Ask about PA compliance..." onkeydown="if(event.key==='Enter')window._cbSend()"><button onclick="window._cbSend()" id="cb-send">Send</button></div>`;
document.body.appendChild(panel);

const inp = panel.querySelector('#cb-input');
const hist = [];

window._cbSend = async function(){
  const msg = inp.value.trim();
  if(!msg) return;
  inp.value = '';
  panel.querySelector('#cb-send').disabled = true;
  const body = panel.querySelector('#cb-body');
  body.innerHTML += '<div class="chat-msg user">'+msg.replace(/</g,'&lt;')+'</div>';
  body.innerHTML += '<div id="cb-typing" style="font-size:12px;color:#6B7280;padding:4px 0">Thinking...</div>';
  body.scrollTop = body.scrollHeight;
  hist.push({role:'user',content:msg});
  try{
    const r = await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,history:hist.slice(-6)})});
    const d = await r.json();
    document.getElementById('cb-typing')?.remove();
    const reply = d.reply||'Sorry, please try again.';
    hist.push({role:'assistant',content:reply});
    body.innerHTML += '<div class="chat-msg bot">'+reply.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n\n/g,'<br><br>').replace(/\n/g,'<br>')+'</div>';
  }catch(e){
    document.getElementById('cb-typing')?.remove();
    body.innerHTML += '<div class="chat-msg bot">Connection error. Try again or email hello@pacropservices.com.</div>';
  }
  body.scrollTop = body.scrollHeight;
  panel.querySelector('#cb-send').disabled = false;
  inp.focus();
};
})();
