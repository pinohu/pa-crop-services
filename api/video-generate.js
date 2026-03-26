// PA CROP Services — Video Generation Trigger
// POST /api/video-generate { articleTitle, articleContent, format }
// Formats article content for Vadoo AI / Fliki video generation
// Returns structured script + API-ready payload for video tools

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('video-generate');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { articleTitle, articleContent, format = 'short' } = req.body || {};
  if (!articleTitle) return res.status(400).json({ success: false, error: 'articleTitle required' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ success: false, error: 'Groq not configured' });

  const durations = { short: '60 seconds (TikTok/Reels)', medium: '3-5 minutes (YouTube)', long: '8-12 minutes (YouTube deep-dive)' };

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', max_tokens: 1000,
        messages: [
          { role: 'system', content: `You create video scripts for a PA compliance service. Target duration: ${durations[format]}. Respond ONLY with JSON: {"title":"video title","hook":"opening 5-second hook","scenes":[{"visual":"description of what to show","narration":"what the AI voice says","duration_seconds":N}],"cta":"end call to action","thumbnail_text":"3-5 words for thumbnail","tags":["tag1","tag2"],"description":"YouTube description (2-3 sentences)"}` },
          { role: 'user', content: `Create a ${format} video script from this article:\n\nTitle: ${articleTitle}\nContent: ${(articleContent || '').slice(0, 2000)}` }
        ]
      })
    });
    const text = (await groqRes.json())?.choices?.[0]?.message?.content || '';
    let script;
    try { script = JSON.parse(text.replace(/```json|```/g, '').trim()); } catch(e) {
      return res.status(500).json({ success: false, error: 'Script generation failed' });
    }

    // Build Vadoo-compatible payload
    const vadooPayload = {
      title: script.title,
      script: script.scenes?.map(s => s.narration).join('\n\n') || '',
      style: 'professional',
      voice: 'en-US-male-professional',
      aspect_ratio: format === 'short' ? '9:16' : '16:9',
      music: 'corporate-ambient',
    };

    // Build Fliki-compatible payload
    const flikiPayload = {
      name: script.title,
      scenes: script.scenes?.map(s => ({ text: s.narration, media_keyword: s.visual })) || [],
      language: 'en-US',
      voice: 'Matthew',
    };

    return res.status(200).json({
      success: true, script, format,
      vadoo_payload: vadooPayload,
      fliki_payload: flikiPayload,
      instructions: {
        vadoo: 'POST to Vadoo AI API with vadoo_payload. Dashboard: app.vadoo.tv',
        fliki: 'POST to Fliki API with fliki_payload. Dashboard: app.fliki.ai',
        manual: 'Copy script.scenes to any video editor for manual production',
      }
    });
  } catch(e) { log.error('api_error', {}, e instanceof Error ? e : new Error(String(e))); return res.status(500).json({ success: false, error: 'internal_error' }); }
}
