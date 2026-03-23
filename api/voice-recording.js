

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

  res.setHeader('Access-Control-Allow-Origin', '*');
  const { RecordingUrl, TranscriptionText, From, CallSid } = req.body || {};
  
  // Log voicemail and notify via n8n
  try {
    const vmRes = await fetch('https://n8n.audreysplace.place/webhook/crop-voicemail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: From, callSid: CallSid, recordingUrl: RecordingUrl, transcription: TranscriptionText, timestamp: new Date().toISOString() })
    }).catch(() => null);
    if (!vmRes || !vmRes.ok) {
      await _notifyIke('New Voicemail',
        '<h2>📞 Voicemail Received</h2>' +
        '<p><strong>From:</strong> ' + (From || 'unknown') + '</p>' +
        '<p><strong>Recording:</strong> <a href="' + (RecordingUrl || '#') + '">Listen</a></p>' +
        '<p><strong>Transcription:</strong> ' + (TranscriptionText || 'not available') + '</p>' +
        '<p><strong>Time:</strong> ' + new Date().toISOString() + '</p>'
      );
    }
  } catch (e) {
    console.error('Voicemail error:', e);
    await _notifyIke('Voicemail Error', '<p>Voicemail processing failed: ' + (e.message || 'unknown') + '</p>').catch(() => {});
  }

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Thank you for your message. We will get back to you within one business day. Goodbye.</Say>
</Response>`);
}
