// PA CROP Services — Automated Article Pipeline
// GET /api/auto-article?key=ADMIN (generates + publishes)
// POST /api/auto-article { topic } (specific topic)
// Uses WriterZen-style keyword research via Groq, then generates + publishes

import { isAdminRequest } from './services/auth.js';

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Unauthorized' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'Groq not configured' });

  const requestedTopic = req.body?.topic;
  const results = { steps: [] };

  try {
    // Step 1: Topic research (or use provided topic)
    let topic, slug, keywords;
    if (requestedTopic) {
      topic = requestedTopic;
      slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
      keywords = [topic];
      results.steps.push({ step: 'topic_selection', status: 'done', source: 'manual', topic });
    } else {
      const topicRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 300,
          messages: [
            { role: 'system', content: 'You are an SEO content strategist for a Pennsylvania CROP (Commercial Registered Office Provider) service. Generate ONE article topic that PA business owners would search for. Focus on: annual report requirements, entity compliance, dissolution risks, registered office obligations, PA DOS procedures. Respond ONLY with JSON: {"topic":"article title","slug":"url-slug","keywords":["kw1","kw2","kw3"]}' },
            { role: 'user', content: `Today is ${new Date().toLocaleDateString()}. Generate a timely PA compliance article topic that would rank well in Google. Consider seasonal relevance (annual report deadlines, year-end compliance, new year filings).` }
          ]
        })
      });
      const topicData = await topicRes.json();
      const topicText = topicData?.choices?.[0]?.message?.content || '';
      try {
        const parsed = JSON.parse(topicText.replace(/```json|```/g, '').trim());
        topic = parsed.topic;
        slug = parsed.slug;
        keywords = parsed.keywords || [];
      } catch (e) {
        topic = 'Pennsylvania Business Compliance Update ' + new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        slug = 'pa-compliance-update-' + new Date().toISOString().slice(0, 7);
        keywords = ['PA compliance', 'annual report', 'CROP'];
      }
      results.steps.push({ step: 'topic_research', status: 'done', topic, slug, keywords });
    }

    // Step 2: Generate article via existing API
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://pacropservices.com';
    const genRes = await fetch(`${baseUrl}/api/generate-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
      body: JSON.stringify({ topic, keywords: keywords.join(', '), tone: 'professional, helpful, authoritative', length: 1500 })
    });
    const genData = await genRes.json();
    results.steps.push({ step: 'article_generation', status: genData.content ? 'done' : 'error', wordCount: genData.content?.split(/\s+/).length || 0 });

    if (!genData.content) {
      return res.status(500).json({ success: false, error: 'Article generation failed', ...results });
    }

    // Step 3: Publish via existing API
    const pubRes = await fetch(`${baseUrl}/api/publish-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
      body: JSON.stringify({ title: topic, slug, content: genData.content, keywords })
    });
    const pubData = await pubRes.json();
    results.steps.push({ step: 'publish', status: pubData.success ? 'done' : 'warning', url: pubData.url || `/articles/${slug}` });

    // Step 4: Generate social media posts from article
    const socialRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', max_tokens: 500,
        messages: [
          { role: 'system', content: 'Generate social media posts for a PA CROP service article. Respond ONLY with JSON: {"linkedin":"post text","facebook":"post text","twitter":"post text (under 280 chars)"}' },
          { role: 'user', content: `Article title: "${topic}"\n\nFirst 300 words: ${genData.content.slice(0, 1200)}\n\nWebsite: pacropservices.com` }
        ]
      })
    });
    const socialData = await socialRes.json();
    let socialPosts = {};
    try {
      socialPosts = JSON.parse((socialData?.choices?.[0]?.message?.content || '{}').replace(/```json|```/g, '').trim());
    } catch (e) { /* skip social if parse fails */ }
    results.steps.push({ step: 'social_posts', status: Object.keys(socialPosts).length > 0 ? 'done' : 'warning', posts: socialPosts });
    results.socialPosts = socialPosts;

    // Step 5: Generate newsletter blurb
    const nlRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', max_tokens: 200,
        messages: [
          { role: 'system', content: 'Write a 2-sentence newsletter blurb for this article. Include a call to read the full article. Keep it friendly and professional.' },
          { role: 'user', content: `Article: "${topic}"` }
        ]
      })
    });
    const nlData = await nlRes.json();
    results.newsletterBlurb = nlData?.choices?.[0]?.message?.content || '';
    results.steps.push({ step: 'newsletter_blurb', status: 'done' });

    results.article = { topic, slug, url: `https://pacropservices.com/${slug}`, keywords };
    return res.status(200).json({ success: true, ...results });

  } catch (e) {
    return res.status(500).json({ error: e.message, ...results });
  }
}
