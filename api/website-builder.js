// PA CROP Services — /api/website-builder
// Auto-generates professional WordPress pages for new clients using their business information.
// Called by provision.js or n8n after WordPress is installed on a fresh hosting package.
// Auth: admin key only (x-admin-key header), never called directly by clients.

import { isAdminRequest, setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('website-builder');

// ── WordPress REST API helpers ────────────────────────────────────────────────

function buildWpAuth(wpUser, wpPassword) {
  return 'Basic ' + Buffer.from(`${wpUser}:${wpPassword}`).toString('base64');
}

async function wpPost(wpBase, wpAuth, path, body) {
  const res = await fetch(`${wpBase}${path}`, {
    method: 'POST',
    headers: { 'Authorization': wpAuth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WP API ${path} returned ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function checkWordPressReady(wpBase, wpAuth) {
  try {
    const res = await fetch(`${wpBase}/pages?per_page=1`, {
      headers: { 'Authorization': wpAuth },
      signal: AbortSignal.timeout(8000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Content generators ────────────────────────────────────────────────────────

function servicesList(services) {
  return services
    .map(s => `<li style="margin-bottom:8px">${s}</li>`)
    .join('\n');
}

function servicesBlocks(services) {
  const cols = services.map(s => `<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:group {"style":{"spacing":{"padding":{"top":"24px","right":"24px","bottom":"24px","left":"24px"}},"border":{"radius":"8px"}},"backgroundColor":"base-2"} -->
<div class="wp-block-group has-base-2-background-color has-background" style="border-radius:8px;padding-top:24px;padding-right:24px;padding-bottom:24px;padding-left:24px">
<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">${s}</h4><!-- /wp:heading -->
<!-- wp:paragraph --><p>Our ${s.toLowerCase()} solutions are designed to help your business succeed and grow with confidence.</p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->`).join('\n');

  return `<!-- wp:columns {"isStackedOnMobile":true} -->
<div class="wp-block-columns is-not-stacked-on-mobile">
${cols}
</div>
<!-- /wp:columns -->`;
}

function buildHomePage(info) {
  const { businessName, tagline, description, phone, email, address, hours, services } = info;
  const serviceItems = (services || []).slice(0, 6);

  return `<!-- wp:cover {"dimRatio":50,"overlayColor":"contrast","minHeight":520,"contentPosition":"center center","align":"full"} -->
<div class="wp-block-cover alignfull" style="min-height:520px">
<span aria-hidden="true" class="wp-block-cover__background has-contrast-background-color has-background-dim-50 has-background-dim"></span>
<div class="wp-block-cover__inner-container">
<!-- wp:group {"layout":{"type":"constrained","contentSize":"720px"}} -->
<div class="wp-block-group">
<!-- wp:heading {"textAlign":"center","level":1,"style":{"typography":{"fontSize":"clamp(2rem,5vw,3.5rem)","fontWeight":"700"}},"textColor":"base"} -->
<h1 class="wp-block-heading has-text-align-center has-base-color has-text-color">${businessName}</h1>
<!-- /wp:heading -->
<!-- wp:paragraph {"align":"center","style":{"typography":{"fontSize":"1.25rem"}},"textColor":"base"} -->
<p class="has-text-align-center has-base-color has-text-color">${tagline}</p>
<!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"backgroundColor":"primary","textColor":"base","style":{"border":{"radius":"6px"},"spacing":{"padding":{"top":"14px","right":"32px","bottom":"14px","left":"32px"}}}} -->
<div class="wp-block-button"><a class="wp-block-button__link has-base-color has-primary-background-color has-text-color has-background wp-element-button" href="#contact" style="border-radius:6px;padding-top:14px;padding-right:32px;padding-bottom:14px;padding-left:32px">Get In Touch</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
</div>
</div>
<!-- /wp:cover -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"64px","bottom":"64px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:64px;padding-bottom:64px">
<!-- wp:heading {"textAlign":"center","level":2} --><h2 class="wp-block-heading has-text-align-center">What We Do</h2><!-- /wp:heading -->
<!-- wp:paragraph {"align":"center","style":{"typography":{"fontSize":"1.1rem"}}} --><p class="has-text-align-center">${description}</p><!-- /wp:paragraph -->

<!-- wp:spacer {"height":"32px"} --><div style="height:32px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->

${serviceItems.length > 0 ? servicesBlocks(serviceItems) : ''}
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"base-2","style":{"spacing":{"padding":{"top":"64px","bottom":"64px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-base-2-background-color has-background" style="padding-top:64px;padding-bottom:64px">
<!-- wp:heading {"textAlign":"center","level":2} --><h2 class="wp-block-heading has-text-align-center">About Us</h2><!-- /wp:heading -->
<!-- wp:paragraph {"align":"center","style":{"typography":{"fontSize":"1.1rem"},"layout":{"contentSize":"680px"}}} --><p class="has-text-align-center">${description}</p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"64px","bottom":"64px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:64px;padding-bottom:64px" id="contact">
<!-- wp:heading {"textAlign":"center","level":2} --><h2 class="wp-block-heading has-text-align-center">Contact Us</h2><!-- /wp:heading -->
<!-- wp:spacer {"height":"24px"} --><div style="height:24px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->
<!-- wp:columns -->
<div class="wp-block-columns">
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">Get In Touch</h4><!-- /wp:heading -->
<!-- wp:paragraph --><p><strong>Phone:</strong> <a href="tel:${phone.replace(/\D/g,'')}">${phone}</a></p><!-- /wp:paragraph -->
<!-- wp:paragraph --><p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p><!-- /wp:paragraph -->
<!-- wp:paragraph --><p><strong>Address:</strong> ${address}</p><!-- /wp:paragraph -->
<!-- wp:paragraph --><p><strong>Hours:</strong> ${hours}</p><!-- /wp:paragraph -->
</div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">Ready to Get Started?</h4><!-- /wp:heading -->
<!-- wp:paragraph --><p>We're here to help your business grow. Reach out today and let's discuss how we can support you.</p><!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons">
<!-- wp:button {"style":{"border":{"radius":"6px"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="mailto:${email}" style="border-radius:6px">Send Us a Message</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"contrast","style":{"spacing":{"padding":{"top":"24px","bottom":"24px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-contrast-background-color has-background" style="padding-top:24px;padding-bottom:24px">
<!-- wp:paragraph {"align":"center","textColor":"base","style":{"typography":{"fontSize":"0.875rem"}}} -->
<p class="has-text-align-center has-base-color has-text-color">&copy; ${new Date().getFullYear()} ${businessName}. All rights reserved. &nbsp;|&nbsp; Powered by <a href="https://pacropservices.com" style="color:inherit">PA CROP Services</a></p>
<!-- /wp:paragraph -->
</div>
<!-- /wp:group -->`;
}

function buildAboutPage(info) {
  const { businessName, description, industry } = info;
  const industryLabel = industry
    ? industry.charAt(0).toUpperCase() + industry.slice(1)
    : 'Business';

  return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"64px","bottom":"32px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:64px;padding-bottom:32px">
<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">About ${businessName}</h1><!-- /wp:heading -->
<!-- wp:paragraph {"style":{"typography":{"fontSize":"1.15rem"}}} --><p>${description}</p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"base-2","style":{"spacing":{"padding":{"top":"48px","bottom":"48px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-base-2-background-color has-background" style="padding-top:48px;padding-bottom:48px">
<!-- wp:heading {"level":2} --><h2 class="wp-block-heading">Our Mission</h2><!-- /wp:heading -->
<!-- wp:paragraph --><p>At ${businessName}, our mission is to deliver exceptional ${industryLabel.toLowerCase()} services that make a real difference for our clients. We combine deep expertise with a genuine commitment to your success.</p><!-- /wp:paragraph -->

<!-- wp:spacer {"height":"32px"} --><div style="height:32px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->

<!-- wp:columns -->
<div class="wp-block-columns">
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">Our Values</h4><!-- /wp:heading -->
<!-- wp:list -->
<ul class="wp-block-list">
<li>Integrity in everything we do</li>
<li>Client-first approach</li>
<li>Transparent communication</li>
<li>Results-driven solutions</li>
</ul>
<!-- /wp:list -->
</div>
<!-- /wp:column -->
<!-- wp:column -->
<div class="wp-block-column">
<!-- wp:heading {"level":4} --><h4 class="wp-block-heading">Why Choose Us</h4><!-- /wp:heading -->
<!-- wp:list -->
<ul class="wp-block-list">
<li>Experienced ${industryLabel.toLowerCase()} professionals</li>
<li>Personalized service for every client</li>
<li>Local Pennsylvania expertise</li>
<li>Proven track record of results</li>
</ul>
<!-- /wp:list -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"48px","bottom":"48px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:48px;padding-bottom:48px">
<!-- wp:heading {"level":2} --><h2 class="wp-block-heading">Our Team</h2><!-- /wp:heading -->
<!-- wp:paragraph --><p>We are a dedicated team of ${industryLabel.toLowerCase()} professionals committed to helping Pennsylvania businesses thrive. Our team brings years of hands-on experience and a passion for client success.</p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->`;
}

function buildServicesPage(info) {
  const { businessName, services, description, industry } = info;
  const serviceItems = services || [];

  const serviceDetailBlocks = serviceItems.map(s => `<!-- wp:group {"style":{"spacing":{"padding":{"top":"32px","right":"32px","bottom":"32px","left":"32px"}},"border":{"radius":"8px","width":"1px","color":"#e0e0e0"}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group" style="border-radius:8px;border-color:#e0e0e0;border-width:1px;border-style:solid;padding-top:32px;padding-right:32px;padding-bottom:32px;padding-left:32px">
<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">${s}</h3><!-- /wp:heading -->
<!-- wp:paragraph --><p>Our ${s.toLowerCase()} service is tailored to meet the specific needs of your business. We work closely with you to deliver results that align with your goals and drive meaningful growth.</p><!-- /wp:paragraph -->
<!-- wp:buttons -->
<div class="wp-block-buttons">
<!-- wp:button {"className":"is-style-outline","style":{"border":{"radius":"6px"}}} -->
<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button" href="/contact" style="border-radius:6px">Learn More</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->
<!-- wp:spacer {"height":"16px"} --><div style="height:16px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->`).join('\n');

  return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"64px","bottom":"32px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:64px;padding-bottom:32px">
<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">Our Services</h1><!-- /wp:heading -->
<!-- wp:paragraph {"style":{"typography":{"fontSize":"1.1rem"}}} --><p>${description}</p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"32px","bottom":"64px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:32px;padding-bottom:64px">
${serviceDetailBlocks}
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","backgroundColor":"base-2","style":{"spacing":{"padding":{"top":"48px","bottom":"48px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull has-base-2-background-color has-background" style="padding-top:48px;padding-bottom:48px">
<!-- wp:heading {"textAlign":"center","level":2} --><h2 class="wp-block-heading has-text-align-center">Ready to Work With ${businessName}?</h2><!-- /wp:heading -->
<!-- wp:paragraph {"align":"center"} --><p class="has-text-align-center">Contact us today to discuss how our services can support your business goals.</p><!-- /wp:paragraph -->
<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons">
<!-- wp:button {"style":{"border":{"radius":"6px"}}} -->
<div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="/contact" style="border-radius:6px">Contact Us Today</a></div>
<!-- /wp:button -->
</div>
<!-- /wp:buttons -->
</div>
<!-- /wp:group -->`;
}

function buildContactPage(info) {
  const { businessName, phone, email, address, hours } = info;

  return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"64px","bottom":"32px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:64px;padding-bottom:32px">
<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">Contact Us</h1><!-- /wp:heading -->
<!-- wp:paragraph --><p>We'd love to hear from you. Reach out through any of the channels below and we'll be in touch promptly.</p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->

<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"32px","bottom":"64px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:32px;padding-bottom:64px">
<!-- wp:columns {"isStackedOnMobile":true} -->
<div class="wp-block-columns is-not-stacked-on-mobile">
<!-- wp:column {"width":"55%"} -->
<div class="wp-block-column" style="flex-basis:55%">
<!-- wp:heading {"level":2} --><h2 class="wp-block-heading">Send Us a Message</h2><!-- /wp:heading -->
<!-- wp:paragraph --><p>Fill out the form below or email us directly at <a href="mailto:${email}">${email}</a> and we'll respond within one business day.</p><!-- /wp:paragraph -->
<!-- wp:html -->
<form method="post" action="mailto:${email}" enctype="text/plain" style="display:flex;flex-direction:column;gap:16px;margin-top:24px">
  <div style="display:flex;flex-direction:column;gap:4px">
    <label for="contact-name" style="font-weight:600;font-size:0.9rem">Your Name</label>
    <input id="contact-name" type="text" name="name" placeholder="Jane Smith" required style="padding:10px 14px;border:1px solid #ccc;border-radius:6px;font-size:1rem">
  </div>
  <div style="display:flex;flex-direction:column;gap:4px">
    <label for="contact-email" style="font-weight:600;font-size:0.9rem">Email Address</label>
    <input id="contact-email" type="email" name="email" placeholder="jane@example.com" required style="padding:10px 14px;border:1px solid #ccc;border-radius:6px;font-size:1rem">
  </div>
  <div style="display:flex;flex-direction:column;gap:4px">
    <label for="contact-phone" style="font-weight:600;font-size:0.9rem">Phone (optional)</label>
    <input id="contact-phone" type="tel" name="phone" placeholder="814-555-0000" style="padding:10px 14px;border:1px solid #ccc;border-radius:6px;font-size:1rem">
  </div>
  <div style="display:flex;flex-direction:column;gap:4px">
    <label for="contact-message" style="font-weight:600;font-size:0.9rem">Message</label>
    <textarea id="contact-message" name="message" rows="5" placeholder="How can we help you?" required style="padding:10px 14px;border:1px solid #ccc;border-radius:6px;font-size:1rem;resize:vertical"></textarea>
  </div>
  <button type="submit" style="background:#1a1a1a;color:#fff;padding:12px 28px;border:none;border-radius:6px;font-size:1rem;font-weight:600;cursor:pointer;align-self:flex-start">Send Message</button>
</form>
<!-- /wp:html -->
</div>
<!-- /wp:column -->
<!-- wp:column {"width":"45%"} -->
<div class="wp-block-column" style="flex-basis:45%">
<!-- wp:group {"style":{"spacing":{"padding":{"top":"32px","right":"32px","bottom":"32px","left":"32px"}},"border":{"radius":"8px"}},"backgroundColor":"base-2"} -->
<div class="wp-block-group has-base-2-background-color has-background" style="border-radius:8px;padding-top:32px;padding-right:32px;padding-bottom:32px;padding-left:32px">
<!-- wp:heading {"level":3} --><h3 class="wp-block-heading">Business Information</h3><!-- /wp:heading -->
<!-- wp:separator --><hr class="wp-block-separator has-alpha-channel-opacity"/><!-- /wp:separator -->
<!-- wp:heading {"level":5} --><h5 class="wp-block-heading">Phone</h5><!-- /wp:heading -->
<!-- wp:paragraph --><p><a href="tel:${phone.replace(/\D/g,'')}">${phone}</a></p><!-- /wp:paragraph -->
<!-- wp:heading {"level":5} --><h5 class="wp-block-heading">Email</h5><!-- /wp:heading -->
<!-- wp:paragraph --><p><a href="mailto:${email}">${email}</a></p><!-- /wp:paragraph -->
<!-- wp:heading {"level":5} --><h5 class="wp-block-heading">Address</h5><!-- /wp:heading -->
<!-- wp:paragraph --><p>${address}</p><!-- /wp:paragraph -->
<!-- wp:heading {"level":5} --><h5 class="wp-block-heading">Business Hours</h5><!-- /wp:heading -->
<!-- wp:paragraph --><p>${hours}</p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
</div>
<!-- /wp:column -->
</div>
<!-- /wp:columns -->
</div>
<!-- /wp:group -->`;
}

function buildBlogPage() {
  return `<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"64px","bottom":"32px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group alignfull" style="padding-top:64px;padding-bottom:32px">
<!-- wp:heading {"level":1} --><h1 class="wp-block-heading">Blog</h1><!-- /wp:heading -->
<!-- wp:paragraph --><p>Stay up to date with the latest news, insights, and updates from our team.</p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
<!-- wp:query {"query":{"perPage":10,"pages":0,"offset":0,"postType":"post","order":"desc","orderBy":"date","author":"","search":"","exclude":[],"sticky":"","inherit":false}} -->
<div class="wp-block-query">
<!-- wp:post-template -->
<!-- wp:group {"style":{"spacing":{"margin":{"bottom":"40px"}}},"layout":{"type":"constrained"}} -->
<div class="wp-block-group" style="margin-bottom:40px">
<!-- wp:post-title {"isLink":true} /-->
<!-- wp:post-date /-->
<!-- wp:post-excerpt {"moreText":"Read more"} /-->
</div>
<!-- /wp:group -->
<!-- /wp:post-template -->
<!-- wp:query-no-results -->
<!-- wp:paragraph --><p>No posts yet. Check back soon for updates and insights.</p><!-- /wp:paragraph -->
<!-- /wp:query-no-results -->
<!-- wp:query-pagination -->
<!-- wp:query-pagination-previous /-->
<!-- wp:query-pagination-numbers /-->
<!-- wp:query-pagination-next /-->
<!-- /wp:query-pagination -->
</div>
<!-- /wp:query -->`;
}

// ── Page creation orchestration ───────────────────────────────────────────────

async function createPage(wpBase, wpAuth, title, content, slug) {
  const data = await wpPost(wpBase, wpAuth, '/pages', {
    title,
    content,
    status: 'publish',
    slug
  });
  return { id: data.id, slug: data.slug, link: data.link, title };
}

async function configureSiteSettings(wpBase, wpAuth, businessName, tagline, homePageId) {
  await wpPost(wpBase, wpAuth, '/settings', {
    title: businessName,
    description: tagline,
    show_on_front: 'page',
    page_on_front: homePageId
  });
}

async function buildStarterSite(wpBase, wpAuth, businessInfo) {
  const { businessName, tagline } = businessInfo;
  const created = [];
  const errors = [];

  try {
    const page = await createPage(
      wpBase, wpAuth,
      businessName,
      buildHomePage(businessInfo),
      'home'
    );
    created.push(page);

    await configureSiteSettings(wpBase, wpAuth, businessName, tagline, page.id);
  } catch (e) {
    errors.push({ page: 'home', error: e.message });
  }

  return { created, errors };
}

async function buildProSite(wpBase, wpAuth, businessInfo) {
  const { businessName, tagline } = businessInfo;
  const created = [];
  const errors = [];

  const pages = [
    { title: businessName,   content: buildHomePage(businessInfo),     slug: 'home'     },
    { title: 'About Us',     content: buildAboutPage(businessInfo),    slug: 'about'    },
    { title: 'Services',     content: buildServicesPage(businessInfo), slug: 'services' },
    { title: 'Contact',      content: buildContactPage(businessInfo),  slug: 'contact'  },
    { title: 'Blog',         content: buildBlogPage(),                 slug: 'blog'     }
  ];

  for (const p of pages) {
    try {
      const page = await createPage(wpBase, wpAuth, p.title, p.content, p.slug);
      created.push(page);
    } catch (e) {
      errors.push({ page: p.slug, error: e.message });
    }
  }

  const homePage = created.find(p => p.slug === 'home');
  if (homePage) {
    try {
      await configureSiteSettings(wpBase, wpAuth, businessName, tagline, homePage.id);
    } catch (e) {
      errors.push({ page: 'settings', error: e.message });
    }
  }

  return { created, errors };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  if (!isAdminRequest(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const {
    packageId,
    domain,
    wpUser,
    wpPassword,
    businessInfo,
    tier = 'starter',
    websitePages = 1
  } = req.body || {};

  if (!domain || !wpUser || !wpPassword || !businessInfo) {
    return res.status(400).json({
      success: false, error: 'missing_required_fields',
      required: ['domain', 'wpUser', 'wpPassword', 'businessInfo']
    });
  }

  const { businessName, tagline, services } = businessInfo;
  if (!businessName) {
    return res.status(400).json({ success: false, error: 'businessInfo.businessName is required' });
  }

  // Normalize businessInfo with safe defaults
  const info = {
    businessName,
    tagline: tagline || `Welcome to ${businessName}`,
    description: businessInfo.description || `${businessName} provides professional services to clients in Pennsylvania.`,
    phone: businessInfo.phone || '',
    email: businessInfo.email || '',
    address: businessInfo.address || '',
    hours: businessInfo.hours || 'Mon-Fri 9am-5pm',
    services: Array.isArray(services) && services.length > 0 ? services : ['Professional Services'],
    industry: businessInfo.industry || 'business'
  };

  const wpBase = `https://${domain}/wp-json/wp/v2`;
  const wpAuth = buildWpAuth(wpUser, wpPassword);

  // Check if WordPress is ready — fresh installs may take 1–2 min to fully boot
  const ready = await checkWordPressReady(wpBase, wpAuth);
  if (!ready) {
    return res.status(503).json({
      success: false,
      error: 'wordpress_not_ready',
      retry: true,
      message: 'WordPress REST API is not yet reachable. Retry in 60-90 seconds.'
    });
  }

  const results = { success: false, domain, tier, packageId: packageId || null };

  try {
    let buildResult;

    if (tier === 'empire') {
      // Empire is 3 sites — this endpoint handles one site at a time.
      // The caller (provision.js / n8n) invokes it once per site with the correct domain.
      buildResult = await buildProSite(wpBase, wpAuth, info);
    } else if (tier === 'pro' || websitePages >= 5) {
      buildResult = await buildProSite(wpBase, wpAuth, info);
    } else {
      // starter or any single-page tier
      buildResult = await buildStarterSite(wpBase, wpAuth, info);
    }

    results.success = buildResult.created.length > 0;
    results.pagesCreated = buildResult.created;
    results.errors = buildResult.errors.length > 0 ? buildResult.errors : undefined;
    results.homeUrl = `https://${domain}`;

    // Surface partial-success clearly
    if (buildResult.errors.length > 0 && buildResult.created.length === 0) {
      results.success = false;
    }
  } catch (e) {
    log.error('website_builder_unhandled_error', {}, e instanceof Error ? e : new Error(String(e)));
    return res.status(500).json({
      success: false,
      error: 'internal_error',
      message: e.message
    });
  }

  return res.status(results.success ? 200 : 207).json(results);
}
