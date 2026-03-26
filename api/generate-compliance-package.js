// PA CROP Services — Compliance Package PDF Generator
// POST /api/generate-compliance-package
// Body: { email, name, entityName, entityType, tier, dosNumber, accessCode, planLabel, deadline, daysUntilDeadline }
// Header: X-Admin-Key required
// Returns: application/pdf attachment

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { setCors, isAdminRequest } from './services/auth.js';
import { getEntityConfig, getEntityDeadline, getRules } from './_compliance.js';
import { createLogger } from './_log.js';

const log = createLogger('generate-compliance-package');

// ── Brand colors (sRGB 0-1) ───────────────────────────────
const C = {
  navy:  rgb(0.047, 0.071, 0.125),   // #0C1220
  gold:  rgb(0.788, 0.596, 0.165),   // #C9982A
  sage:  rgb(0.420, 0.561, 0.443),   // #6B8F71
  white: rgb(1, 1, 1),
  light: rgb(0.961, 0.957, 0.949),   // #F5F4F2 — page background tint
  mid:   rgb(0.667, 0.667, 0.667),   // #AAAAAA — muted text
  dark:  rgb(0.110, 0.133, 0.180),   // #1C2230 — body text
};

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN  = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Helpers ───────────────────────────────────────────────

function pt(page, font, text, x, y, size, color = C.dark) {
  page.drawText(String(text), { x, y, size, font, color });
}

function drawRect(page, x, y, w, h, color) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

function drawLine(page, x1, y1, x2, y2, color = C.gold, thickness = 1) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
}

