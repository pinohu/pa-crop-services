// PA CROP Services — SEO Article Generator
// POST /api/generate-article { keyword, angle, targetWordCount }
// Generates PA compliance articles in brand voice

import { isAdminRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('generate-article');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  if (!isAdminRequest(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { keyword, angle, targetWordCount = 1500 } = req.body || {};
  if (!keyword) return res.status(400).json({ success: false, error: 'keyword required' });

  const GROQ_KEY = process.env.GROQ_API_KEY;

  const prompt = `Write an SEO article for PA CROP Services (pacropservices.com).

TARGET KEYWORD: ${keyword}
ANGLE: ${angle || 'informational, helpful guide for PA business owners'}
TARGET LENGTH: ~${targetWordCount} words

BRAND VOICE:
- Professional but accessible — not legal jargon, not too casual
- Expert authority — cite PA statutes (15 Pa. C.S.) when relevant
- Practical — give actionable steps, not just theory
- Author: Ikechukwu P.N. Ohu, PhD — PA Notary Public, IRS Enrolled Agent

STRUCTURE:
1. Strong H1 (60-70 chars, includes primary keyword)
2. Meta description (150-160 chars)
3. Opening paragraph that answers the query directly
4. 3-5 H2 sections with substantive content
5. FAQ section (3-4 questions in FAQPage schema format)
6. CTA mentioning PA CROP Services naturally

INTERNAL LINKS TO INCLUDE (use naturally in text):
- /what-is-a-pennsylvania-crop
- /pa-annual-report-requirement-guide
- /pa-2027-dissolution-deadline
- /compliance-check
- /how-to-change-registered-office-pennsylvania

Respond in JSON:
{
  "title": "H1 title",
  "metaDescription": "150-160 char meta description",
  "slug": "url-slug-with-dashes",
  "content": "Full HTML article body (h2, p, ul/li tags — no h1, no wrapper)",
  "faqs": [{"question": "...", "answer": "..."}],
  "wordCount": approximate_word_count,
  "primaryKeyword": "main keyword",
  "secondaryKeywords": ["list", "of", "related", "terms"]
}`;

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'You are an expert SEO content writer specializing in Pennsylvania business compliance. Write authoritative, helpful content. Respond only in valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      })
    });

    const data = await groqRes.json();
    const reply = data.choices?.[0]?.message?.content || '{}';
    
    let parsed;
    try {
      parsed = JSON.parse(reply);
    } catch {
      return res.status(500).json({ success: false, error: 'Failed to parse article' });
    }

    return res.status(200).json({
      success: true,
      ...parsed,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    log.error('article_gen_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'Generation failed' });
  }
}
