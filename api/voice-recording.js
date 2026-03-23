export default async function handler(req, res) {
  const { RecordingUrl, TranscriptionText, From, CallSid } = req.body || {};
  
  // Log voicemail and notify via n8n
  try {
    await fetch('https://n8n.audreysplace.place/webhook/crop-voicemail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: From,
        callSid: CallSid,
        recordingUrl: RecordingUrl,
        transcription: TranscriptionText,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    console.error('Voicemail webhook error:', e);
  }

  res.setHeader('Content-Type', 'text/xml');
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Matthew">Thank you for your message. We will get back to you within one business day. Goodbye.</Say>
</Response>`);
}