/** Word-wrap text into lines not exceeding maxWidth. */
function wrapText(text, font, size, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draw wrapped text, returns the y position after the last line. */
function drawWrapped(page, font, text, x, y, size, maxWidth, lineHeight, color = C.dark) {
  const lines = wrapText(text, font, size, maxWidth);
  for (const l of lines) {
    pt(page, font, l, x, y, size, color);
    y -= lineHeight;
  }
  return y;
}

/** Draw the branded page header band (navy + gold accent bar). */
function drawPageHeader(page, bold, title, subtitle = null) {
  // Navy band
  drawRect(page, 0, PAGE_H - 72, PAGE_W, 72, C.navy);
  // Gold accent stripe
  drawRect(page, 0, PAGE_H - 72, PAGE_W, 4, C.gold);
  // Brand name
  pt(page, bold, 'PA CROP Services', MARGIN, PAGE_H - 40, 11, C.gold);
  // Page title
  pt(page, bold, title, MARGIN, PAGE_H - 58, 9, C.white);
  if (subtitle) {
    pt(page, bold, subtitle, PAGE_W - MARGIN - bold.widthOfTextAtSize(subtitle, 8), PAGE_H - 58, 8, C.mid);
  }
}

/** Draw the branded page footer. */
function drawPageFooter(page, regular, pageNum, total) {
  drawLine(page, MARGIN, 40, PAGE_W - MARGIN, 40, C.gold, 0.5);
  pt(page, regular, 'PA Registered Office Services, LLC  ·  924 W 23rd St, Erie PA 16502  ·  814-228-2822  ·  pacropservices.com', MARGIN, 24, 7, C.mid);
  const pageLabel = `${pageNum} of ${total}`;
  pt(page, regular, pageLabel, PAGE_W - MARGIN - regular.widthOfTextAtSize(pageLabel, 7), 24, 7, C.mid);
}

/** Draw a section heading with gold underline. Returns new y. */
function drawSectionHeading(page, bold, text, y) {
  pt(page, bold, text.toUpperCase(), MARGIN, y, 9, C.gold);
  drawLine(page, MARGIN, y - 4, PAGE_W - MARGIN, y - 4, C.gold, 0.5);
  return y - 18;
}

/** Draw a labelled key-value row. Returns new y. */
function drawKV(page, bold, regular, label, value, y, labelColor = C.navy) {
  pt(page, bold, label, MARGIN, y, 9, labelColor);
  pt(page, regular, value, MARGIN + 160, y, 9, C.dark);
  return y - 15;
}

/** Draw a bullet point row. Returns new y. */
function drawBullet(page, regular, text, y, indent = 0, color = C.dark) {
  pt(page, regular, '\u2022', MARGIN + indent, y, 9, C.gold);
  return drawWrapped(page, regular, text, MARGIN + indent + 12, y, 9, CONTENT_W - indent - 12, 13, color);
}

/** Draw a two-column table row. Returns new y. */
function drawTableRow(page, regular, bold, col1, col2, y, isHeader = false, shade = false) {
  const rowH = 18;
  if (shade) drawRect(page, MARGIN, y - 3, CONTENT_W, rowH, C.light);
  const font = isHeader ? bold : regular;
  const color = isHeader ? C.navy : C.dark;
  pt(page, font, col1, MARGIN + 6, y + 5, 8.5, color);
  pt(page, font, col2, MARGIN + 280, y + 5, 8.5, color);
  return y - rowH;
}

/** Three-column table row. Returns new y. */
function drawRow3(page, regular, bold, c1, c2, c3, y, isHeader = false, shade = false) {
  const rowH = 18;
  if (shade) drawRect(page, MARGIN, y - 3, CONTENT_W, rowH, C.light);
  const font = isHeader ? bold : regular;
  const color = isHeader ? C.navy : C.dark;
  pt(page, font, c1, MARGIN + 6, y + 5, 8.5, color);
  pt(page, font, c2, MARGIN + 190, y + 5, 8.5, color);
  pt(page, font, c3, MARGIN + 380, y + 5, 8.5, color);
  return y - rowH;
}

// ── Deadline calendar helpers ─────────────────────────────

function formatDeadlineDate(year, deadlineStr) {
  // deadlineStr: "MM-DD"
  const [m, d] = deadlineStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[m - 1]} ${d}, ${year}`;
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

function reminderDate(year, deadlineStr, daysBefore) {
  const [m, d] = deadlineStr.split('-').map(Number);
  const dt = new Date(year, m - 1, d);
  dt.setDate(dt.getDate() - daysBefore);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

// ── Plan feature tables ───────────────────────────────────

const PLAN_FEATURES = {
  compliance_only: {
    label: 'Compliance Only',
    included: [
      'PA registered office address (924 W 23rd St, Erie PA)',
      'Same-day document scanning + portal notification',
      'Annual report deadline reminders (90/60/30/14/7 days)',
      'Entity status monitoring',
      'Secure client portal access',
      'AI compliance assistant',
    ],
    notIncluded: [
      'Business website hosting',
      'Annual report filing service (you file)',
      'Multi-entity management (upgrade for additional entities)',
      'SMS/text notifications',
    ],
    upgrade: 'Upgrade to Business Pro to have us file your annual report for you.',
  },
  business_starter: {
    label: 'Business Starter',
    included: [
      'Everything in Compliance Only',
      'Business website hosting',
      'Up to 200 MB document storage',
    ],
    notIncluded: [
      'Annual report filing service (you file)',
      'Multi-entity management (upgrade for additional entities)',
      'SMS/text notifications',
    ],
    upgrade: 'Upgrade to Business Pro to unlock annual report filing and SMS notifications.',
  },
  business_pro: {
    label: 'Business Pro',
    included: [
      'Everything in Business Starter',
      'Annual report filing service (we file for you)',
      'Up to 3 entities',
      '1 GB document storage',
      'SMS/text notifications',
    ],
    notIncluded: [
      'More than 3 entities (upgrade to Empire)',
    ],
    upgrade: 'Upgrade to Business Empire to manage up to 10 entities with 5 GB storage.',
  },
  business_empire: {
    label: 'Business Empire',
    included: [
      'Everything in Business Pro',
      'Up to 10 entities',
      '5 GB document storage',
      'Priority support',
    ],
    notIncluded: [],
    upgrade: 'Contact us for custom enterprise arrangements beyond 10 entities.',
  },
};

function resolvePlanKey(tier) {
  const t = (tier || '').toLowerCase().replace(/[^a-z]/g, '_');
  if (t.includes('empire')) return 'business_empire';
  if (t.includes('pro')) return 'business_pro';
  if (t.includes('starter')) return 'business_starter';
  return 'compliance_only';
}

// ── Page builders ─────────────────────────────────────────

function buildPage1(page, fonts, data) {
  const { bold, regular, italic } = fonts;
  const { name, entityName, entityType, planLabel, enrolledDate, dosNumber, accessCode } = data;

  drawPageHeader(page, bold, 'Welcome Letter', enrolledDate);

  // Gold welcome bar
  drawRect(page, MARGIN, PAGE_H - 140, CONTENT_W, 52, C.navy);
  drawRect(page, MARGIN, PAGE_H - 140, 4, 52, C.gold);
  pt(page, bold, 'Welcome to PA CROP Services', MARGIN + 16, PAGE_H - 110, 18, C.gold);
  pt(page, regular, 'Your Pennsylvania Registered Office Provider', MARGIN + 16, PAGE_H - 128, 9.5, C.white);

  let y = PAGE_H - 164;

  // Greeting paragraph
  const greeting = `Dear ${name || 'Valued Client'},`;
  pt(page, bold, greeting, MARGIN, y, 11, C.navy);
  y -= 20;

  const intro = `Thank you for enrolling with PA Registered Office Services, LLC — your trusted Commercial Registered Office Provider (CROP) licensed under 15 Pa. C.S. § 109. This compliance package contains everything you need to stay current with Pennsylvania's annual report requirements and protect your business.`;
  y = drawWrapped(page, regular, intro, MARGIN, y, 9.5, CONTENT_W, 14, C.dark);
  y -= 20;

  y = drawSectionHeading(page, bold, 'Your Account Details', y);
  y -= 4;
  y = drawKV(page, bold, regular, 'Client Name:', name || '—', y);
  y = drawKV(page, bold, regular, 'Entity Name:', entityName || '—', y);
  y = drawKV(page, bold, regular, 'Entity Type:', entityType || '—', y);
  if (dosNumber) y = drawKV(page, bold, regular, 'PA DOS Number:', dosNumber, y);
  y = drawKV(page, bold, regular, 'Enrollment Date:', enrolledDate, y);
  y = drawKV(page, bold, regular, 'Service Plan:', planLabel || '—', y);
  y -= 20;

  y = drawSectionHeading(page, bold, 'What Is Included In Your Plan', y);
  y -= 4;
  const planKey = resolvePlanKey(data.tier);
  const planInfo = PLAN_FEATURES[planKey] || PLAN_FEATURES.compliance_only;
  for (const item of planInfo.included) {
    y = drawBullet(page, regular, item, y);
    y -= 2;
  }
  y -= 16;

  // Registered office address box
  drawRect(page, MARGIN, y - 52, CONTENT_W, 62, C.light);
  drawRect(page, MARGIN, y - 52, 3, 62, C.gold);
  pt(page, bold, 'Your PA Registered Office Address', MARGIN + 12, y + 2, 9, C.navy);
  pt(page, regular, '924 W 23rd Street, Erie, PA 16502', MARGIN + 12, y - 14, 9, C.dark);
  pt(page, italic, 'Documents received here are scanned and uploaded to your portal same day.', MARGIN + 12, y - 28, 8.5, C.mid);
  if (accessCode) {
    pt(page, bold, `Portal Access Code:  ${accessCode}`, MARGIN + 12, y - 44, 9, C.navy);
  }
  y -= 70;

  // Closing
  y -= 10;
  pt(page, regular, 'We are honored to serve your business. Please reach out any time:', MARGIN, y, 9.5, C.dark);
  y -= 16;
  // Render email in gold, then the rest of the contact line in dark on the same baseline
  const emailStr = 'hello@pacropservices.com';
  const restStr = '  ·  814-228-2822  ·  pacropservices.com/portal';
  pt(page, bold, emailStr, MARGIN, y, 9.5, C.gold);
  pt(page, regular, restStr, MARGIN + bold.widthOfTextAtSize(emailStr, 9.5), y, 9.5, C.dark);
  y -= 20;
  pt(page, italic, 'Warm regards,', MARGIN, y, 9.5, C.dark);
  y -= 14;
  pt(page, bold, 'The PA CROP Services Team', MARGIN, y, 9.5, C.navy);
}

