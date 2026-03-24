
// ── Rate Limiter (in-memory, per-instance) ──
const _rl = new Map();
function _rateLimit(req, res, max, win) {
  const ip = (req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.headers['x-real-ip'] || 'unknown';
  const k = ip + ':' + (req.url||'').split('?')[0];
  const now = Date.now();
  let d = _rl.get(k);
  if (!d || now - d.s > win) { _rl.set(k, {c:1,s:now,w:win}); return false; }
  d.c++;
  if (d.c > max) { res.setHeader('Retry-After', String(Math.ceil((d.s+win-now)/1000))); res.status(429).json({error:'Too many requests'}); return true; }
  return false;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Stripe-Signature');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {

  // Rate limit: Voice — 20/min
  if (_rateLimit(req, res, 20, 60000)) return;
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Matthew">Thank you for calling PA CROP Services. Please try again.</Say></Response>');
  }

  const { SpeechResult, CallSid, From, To, Digits } = req.body || {};

  if (!SpeechResult && !Digits) {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      '  <Gather input="speech" timeout="5" speechTimeout="auto" action="/api/voice" method="POST" language="en-US">',
      '    <Say voice="Polly.Matthew">Thank you for calling PA CROP Services, Pennsylvanias compliance team. How can I help you today?</Say>',
      '  </Gather>',
      '  <Say voice="Polly.Matthew">I did not hear anything. If you need help, please call back or visit pacropservices.com. Goodbye.</Say>',
      '</Response>'
    ].join('\n'));
  }

  var userMessage = SpeechResult || '';

  var systemPrompt = 'You are the PA CROP Services phone concierge. You answer calls for a licensed Pennsylvania Commercial Registered Office Provider. You sound like a warm, knowledgeable advisor.\n\nRULES:\n- Keep answers to 2-3 sentences maximum. This is a phone call, not a lecture.\n- Never say you are an AI. You are the compliance team.\n- Use the callers name if they give it.\n- For legal or tax questions say: That is really a question for your attorney or CPA. Would you like me to transfer you to our team?\n- If they want to speak to a person, say: Let me transfer you now.\n- If they want to sign up, say: I would love to help you get started. Visit pacropservices.com or I can transfer you to our team.\n\nWHAT YOU KNOW:\n- PA CROP Services is licensed under 15 Pa. C.S. section 109\n- Address: 924 W 23rd St, Erie, PA 16502\n- Phone: 814-228-2822\n- Every PA entity needs a registered office on file with the Department of State\n- Annual reports due September 30 each year, $7 fee, file at file.dos.pa.gov\n- Starting 2027, entities that have not filed face dissolution. Foreign entities cannot reinstate.\n- Plans: Compliance Only $99/year, Business Starter $199/year, Business Pro $349/year, Business Empire $699/year\n- All plans include registered office, same-day document scanning, compliance reminders, entity monitoring, client portal\n- Business Pro and Empire include annual report filing\n- Website: pacropservices.com\n\nGOALS:\n1. Answer their question concisely\n2. Learn their name and entity name if natural\n3. Offer to help them get started or transfer to a person\n4. Never end without a clear next step';

  try {
    var groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 200,
        temperature: 0.7
      })
    });

    var data = await groqRes.json();
    var aiResponse = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || 'I apologize, I am having trouble right now. Please call back or visit pacropservices.com for help.';

    aiResponse = aiResponse.replace(/[*#_]/g, '').replace(/\n/g, ' ').trim();

    var wantsTransfer = /transfer|speak to|talk to|real person|human|someone else/i.test(userMessage);

    if (wantsTransfer) {
      var transferTo = To || '+18146163024';
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<Response>',
        '  <Say voice="Polly.Matthew">Absolutely, let me connect you with our team right now. One moment please.</Say>',
        '  <Dial timeout="30" callerId="' + transferTo + '">',
        '    <Number>+18144800989</Number>',
        '  </Dial>',
        '  <Say voice="Polly.Matthew">I am sorry, our team is not available right now. Please leave a message after the tone.</Say>',
        '  <Record maxLength="120" action="/api/voice-recording" transcribe="true" />',
        '</Response>'
      ].join('\n'));
    }

    var safeResponse = aiResponse.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      '  <Gather input="speech" timeout="6" speechTimeout="auto" action="/api/voice" method="POST" language="en-US">',
      '    <Say voice="Polly.Matthew">' + safeResponse + '</Say>',
      '  </Gather>',
      '  <Say voice="Polly.Matthew">It sounds like we got disconnected. Feel free to call back anytime at 814-228-2822, or visit pacropservices.com. Have a great day.</Say>',
      '</Response>'
    ].join('\n'));

  } catch (err) {
    console.error('Voice AI error:', err);
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Response>',
      '  <Say voice="Polly.Matthew">I apologize, I am experiencing a technical issue. Let me connect you with our team.</Say>',
      '  <Dial timeout="30"><Number>+18144800989</Number></Dial>',
      '</Response>'
    ].join('\n'));
  }
}
