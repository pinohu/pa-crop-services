// PA CROP Services — Concierge Chatbot Embed
// Usage: <script src="/embed/chatbot.js" defer></script>
(function(){

var style = document.createElement('style');
style.textContent = `
.crop-fab{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;
  background:#1a56db;color:#fff;border:none;cursor:pointer;z-index:9000;
  box-shadow:0 4px 20px rgba(26,86,219,.35);display:flex;align-items:center;justify-content:center;
  transition:all .25s cubic-bezier(.4,0,.2,1)}
.crop-fab:hover{transform:scale(1.06);box-shadow:0 6px 28px rgba(26,86,219,.45)}
.crop-fab svg{width:24px;height:24px;transition:transform .2s}
.crop-fab.open svg{transform:rotate(90deg)}
.crop-panel{position:fixed;bottom:90px;right:24px;width:400px;max-width:calc(100vw - 48px);
  height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:20px;
  box-shadow:0 12px 48px rgba(0,0,0,.18);display:none;flex-direction:column;z-index:9001;
  overflow:hidden;font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  animation:cropSlideUp .3s cubic-bezier(.4,0,.2,1)}
.crop-panel.open{display:flex}
@keyframes cropSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.crop-head{background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;padding:18px 20px;
  display:flex;align-items:center;justify-content:space-between}
.crop-head-left{display:flex;align-items:center;gap:10px}
.crop-avatar{width:32px;height:32px;border-radius:10px;background:rgba(255,255,255,.15);
  display:flex;align-items:center;justify-content:center;font-size:14px}
.crop-head h4{margin:0;font-size:14px;font-weight:600}
.crop-head p{margin:2px 0 0;font-size:11px;color:rgba(255,255,255,.6)}
.crop-close{background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;
  font-size:20px;padding:4px;border-radius:6px;transition:all .15s}
.crop-close:hover{color:#fff;background:rgba(255,255,255,.1)}
.crop-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}
.crop-msg{max-width:88%;padding:12px 16px;border-radius:16px;font-size:14px;line-height:1.6;
  animation:cropFade .3s ease}
@keyframes cropFade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.crop-msg.bot{background:#f1f5f9;color:#1e293b;align-self:flex-start;border-bottom-left-radius:4px}
.crop-msg.user{background:#1a56db;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.crop-msg.bot a{color:#1a56db;font-weight:500}
.crop-typing{display:flex;gap:4px;padding:12px 16px;align-self:flex-start}
.crop-typing span{width:7px;height:7px;border-radius:50%;background:#94a3b8;
  animation:cropBounce .6s infinite alternate}
.crop-typing span:nth-child(2){animation-delay:.15s}
.crop-typing span:nth-child(3){animation-delay:.3s}
@keyframes cropBounce{to{transform:translateY(-4px);background:#64748b}}
.crop-suggestions{display:flex;flex-wrap:wrap;gap:6px;padding:0 16px 12px}
.crop-suggest{background:#f8fafc;border:1px solid #e2e8f0;color:#475569;padding:8px 14px;
  border-radius:20px;font-size:12px;cursor:pointer;transition:all .15s;font-family:inherit;
  white-space:nowrap}
.crop-suggest:hover{background:#eff6ff;border-color:#bfdbfe;color:#1a56db}
.crop-input-area{display:flex;border-top:1px solid #f1f5f9;padding:12px;gap:8px;background:#fff}
.crop-input{flex:1;border:1.5px solid #e2e8f0;border-radius:12px;padding:10px 14px;
  font-size:14px;outline:none;font-family:inherit;color:#1e293b;transition:border-color .15s}
.crop-input:focus{border-color:#1a56db}
.crop-input::placeholder{color:#94a3b8}
.crop-send{background:#1a56db;color:#fff;border:none;border-radius:10px;padding:10px 16px;
  cursor:pointer;font-weight:600;font-size:13px;transition:all .15s;font-family:inherit}
.crop-send:hover{background:#1e40af}
.crop-send:disabled{opacity:.4;cursor:not-allowed}
@media(max-width:480px){.crop-panel{width:calc(100vw - 16px);right:8px;bottom:76px;height:calc(100vh - 96px);border-radius:16px}}
`;
document.head.appendChild(style);

// Detect page context for smart suggestions
var pageContext = detectPageContext();
var chatHistory = [];

function detectPageContext() {
  var path = window.location.pathname;
  var title = document.title || '';
  if (path === '/' || path === '/index.html') return { page: 'home', greeting: "Welcome to PA CROP Services. I'm here to help you understand your PA compliance needs. What brings you here today?", suggestions: ["What is a CROP?", "Do I need a registered office?", "What are your plans?", "Am I at risk for 2027?"] };
  if (path.includes('annual-report')) return { page: 'annual-report', greeting: "I see you're reading about PA annual reports. These are critical — miss one and your entity could face dissolution. What's your situation?", suggestions: ["When is my report due?", "What happens if I miss it?", "Can you file it for me?", "What's the $7 fee for?"] };
  if (path.includes('2027') || path.includes('dissolution')) return { page: 'deadline', greeting: "The 2027 deadline is serious — especially for foreign entities that can't reinstate once dissolved. How can I help you prepare?", suggestions: ["Am I at risk?", "What exactly happens in 2027?", "How do I protect my entity?", "I'm a foreign entity"] };
  if (path.includes('what-is') || path.includes('crop')) return { page: 'education', greeting: "Great question about CROPs. Pennsylvania is one of the few states with this system. I can explain exactly what it means for your business.", suggestions: ["CROP vs registered agent?", "Why do I need one?", "How much does it cost?", "How do I switch?"] };
  if (path.includes('vs-') || path.includes('comparison')) return { page: 'comparison', greeting: "Comparing providers? Smart. I can give you the straight facts about how we differ — no spin.", suggestions: ["What makes you different?", "Why should I switch?", "Is switching complicated?", "What about pricing?"] };
  if (path.includes('registered-office-')) return { page: 'city', greeting: "Looking for a registered office in Pennsylvania? Whether your entity is here or anywhere in PA, we've got you covered statewide from our Erie office.", suggestions: ["Do you cover my area?", "What's included?", "How fast to set up?", "What does it cost?"] };
  if (path.includes('partners')) return { page: 'partner', greeting: "Interested in our partner program? If you're a CPA or attorney with PA business clients, this could be a nice revenue stream for you.", suggestions: ["How does the commission work?", "What do my clients get?", "How do I sign up?", "Is there a minimum?"] };
  if (path.includes('compliance-check')) return { page: 'check', greeting: "Taking the compliance check — good move. Once you see your score, I can help you understand what it means and what to do next.", suggestions: ["What does my score mean?", "Am I in trouble?", "What should I do first?", "How much will this cost?"] };
  return { page: 'general', greeting: "Hi there! I'm the PA CROP Services compliance team. I can help with anything about PA registered offices, annual reports, or entity compliance. What's on your mind?", suggestions: ["What is a CROP?", "Do I need one?", "What does it cost?", "Talk to someone"] };
}

// Build UI
var fab = document.createElement('button');
fab.className = 'crop-fab';
fab.setAttribute('aria-label', 'Chat with compliance team');
fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
document.body.appendChild(fab);

var panel = document.createElement('div');
panel.className = 'crop-panel';
panel.innerHTML = '<div class="crop-head"><div class="crop-head-left"><div class="crop-avatar">PA</div><div><h4>PA CROP Services</h4><p>Compliance team \u2022 Online now</p></div></div><button class="crop-close" aria-label="Close chat">\u00d7</button></div><div class="crop-body" id="crop-body"></div><div class="crop-suggestions" id="crop-suggests"></div><div class="crop-input-area"><input class="crop-input" id="crop-input" placeholder="Ask anything about PA compliance\u2026" autocomplete="off"><button class="crop-send" id="crop-send">Send</button></div>';
document.body.appendChild(panel);

var body = panel.querySelector('#crop-body');
var suggestsEl = panel.querySelector('#crop-suggests');
var input = panel.querySelector('#crop-input');
var sendBtn = panel.querySelector('#crop-send');
var isOpen = false;

fab.onclick = function() {
  isOpen = !isOpen;
  panel.classList.toggle('open', isOpen);
  fab.classList.toggle('open', isOpen);
  if (isOpen && body.children.length === 0) {
    // First open: show greeting with typing effect
    showTyping();
    setTimeout(function() {
      removeTyping();
      typeMessage(pageContext.greeting, 'bot');
      showSuggestions(pageContext.suggestions);
    }, 800);
    input.focus();
  }
};

panel.querySelector('.crop-close').onclick = function() {
  isOpen = false;
  panel.classList.remove('open');
  fab.classList.remove('open');
};

function showSuggestions(items) {
  suggestsEl.innerHTML = '';
  items.forEach(function(text) {
    var btn = document.createElement('button');
    btn.className = 'crop-suggest';
    btn.textContent = text;
    btn.onclick = function() { sendMessage(text); };
    suggestsEl.appendChild(btn);
  });
}

function addMessage(text, role) {
  var div = document.createElement('div');
  div.className = 'crop-msg ' + role;
  div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  return div;
}

function typeMessage(text, role) {
  var div = document.createElement('div');
  div.className = 'crop-msg ' + role;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;

  var formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
  var words = formatted.split(/(?<=\s)/);
  var i = 0;

  function typeNext() {
    if (i < words.length) {
      div.innerHTML += words[i];
      i++;
      body.scrollTop = body.scrollHeight;
      var delay = 18 + Math.random() * 22;
      if (words[i-1] && (words[i-1].includes('.') || words[i-1].includes('?') || words[i-1].includes('!'))) delay += 80;
      if (words[i-1] && words[i-1].includes(',')) delay += 40;
      setTimeout(typeNext, delay);
    }
  }
  typeNext();
  return div;
}

function showTyping() {
  var div = document.createElement('div');
  div.className = 'crop-typing';
  div.id = 'crop-typing';
  div.innerHTML = '<span></span><span></span><span></span>';
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function removeTyping() {
  var el = document.getElementById('crop-typing');
  if (el) el.remove();
}

async function sendMessage(text) {
  if (!text) return;
  suggestsEl.innerHTML = '';
  addMessage(text, 'user');
  input.value = '';
  sendBtn.disabled = true;
  showTyping();

  chatHistory.push({ role: 'user', content: text });

  try {
    var res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: chatHistory.slice(-6),
        stream: true
      })
    });

    removeTyping();

    if (res.headers.get('content-type')?.includes('text/event-stream')) {
      // Streaming response
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var msgDiv = document.createElement('div');
      msgDiv.className = 'crop-msg bot';
      body.appendChild(msgDiv);
      var fullText = '';
      var buffer = '';

      while (true) {
        var result = await reader.read();
        if (result.done) break;
        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (var line of lines) {
          if (line.startsWith('data: ')) {
            var data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              var parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                msgDiv.innerHTML = fullText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                body.scrollTop = body.scrollHeight;
              }
            } catch(e) {}
          }
        }
      }
      chatHistory.push({ role: 'assistant', content: fullText });
    } else {
      // Non-streaming fallback
      var data = await res.json();
      if (data.reply) {
        typeMessage(data.reply, 'bot');
        chatHistory.push({ role: 'assistant', content: data.reply });
      }
    }
  } catch(e) {
    removeTyping();
    addMessage("I'm having trouble connecting right now. You can reach us directly at <a href='mailto:hello@pacropservices.com'>hello@pacropservices.com</a> or <a href='tel:8144800989'>814-480-0989</a>.", 'bot');
  }

  sendBtn.disabled = false;
  input.focus();
}

input.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && input.value.trim()) sendMessage(input.value.trim());
});
sendBtn.addEventListener('click', function() {
  if (input.value.trim()) sendMessage(input.value.trim());
});

})();