function buildPage2(page, fonts, data) {
  const { bold, regular, italic } = fonts;
  const { entityType } = data;
  const rules = getRules();
  const config = getEntityConfig(entityType);
  const deadlineStr = config.deadline; // "MM-DD"
  const groupName = config.category;
  const group = rules.deadlineGroups[groupName];

  drawPageHeader(page, bold, 'Your Compliance Calendar', 'PA Annual Report Requirements — Act 122 of 2022');

  let y = PAGE_H - 90;

  // Entity context banner
  drawRect(page, MARGIN, y - 22, CONTENT_W, 30, C.navy);
  pt(page, bold, `Entity Type:  ${config.label}`, MARGIN + 10, y - 8, 9.5, C.gold);
  pt(page, regular, `Annual Deadline:  ${group.label} each year`, MARGIN + 290, y - 8, 9.5, C.white);
  y -= 40;

  // ── Filing deadlines table ────────────────────────────
  y = drawSectionHeading(page, bold, 'Annual Filing Deadlines — 2025 · 2026 · 2027', y);
  y -= 4;
  y = drawRow3(page, regular, bold, 'Year', 'Deadline Date', 'Status / Notes', y, true, true);
  drawLine(page, MARGIN, y + 14, PAGE_W - MARGIN, y + 14, C.gold, 0.5);

  const yearRows = [
    ['2025', formatDeadlineDate(2025, deadlineStr), 'Grace period — no dissolution enforcement'],
    ['2026', formatDeadlineDate(2026, deadlineStr), 'Grace period — no dissolution enforcement'],
    ['2027', formatDeadlineDate(2027, deadlineStr), 'ENFORCEMENT BEGINS — file or face dissolution'],
  ];
  yearRows.forEach(([yr, dl, note], i) => {
    y = drawRow3(page, regular, bold, yr, dl, note, y, false, i % 2 === 0);
  });
  y -= 18;

  // ── Reminder schedule table ───────────────────────────
  y = drawSectionHeading(page, bold, 'Your Automatic Reminder Schedule (2025 Example)', y);
  y -= 4;
  y = drawTableRow(page, regular, bold, 'Reminder', 'Date (2025)', y, true, true);
  drawLine(page, MARGIN, y + 14, PAGE_W - MARGIN, y + 14, C.gold, 0.5);

  const reminderDays = [90, 60, 30, 14, 7];
  reminderDays.forEach((d, i) => {
    y = drawTableRow(page, regular, bold, `${d} days before deadline`, reminderDate(2025, deadlineStr, d), y, false, i % 2 === 0);
  });
  y -= 18;

  // ── Enforcement timeline ──────────────────────────────
  y = drawSectionHeading(page, bold, 'Enforcement Timeline (Starting 2027)', y);
  y -= 6;

  const enforcementMonth = addDays(`2027-${deadlineStr}`, 30 * 6); // approx 6 months out
  const items2027 = [
    [`Miss ${group.label} 2027 deadline`, 'Entity marked delinquent with PA DOS'],
    [`~6 months after ${group.label} 2027`, `Entity subject to ${config.dissolutionTerm}`],
    ['After dissolution', 'Name protection lost — cannot conduct business'],
    ['After dissolution', 'Contracts may be unenforceable'],
  ];
  items2027.forEach(([when, what], i) => {
    y = drawTableRow(page, regular, bold, when, what, y, false, i % 2 === 0);
  });
  y -= 16;

  // Grace period callout box
  drawRect(page, MARGIN, y - 46, CONTENT_W, 56, rgb(0.95, 0.97, 0.95));
  drawRect(page, MARGIN, y - 46, 3, 56, C.sage);
  pt(page, bold, 'Grace Period Note (2025 – 2026)', MARGIN + 12, y + 2, 9, C.sage);
  pt(page, regular, 'Pennsylvania will NOT dissolve or terminate entities for missed 2025 or 2026 annual reports.', MARGIN + 12, y - 12, 8.5, C.dark);
  pt(page, regular, 'However, the $7 filing fee still applies and the report is still required. File early to build the habit.', MARGIN + 12, y - 26, 8.5, C.dark);
  pt(page, italic, 'Starting with 2027 reports: dissolution occurs 6 months after missed deadline. No exceptions.', MARGIN + 12, y - 40, 8, C.navy);
  y -= 64;
}

