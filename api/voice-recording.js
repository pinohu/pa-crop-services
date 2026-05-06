import { setCors, verifyTwilioSignature } from './services/auth.js';
import { checkRateLimit, getClientIp } from './_ratelimit.js';
import { createLogger } from './_log.js';
import { notifyOps } from './services/email.js';

const log = createLogger('voice-recording');
const _notifyIke = (subject, body) => notifyOps(subject, body);

// HTML-escape helper for embedding caller-controlled values in admin-notification HTML.
function escHtml(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default async function handler(req, res) {
  setCors(req, res);
  // Rate limit: Voice recording — 20/min
  const blocked = await checkRateLimit(getClientIp(req), 'voice-recording', 20, '60s');
  if (blocked) { res.setHeader('Retry-After', String(blocked.retryAfter)); return res.status(429).json({ success: false, error: 'Too many requests' }); }

  // Twilio webhook signature verification — without this, anyone can fire arbitrary
  // RecordingUrl values into Ike's inbox and into SuiteDash custom fields.
  if (!verifyTwilioSignature(req)) {
    log.warn('twilio_signature_rejected', { path: '/api/voice-recording', ip: getClientIp(req) });
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

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
    }).catch(() => null); // eslint-skip:silent-catch — caller checks (!vmRes || !vmRes.ok) and falls back to notifyOps
    if (!vmRes || !vmRes.ok) {
      // Only allow Twilio-style media URLs in the embedded link to prevent
      // open-mailer abuse if signature verification is ever bypassed in future.
      const recIsSafe = typeof RecordingUrl === 'string'
        && /^https:\/\/api\.twilio\.com\/2010-04-01\/Accounts\/[A-Z0-9]+\/Recordings\/[A-Z0-9]+/i.test(RecordingUrl);
      const recHref = recIsSafe ? RecordingUrl : '#';
      await _notifyIke('New Voicemail',
        '<h2>📞 Voicemail Received</h2>' +
        '<p><strong>From:</strong> ' + escHtml(From || 'unknown') + '</p>' +
        '<p><strong>Recording:</strong> <a href="' + escHtml(recHref) + '">Listen</a>' + (recIsSafe ? '' : ' <em>(URL not from Twilio — link suppressed)</em>') + '</p>' +
        '<p><strong>Transcription:</strong> ' + escHtml(transcription || 'not available') + '</p>' +
        '<p><strong>Time:</strong> ' + new Date().toISOString() + '</p>'
      );
    }
  } catch (e) {
    log.error('voicemail_error', {}, e instanceof Error ? e : new Error(String(e)));
    await _notifyIke('Voicemail Error', '<p>Voicemail processing failed: ' + (e.message || 'unknown') + '</p>').catch(e => log.warn('external_call_failed', { error: e.message }));
  }

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Thank you for your message. We will get back to you within one business day. Goodbye.</Say>
</Response>`);
}
