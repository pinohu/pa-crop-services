// PA CROP Services — Article Publisher
// POST /api/publish-article { title, slug, html, metaDescription }
// Takes generated article content and creates a static HTML page
// Called from admin dashboard or n8n SEO pipeline

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });

  const { title, slug, html, metaDescription, author } = req.body || {};
  if (!title || !slug || !html) return res.status(400).json({ error: 'title, slug, and html required' });

  try {
  // Build complete article HTML page
  const articleHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — PA CROP Services</title>
<meta name="description" content="${metaDescription || title}">
<meta property="og:type" content="article">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${metaDescription || title}">
<meta property="og:url" content="https://pacropservices.com/${slug}">
<link rel="canonical" href="https://pacropservices.com/${slug}">
<script defer data-domain="pacropservices.com" src="https://plausible.io/js/script.js"><\/script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Article","headline":"${title}","author":{"@type":"Person","name":"${author || 'Dr. Ikechukwu P.N. Ohu'}"},"publisher":{"@type":"Organization","name":"PA CROP Services","url":"https://pacropservices.com"},"datePublished":"${new Date().toISOString().split('T')[0]}"}
<\/script>
</head>
<body>
${html}
<script src="/embed/chatbot.js" defer><\/script>
</body>
</html>`;

  // Return the assembled page — to be pushed to GitHub via admin or n8n
  return res.status(200).json({
    success: true,
    slug,
    html: articleHtml,
    publishUrl: `https://pacropservices.com/${slug}`,
    message: 'Article assembled. Push to GitHub public/ directory to publish.'
  });
  } catch (err) {
    console.error('Publish article error:', err);
    return res.status(500).json({ success: false, error: 'Failed to assemble article' });
  }
}