function buildPage3(page, fonts, data) {
  const { bold, regular, italic } = fonts;
  const { entityType } = data;
  const rules = getRules();
  const config = getEntityConfig(entityType);

  drawPageHeader(page, bold, 'Risk Assessment', 'What Happens If You Miss A Filing Deadline');

  let y = PAGE_H - 90;

  // Risk banner
  drawRect(page, MARGIN, y - 22, CONTENT_W, 30, rgb(0.4, 0.08, 0.08));
  pt(page, bold, 'Missing a PA annual report deadline can permanently damage your business.', MARGIN + 10, y - 8, 9, C.white);
  y -= 40;

  // ── Timeline of consequences ──────────────────────────
  y = drawSectionHeading(page, bold, 'Timeline of Consequences', y);
  y -= 4;

  const group = rules.deadlineGroups[config.category];
  const consequences = [
    { label: 'Deadline missed', detail: `${group.label} passes without a filed annual report + $7 fee paid.` },
    { label: '0 – 6 months', detail: 'Entity shown as delinquent in PA DOS public records. Your name remains protected.' },
    { label: '~6 months after deadline', detail: `PA DOS issues ${config.dissolutionTerm}. This is public record.` },
    { label: 'After dissolution', detail: 'Your entity name is no longer protected. Competitors can register it.' },
    { label: 'After dissolution', detail: 'Entity legally cannot conduct business, enter contracts, or sue in PA courts.' },
    { label: 'After dissolution', detail: 'Existing contracts with your dissolved entity may be unenforceable.' },
  ];

  consequences.forEach(({ label, detail }, i) => {
    drawRect(page, MARGIN, y - 3, CONTENT_W, 22, i % 2 === 0 ? C.light : C.white);
    pt(page, bold, label, MARGIN + 6, y + 8, 8.5, C.navy);
    pt(page, regular, detail, MARGIN + 170, y + 8, 8.5, C.dark);
    y -= 22;
  });
  y -= 16;

  // ── Dollar costs ──────────────────────────────────────
  y = drawSectionHeading(page, bold, 'The Real Dollar Cost', y);
  y -= 4;

  if (config.canReinstate) {
    y = drawBullet(page, regular, `Reinstatement fee: $${rules.enforcement.domesticReinstatementFeeOnline} (online) or $${rules.enforcement.domesticReinstatementFeePaper} (paper) per entity`, y);
    y -= 2;
    y = drawBullet(page, regular, `Delinquent report fee: $${rules.enforcement.delinquentReportFee} per missed annual report`, y);
    y -= 2;
    y = drawBullet(page, regular, 'Legal fees if disputes arise from contracts signed while dissolved', y);
    y -= 2;
    y = drawBullet(page, regular, 'Brand/reputational damage if name is taken by a competitor during dissolution', y);
    y -= 2;
    y = drawBullet(page, regular, 'Lost revenue during period when entity legally cannot operate', y);
  } else {
    y = drawBullet(page, regular, 'Foreign entities CANNOT reinstate — you must re-register as a new foreign entity.', y);
    y -= 2;
    y = drawBullet(page, regular, 'New registration fees, new timeline, and potential loss of original registration date.', y);
    y -= 2;
    y = drawBullet(page, regular, 'Legal exposure on contracts made under the old registration.', y);
    y -= 2;
    y = drawBullet(page, regular, 'Brand/reputational damage and potential name loss.', y);
  }
  y -= 20;

  // ── Protection callout ────────────────────────────────
  drawRect(page, MARGIN, y - 68, CONTENT_W, 80, C.navy);
  drawRect(page, MARGIN, y - 68, 3, 80, C.gold);
  pt(page, bold, 'Your Plan Protects You', MARGIN + 14, y + 4, 11, C.gold);
  y -= 18;
  const protection = [
    'We send reminders at 90, 60, 30, 14, and 7 days before your deadline.',
    'We monitor your entity status year-round.',
    config.canReinstate
      ? 'If you miss a deadline, we guide you through the reinstatement process.'
      : 'We proactively alert you to foreign registration requirements.',
  ];
  for (const line of protection) {
    pt(page, regular, `\u2022  ${line}`, MARGIN + 14, y, 8.5, C.white);
    y -= 14;
  }
  y -= 30;

  pt(page, italic, 'Questions? Call 814-228-2822 or email hello@pacropservices.com — we respond within one business day.', MARGIN, y, 8.5, C.mid);
}

