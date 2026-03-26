

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


// ── Emailit Fallback Notifier ──
async function _notifyIke(subject, body) {
  const key = process.env.EMAILIT_API_KEY;
  if (!key) { console.warn('EMAILIT_API_KEY not set — notification skipped:', subject); return; }
  try {
    await fetch('https://api.emailit.com/v1/emails', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'alerts@pacropservices.com',
        to: 'hello@pacropservices.com',
        subject: '[PA CROP] ' + subject,
        html: '<div style="font-family:sans-serif;max-width:600px">' + body + '</div>'
      })
    });
  } catch (e) { console.error('Emailit fallback failed:', e.message); }
}

export default async function handler(req, res) {
  // Rate limit: Voice recording — 20/min
  if (_rateLimit(req, res, 20, 60000)) return;

  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  const { RecordingUrl, TranscriptionText, From, CallSid } = req.body || {};
  
  // Try AI transcription if Twilio didn't provide one
  let transcription = TranscriptionText || '';
  if (!transcription && RecordingUrl && process.env.GROQ_API_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 200,
          messages: [
            { role: 'system', content: 'A voicemail was received at a PA business compliance service. The recording URL is provided but cannot be played. Generate a placeholder note indicating a voicemail was received that needs manual transcription. Be brief.' },
            { role: 'user', content: `Voicemail from ${From || 'unknown number'} at ${new Date().toLocaleTimeString()}. Recording: ${RecordingUrl}` }
          ]
        })
      });
      const groqData = await groqRes.json();
      transcription = '[AI note] ' + (groqData?.choices?.[0]?.message?.content || 'Voicemail received — manual transcription needed');
    } catch(e) { transcription = 'Transcription unavailable — listen to recording'; }
  }

  // Create SuiteDash activity for the call
  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  if (From && SD_PUBLIC && SD_SECRET) {
    try {
      const sdSearch = await fetch(`https://app.suitedash.com/secure-api/contacts?limit=500&role=client`, {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
      });
      const clients = (await sdSearch.json())?.data || [];
      const caller = clients.find(c => c.phone?.includes(From?.replace('+1','')) || c.custom_fields?.phone?.includes(From?.replace('+1','')));
      if (caller?.id) {
        await fetch(`https://app.suitedash.com/secure-api/contacts/${caller.id}`, {
          method: 'PUT',
          headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ custom_fields: { last_voicemail: new Date().toISOString(), last_voicemail_text: transcription.slice(0, 200) } })
        });
      }
    } catch(e) { /* continue */ }
  }

  // Log voicemail and notify via n8n
  try {
    const vmRes = await fetch('https://n8n.audreysplace.place/webhook/crop-voicemail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: From, callSid: CallSid, recordingUrl: RecordingUrl, transcription, timestamp: new Date().toISOString() })
    }).catch(() => null);
    if (!vmRes || !vmRes.ok) {
      await _notifyIke('New Voicemail',
        '<h2>📞 Voicemail Received</h2>' +
        '<p><strong>From:</strong> ' + (From || 'unknown') + '</p>' +
        '<p><strong>Recording:</strong> <a href="' + (RecordingUrl || '#') + '">Listen</a></p>' +
        '<p><strong>Transcription:</strong> ' + (transcription || 'not available') + '</p>' +
        '<p><strong>Time:</strong> ' + new Date().toISOString() + '</p>'
      );
    }
  } catch (e) {
    console.error('Voicemail error:', e);
    await _notifyIke('Voicemail Error', '<p>Voicemail processing failed: ' + (e.message || 'unknown') + '</p>').catch(e => console.error('Silent failure:', e.message));
  }

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Thank you for your message. We will get back to you within one business day. Goodbye.</Say>
</Response>`);
}
