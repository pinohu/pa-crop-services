// PA CROP Services — Article Publisher
// POST /api/publish-article { slug, title, metaDescription, content, faqs }
// Takes AI-generated article and creates the HTML page on GitHub

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== (process.env.ADMIN_SECRET_KEY || 'CROP-ADMIN-2026-IKE')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { slug, title, metaDescription, content, faqs = [], publish = false } = req.body || {};
  if (!slug || !title || !content) return res.status(400).json({ error: 'slug, title, content required' });

  // Build the HTML page
  const faqSchema = faqs.length ? JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(f => ({
      "@type": "Question", "name": f.question,
      "acceptedAnswer": { "@type": "Answer", "text": f.answer }
    }))
  }) : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — PA CROP Services</title>
<meta name="description" content="${metaDescription || ''}">
<link rel="canonical" href="https://pacropservices.com/${slug}">
<meta property="og:title" content="${title}"><meta property="og:description" content="${metaDescription || ''}">
<meta property="og:url" content="https://pacropservices.com/${slug}">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;color:#1E2333;line-height:1.7}.container{max-width:720px;margin:0 auto;padding:0 24px}nav{padding:16px 0;border-bottom:1px solid #eee;position:sticky;top:0;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);z-index:100}nav .container{display:flex;justify-content:space-between;align-items:center}.logo{font-family:'DM Serif Display',serif;font-size:20px;color:#1E2333}.logo span{color:#534AB7}article{padding:60px 0}article h1{font-family:'DM Serif Display',serif;font-size:clamp(28px,4vw,40px);margin-bottom:16px}article h2{font-family:'DM Serif Display',serif;font-size:24px;margin:32px 0 12px}article p{margin-bottom:16px;font-size:16px;color:#374151}article a{color:#534AB7}article ul,article ol{margin:0 0 16px 20px}article li{margin-bottom:8px;font-size:15px;color:#374151}.faq{background:#F7F6F3;padding:48px 0;margin-top:40px}.faq h2{text-align:center;margin-bottom:24px}.faq-item{background:#fff;border:1px solid #eee;border-radius:12px;padding:20px;margin-bottom:12px;max-width:720px;margin-left:auto;margin-right:auto}.faq-q{font-weight:600;font-size:15px}.faq-a{margin-top:8px;font-size:14px;color:#6B7280;line-height:1.7}.cta{text-align:center;padding:48px 0}.cta a{background:#534AB7;color:#fff;padding:14px 32px;border-radius:8px;font-weight:600;font-size:16px;text-decoration:none;display:inline-block}footer{background:#1E2333;color:rgba(255,255,255,.6);padding:40px 0;font-size:13px;text-align:center}footer a{color:rgba(255,255,255,.8)}</style>
${faqSchema ? '<script type="application/ld+json">' + faqSchema + '</script>' : ''}
<script defer data-domain="pacropservices.com" src="https://plausible.io/js/script.js"></script>
<script type="text/javascript">(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","vzhtq2nted");</script>
</head>
<body>
<nav><div class="container"><a href="/" class="logo">PA <span>CROP</span> Services</a><a href="/#pricing" style="background:#534AB7;color:#fff;padding:8px 20px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none">Get started</a></div></nav>
<article><div class="container"><h1>${title}</h1>${content}</div></article>
${faqs.length ? '<section class="faq"><div class="container"><h2>Frequently asked questions</h2>' + faqs.map(f => '<div class="faq-item"><div class="faq-q">' + f.question + '</div><div class="faq-a">' + f.answer + '</div></div>').join('') + '</div></section>' : ''}
<section class="cta"><div class="container"><p style="font-size:18px;margin-bottom:16px;color:#374151">Ready to protect your PA business?</p><a href="/#pricing">View plans from $99/year</a></div></section>
<footer><div class="container"><p>&copy; ${new Date().getFullYear()} PA CROP Services (PA Registered Office Services, LLC)</p><p style="margin-top:8px"><a href="/">Home</a> &bull; <a href="/#pricing">Pricing</a> &bull; <a href="/portal">Client Login</a></p></div></footer>
<script src="/embed/chatbot.js" defer></script>
</body></html>`;

  if (!publish) {
    return res.status(200).json({
      success: true,
      slug,
      title,
      preview: true,
      htmlLength: html.length,
      message: 'Article generated. Set publish=true to push to GitHub.'
    });
  }

  // Push to GitHub
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    return res.status(200).json({ success: true, slug, preview: true, message: 'GitHub token not configured. Article ready for manual publish.' });
  }

  try {
    const ghUrl = `https://api.github.com/repos/pinohu/pa-crop-services/contents/public/${slug}.html`;
    const ghRes = await fetch(ghUrl, {
      method: 'PUT',
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Publish article: ${title}`,
        content: btoa(unescape(encodeURIComponent(html)))
      })
    });
    const ghData = await ghRes.json();
    return res.status(200).json({ success: true, slug, published: true, sha: ghData?.commit?.sha?.slice(0,10) });
  } catch (e) {
    return res.status(200).json({ success: true, slug, preview: true, error: e.message });
  }
}