function buildPage4(page, fonts, data) {
  const { bold, regular, italic } = fonts;
  const { accessCode, dosNumber } = data;

  drawPageHeader(page, bold, 'Quick Reference Card', 'Keep This Page Handy');

  let y = PAGE_H - 96;

  // ── Client portal ─────────────────────────────────────
  y = drawSectionHeading(page, bold, 'Your Client Portal', y);
  y -= 4;

  drawRect(page, MARGIN, y - 48, CONTENT_W, 62, C.navy);
  drawRect(page, MARGIN, y - 48, 3, 62, C.gold);
  pt(page, bold, 'pacropservices.com/portal', MARGIN + 14, y + 6, 12, C.gold);
  pt(page, regular, 'Access your compliance dashboard, documents, and filing reminders.', MARGIN + 14, y - 10, 9, C.white);
  const codeDisplay = accessCode || 'Check your welcome email for your code';
  pt(page, bold, `Access Code:  ${codeDisplay}`, MARGIN + 14, y - 26, 9.5, C.gold);
  pt(page, italic, 'Keep your access code private. Reset it any time from the portal.', MARGIN + 14, y - 42, 8, C.mid);
  y -= 68;

  // ── Contact directory ─────────────────────────────────
  y = drawSectionHeading(page, bold, 'Contact Directory', y);
  y -= 4;

  const contacts = [
    ['PA CROP Services — Support', 'hello@pacropservices.com'],
    ['PA CROP Services — Phone', '814-228-2822'],
    ['Client Portal', 'pacropservices.com/portal'],
    ['PA DOS Online Filing', 'file.dos.pa.gov'],
    ['PA DOS Phone', '717-787-1057'],
    ['PA DOS Business Search', 'file.dos.pa.gov/search/business'],
  ];

  contacts.forEach(([label, value], i) => {
    drawRect(page, MARGIN, y - 3, CONTENT_W, 20, i % 2 === 0 ? C.light : C.white);
    pt(page, bold, label, MARGIN + 8, y + 8, 8.5, C.navy);
    pt(page, regular, value, MARGIN + 260, y + 8, 8.5, C.dark);
    y -= 20;
  });
  y -= 20;

  // ── PA DOS filing quick steps ─────────────────────────
  y = drawSectionHeading(page, bold, 'How To File Your Annual Report (Self-Filing Plans)', y);
  y -= 4;

  const steps = [
    'Go to file.dos.pa.gov',
    'Search for your entity by name or DOS number',
    dosNumber ? `Your DOS Number: ${dosNumber}` : 'Have your PA DOS entity number ready (check your formation documents)',
    'Select "File Annual Report" — complete form DSCB:15-146',
    'Pay the $7 filing fee by card (nonprofits: $0)',
    'Save your confirmation number — upload it to your portal',
  ];

  steps.forEach((step, i) => {
    drawRect(page, MARGIN, y - 3, 22, 20, C.navy);
    pt(page, bold, String(i + 1), MARGIN + 7, y + 7, 8.5, C.gold);
    pt(page, regular, step, MARGIN + 30, y + 7, 8.5, C.dark);
    y -= 22;
  });
  y -= 18;

  // ── Office hours ──────────────────────────────────────
  drawRect(page, MARGIN, y - 30, CONTENT_W, 42, C.light);
  drawRect(page, MARGIN, y - 30, 3, 42, C.sage);
  pt(page, bold, 'Registered Office Hours', MARGIN + 12, y + 4, 9, C.navy);
  pt(page, regular, 'Mon – Fri  9:00 AM – 5:00 PM ET  ·  924 W 23rd St, Erie PA 16502', MARGIN + 12, y - 10, 8.5, C.dark);
  pt(page, italic, 'Documents received during business hours are scanned and uploaded same day.', MARGIN + 12, y - 24, 8, C.mid);
  y -= 50;
}

