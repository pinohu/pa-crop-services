export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response><Say voice="Polly.Matthew">Thank you for calling PA CROP Services. Please try again.</Say></Response>`);
  }

  const { SpeechResult, CallSid, From, To, Digits } = req.body || {};

  // First interaction — no speech yet, greet the caller
  if (!SpeechResult && !Digits) {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="5" speechTimeout="auto" action="/api/voice" method="POST" language="en-US">
    <Say voice="Polly.Matthew">Thank you for calling PA CROP Services, Pennsylvania's compliance team. How can I help you today?</Say>
  </Gather>
  <Say voice="Polly.Matthew">I did not hear anything. If you need help, please call back or visit pacropservices.com. Goodbye.</Say>
</Response>`);
  }

  // Caller spoke — send to Groq for AI response
  const userMessage = SpeechResult || '';

  // Build conversation context
  const systemPrompt = `You are the PA CROP Services phone concierge. You answer calls for a licensed Pennsylvania Commercial Registered Office Provider. You sound like a warm, knowledgeable advisor.

RULES:
- Keep answers to 2-3 sentences maximum. This is a phone call, not a lecture.
- Never say you are an AI. You are the compliance team.
- Use the caller's name if they give it.
- For legal or tax questions say: "That is really a question for your attorney or CPA. Would you like me to transfer you to our team?"
- If they want to speak to a person, say: "Let me transfer you now." 
- If they want to sign up, say: "I would love to help you get started. Visit pacropservices.com or I can transfer you to our team to walk you through it."

WHAT YOU KNOW:
- PA CROP Services is licensed under 15 Pa. C.S. section 109
- Address: 924 W 23rd St, Erie, PA 16502
- Phone: 814-616-3024
- Every PA entity needs a registered office on file with the Department of State
- Annual reports due September 30 each year, $7 fee, file at file.dos.pa.gov
- Starting 2027, entities that have not filed face dissolution. Foreign entities cannot reinstate.
- Plans: Compliance Only $99/year, Business Starter $199/year, Business Pro $349/year, Business Empire $699/year
- All plans include registered office, same-day document scanning, compliance reminders at 90/60/30/14/7 days, entity monitoring, client portal
- Business Pro and Empire include annual report filing
- Website: pacropservices.com

GOALS:
1. Answer their question concisely
2. Learn their name and entity name if natural
3. Offer to help them get started or transfer to a person
4. Never end without a clear next step`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${process.env.GROQ_API_KEY}\`,
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

    const data = await groqRes.json();
    let aiResponse = data.choices?.[0]?.message?.content || 'I apologize, I am having trouble right now. Please call back or visit pacropservices.com for help.';

    // Clean response for speech
    aiResponse = aiResponse.replace(/[*#_]/g, '').replace(/\n/g, ' ').trim();

    // Check if caller wants to be transferred
    const wantsTransfer = /transfer|speak to|talk to|real person|human|someone else/i.test(userMessage);
    
    if (wantsTransfer) {
      res.setHeader('Content-Type', 'text/xml');
      return res.status(200).send(\`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Absolutely, let me connect you with our team right now. One moment please.</Say>
  <Dial timeout="30" callerId="\${To || '+18146163024'}">
    <Number>+18144800989</Number>
  </Dial>
  <Say voice="Polly.Matthew">I am sorry, our team is not available right now. Please leave a message after the tone, or call back during business hours, Monday through Friday, 9 AM to 5 PM Eastern.</Say>
  <Record maxLength="120" action="/api/voice-recording" transcribe="true" />
</Response>\`);
    }

    // Continue conversation
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(\`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" timeout="6" speechTimeout="auto" action="/api/voice" method="POST" language="en-US">
    <Say voice="Polly.Matthew">\${aiResponse.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}</Say>
  </Gather>
  <Say voice="Polly.Matthew">It sounds like we got disconnected. Feel free to call back anytime at 814-616-3024, or visit pacropservices.com. Have a great day.</Say>
</Response>\`);

  } catch (err) {
    console.error('Voice AI error:', err);
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(\`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">I apologize, I am experiencing a technical issue. Let me connect you with our team.</Say>
  <Dial timeout="30">
    <Number>+18144800989</Number>
  </Dial>
</Response>\`);
  }
}