function buildPage5(page, fonts, data) {
  const { bold, regular, italic } = fonts;
  const { tier, planLabel } = data;
  const planKey = resolvePlanKey(tier);
  const planInfo = PLAN_FEATURES[planKey] || PLAN_FEATURES.compliance_only;

  drawPageHeader(page, bold, 'Service Level Summary', `Plan: ${planInfo.label}`);

  let y = PAGE_H - 96;

  // Plan badge
  drawRect(page, MARGIN, y - 28, CONTENT_W, 40, C.navy);
  pt(page, bold, planInfo.label.toUpperCase(), MARGIN + 14, y - 2, 13, C.gold);
  pt(page, regular, planLabel || planInfo.label, PAGE_W - MARGIN - 14 - regular.widthOfTextAtSize(planLabel || planInfo.label, 9), y - 2, 9, C.white);
  pt(page, regular, 'Your active service plan', MARGIN + 14, y - 18, 8.5, C.mid);
  y -= 50;

  // ── Included features ─────────────────────────────────
  y = drawSectionHeading(page, bold, 'What Is Included In Your Plan', y);
  y -= 4;

  for (const item of planInfo.included) {
    drawRect(page, MARGIN, y - 2, CONTENT_W, 16, C.light);
    pt(page, bold, '\u2713', MARGIN + 8, y + 4, 9, C.sage);
    pt(page, regular, item, MARGIN + 22, y + 4, 8.5, C.dark);
    y -= 17;
  }
  y -= 16;

  // ── Not included ──────────────────────────────────────
  if (planInfo.notIncluded.length > 0) {
    y = drawSectionHeading(page, bold, 'Not Included In Your Current Plan', y);
    y -= 4;

    for (const item of planInfo.notIncluded) {
      drawRect(page, MARGIN, y - 2, CONTENT_W, 16, rgb(0.99, 0.97, 0.97));
      pt(page, regular, '\u2013', MARGIN + 8, y + 4, 9, C.mid);
      pt(page, regular, item, MARGIN + 22, y + 4, 8.5, C.dark);
      y -= 17;
    }

    // Upgrade CTA
    y -= 6;
    drawRect(page, MARGIN, y - 26, CONTENT_W, 36, C.navy);
    drawRect(page, MARGIN, y - 26, 3, 36, C.gold);
    pt(page, bold, 'Upgrade Your Plan', MARGIN + 12, y + 2, 9, C.gold);
    pt(page, regular, planInfo.upgrade, MARGIN + 12, y - 14, 8.5, C.white);
    y -= 44;
  }
  y -= 8;

  // ── Guarantee + Referral ──────────────────────────────
  y = drawSectionHeading(page, bold, 'Our Guarantees & Your Benefits', y);
  y -= 4;

  // 30-day guarantee box
  drawRect(page, MARGIN, y - 46, CONTENT_W / 2 - 6, 56, C.light);
  drawRect(page, MARGIN, y - 46, 3, 56, C.gold);
  pt(page, bold, '30-Day Money-Back Guarantee', MARGIN + 10, y + 2, 8.5, C.navy);
  y -= 14;
  const guaranteeText = 'Not satisfied? Contact us within 30 days of enrollment for a full refund. No questions asked.';
  const gLines = wrapText(guaranteeText, regular, 8, CONTENT_W / 2 - 26);
  let gy = y;
  for (const gl of gLines) {
    pt(page, regular, gl, MARGIN + 10, gy, 8, C.dark);
    gy -= 12;
  }
  y -= 46;

  // Referral box — position to the right of guarantee
  const referralX = MARGIN + CONTENT_W / 2 + 6;
  const referralY = y + 46;
  drawRect(page, referralX, referralY - 46, CONTENT_W / 2 - 6, 56, C.light);
  drawRect(page, referralX, referralY - 46, 3, 56, C.gold);
  pt(page, bold, 'Referral Program', referralX + 10, referralY + 2, 8.5, C.navy);
  const refText = 'Refer a friend or colleague and earn service credits. Share your unique referral link from your portal dashboard.';
  const rLines = wrapText(refText, regular, 8, CONTENT_W / 2 - 26);
  let ry = referralY - 14;
  for (const rl of rLines) {
    pt(page, regular, rl, referralX + 10, ry, 8, C.dark);
    ry -= 12;
  }

  y -= 24;

  // Footer note
  pt(page, italic, 'PA Registered Office Services, LLC is a licensed Commercial Registered Office Provider under 15 Pa. C.S. § 109.', MARGIN, y, 7.5, C.mid);
  y -= 12;
  pt(page, italic, 'This document is for informational purposes. It does not constitute legal advice. For legal questions, consult a Pennsylvania attorney.', MARGIN, y, 7.5, C.mid);
}

// ── Main handler ─────────────────────────────────────────

export default async function handler(req, res) {
  setCors(req, res);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'POST only' });

  if (!isAdminRequest(req)) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const {
    email,
    name,
    entityName,
    entityType,
    tier,
    dosNumber,
    accessCode,
    planLabel,
    deadline,
    daysUntilDeadline,
  } = req.body || {};

  if (!email || !entityName) {
    return res.status(400).json({ success: false, error: 'email and entityName are required' });
  }

  const enrolledDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const resolvedEntityType = entityType || 'domestic_llc';
  const planKey = resolvePlanKey(tier);
  const planInfo = PLAN_FEATURES[planKey];

  const data = {
    email,
    name: name || 'Valued Client',
    entityName,
    entityType: resolvedEntityType,
    tier: planKey,
    dosNumber: dosNumber || null,
    accessCode: accessCode || null,
    planLabel: planLabel || planInfo.label,
    deadline: deadline || null,
    daysUntilDeadline: daysUntilDeadline || null,
    enrolledDate,
  };

  try {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`PA CROP Services — Compliance Package — ${entityName}`);
    pdfDoc.setAuthor('PA Registered Office Services, LLC');
    pdfDoc.setSubject('Client Compliance Package');
    pdfDoc.setCreator('PA CROP Services');
    pdfDoc.setCreationDate(new Date());

    const [boldFont, regularFont, italicFont] = await Promise.all([
      pdfDoc.embedFont(StandardFonts.HelveticaBold),
      pdfDoc.embedFont(StandardFonts.Helvetica),
      pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    ]);

    const fonts = { bold: boldFont, regular: regularFont, italic: italicFont };

    const pages = Array.from({ length: 5 }, () =>
      pdfDoc.addPage([PAGE_W, PAGE_H])
    );

    // Light background on all pages
    for (const page of pages) {
      drawRect(page, 0, 0, PAGE_W, PAGE_H, C.white);
    }

    const pageBuilders = [buildPage1, buildPage2, buildPage3, buildPage4, buildPage5];
    pageBuilders.forEach((builder, i) => {
      builder(pages[i], fonts, data);
      drawPageFooter(pages[i], regularFont, i + 1, 5);
    });

    const pdfBytes = await pdfDoc.save();
    const safeName = (entityName || 'client').replace(/[^a-zA-Z0-9\-_]/g, '-').slice(0, 40);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="compliance-package-${safeName}.pdf"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).end(Buffer.from(pdfBytes));
  } catch (err) {
    log.error('compliance_package_generation_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(500).json({ success: false, error: 'PDF generation failed', detail: err.message });
  }
}
