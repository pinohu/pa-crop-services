const pptxgen = require("pptxgenjs");
const pres = new pptxgen();

pres.layout = 'LAYOUT_16x9';
pres.author = 'Dynasty Empire';
pres.title = 'PA CROP Partner Program';

const PRIMARY = "1B4F8A";
const ACCENT = "534AB7";
const DARK = "1E2333";
const LIGHT = "F5F4F0";
const WHITE = "FFFFFF";
const GRAY = "6B7280";
const GREEN = "059669";
const BODY = "Calibri";
const HEAD = "Calibri";

const mkShadow = () => ({ type: "outer", blur: 4, offset: 2, angle: 135, color: "000000", opacity: 0.1 });

// ===== SLIDE 1: TITLE =====
let s1 = pres.addSlide();
s1.background = { color: DARK };
s1.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: ACCENT } });
s1.addText("PA CROP SERVICES", { x: 0.8, y: 1.2, w: 8.4, h: 0.8, fontSize: 42, fontFace: HEAD, color: WHITE, bold: true, charSpacing: 4 });
s1.addText("Partner Program", { x: 0.8, y: 2.0, w: 8.4, h: 0.6, fontSize: 28, fontFace: HEAD, color: ACCENT });
s1.addText("Add registered office services to your practice.\nZero overhead. Full automation. Your branding.", { x: 0.8, y: 3.0, w: 8.4, h: 1.0, fontSize: 16, fontFace: BODY, color: "9CA3AF", lineSpacingMultiple: 1.5 });
s1.addText("pacropservices.com", { x: 0.8, y: 4.6, w: 4, h: 0.4, fontSize: 14, fontFace: BODY, color: ACCENT });

// ===== SLIDE 2: THE OPPORTUNITY =====
let s2 = pres.addSlide();
s2.background = { color: WHITE };
s2.addText("The Pennsylvania compliance opportunity", { x: 0.8, y: 0.4, w: 8.4, h: 0.6, fontSize: 28, fontFace: HEAD, color: DARK, bold: true });

const stats = [
    { num: "3.8M+", label: "PA business entities", color: ACCENT },
    { num: "170K", label: "New filings per year", color: PRIMARY },
    { num: "2027", label: "Dissolution deadline", color: "DC2626" },
    { num: "~65", label: "Total CROPs in PA", color: GREEN },
];
stats.forEach((s, i) => {
    const x = 0.5 + i * 2.3;
    pres.addSlide(); // dummy to avoid object reuse — will remove
});
// Remove dummies
while (pres.slides.length > 2) pres.slides.pop();

stats.forEach((s, i) => {
    const x = 0.5 + i * 2.3;
    s2.addShape(pres.shapes.RECTANGLE, { x, y: 1.4, w: 2.1, h: 1.6, fill: { color: LIGHT }, shadow: mkShadow() });
    s2.addText(s.num, { x, y: 1.5, w: 2.1, h: 0.7, fontSize: 32, fontFace: HEAD, color: s.color, bold: true, align: "center" });
    s2.addText(s.label, { x, y: 2.2, w: 2.1, h: 0.5, fontSize: 12, fontFace: BODY, color: GRAY, align: "center" });
});

s2.addText("Every PA business entity must have a registered office or CROP. Starting in 2027, failure to file annual reports triggers automatic dissolution.", { x: 0.8, y: 3.4, w: 8.4, h: 0.6, fontSize: 14, fontFace: BODY, color: DARK, lineSpacingMultiple: 1.4 });
s2.addText("Your clients need this. You can provide it — without any operational burden.", { x: 0.8, y: 4.2, w: 8.4, h: 0.5, fontSize: 15, fontFace: BODY, color: ACCENT, bold: true });

// ===== SLIDE 3: THE PROBLEM FOR CPAs =====
let s3 = pres.addSlide();
s3.background = { color: WHITE };
s3.addText("What your clients are asking", { x: 0.8, y: 0.4, w: 8.4, h: 0.6, fontSize: 28, fontFace: HEAD, color: DARK, bold: true });

const problems = [
    { q: '"I got a letter about a new PA annual report. What do I do?"', a: "170K+ entities received this notice in 2025." },
    { q: '"Can you handle my registered office? I work from home."', a: "Privacy-conscious owners don\'t want home addresses public." },
    { q: '"What happens if I don\'t file by 2027?"', a: "Administrative dissolution. Foreign entities cannot reinstate." },
    { q: '"Can you just handle all my PA compliance?"', a: "This is the revenue opportunity sitting in your inbox." },
];
problems.forEach((p, i) => {
    s3.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.3 + i * 1.0, w: 9.0, h: 0.85, fill: { color: i % 2 === 0 ? LIGHT : WHITE } });
    s3.addText(p.q, { x: 0.7, y: 1.35 + i * 1.0, w: 5.5, h: 0.4, fontSize: 13, fontFace: BODY, color: DARK, italic: true });
    s3.addText(p.a, { x: 0.7, y: 1.72 + i * 1.0, w: 8.5, h: 0.35, fontSize: 11, fontFace: BODY, color: GRAY });
});

// ===== SLIDE 4: HOW IT WORKS =====
let s4 = pres.addSlide();
s4.background = { color: WHITE };
s4.addText("How the partner program works", { x: 0.8, y: 0.4, w: 8.4, h: 0.6, fontSize: 28, fontFace: HEAD, color: DARK, bold: true });

const steps = [
    { num: "1", title: "You sign up", desc: "Complete our partner application.\nWe set up your white-label portal." },
    { num: "2", title: "Send us clients", desc: "Bulk upload or individual referral.\nWe handle all onboarding." },
    { num: "3", title: "We do everything", desc: "CROP address, mail, scanning,\nannual report reminders, portal." },
    { num: "4", title: "You bill your way", desc: "Charge clients your price.\nPay us $99/client/year." },
];
steps.forEach((st, i) => {
    const x = 0.3 + i * 2.45;
    s4.addShape(pres.shapes.RECTANGLE, { x, y: 1.3, w: 2.2, h: 3.2, fill: { color: LIGHT }, shadow: mkShadow() });
    s4.addShape(pres.shapes.OVAL, { x: x + 0.8, y: 1.5, w: 0.6, h: 0.6, fill: { color: ACCENT } });
    s4.addText(st.num, { x: x + 0.8, y: 1.5, w: 0.6, h: 0.6, fontSize: 20, fontFace: HEAD, color: WHITE, bold: true, align: "center", valign: "middle" });
    s4.addText(st.title, { x: x + 0.1, y: 2.3, w: 2.0, h: 0.4, fontSize: 15, fontFace: HEAD, color: DARK, bold: true, align: "center" });
    s4.addText(st.desc, { x: x + 0.1, y: 2.8, w: 2.0, h: 1.2, fontSize: 11, fontFace: BODY, color: GRAY, align: "center", lineSpacingMultiple: 1.4 });
});
s4.addText("Your clients see your brand. They never see ours.", { x: 0.8, y: 4.7, w: 8.4, h: 0.4, fontSize: 14, fontFace: BODY, color: ACCENT, bold: true, align: "center" });

// ===== SLIDE 5: PARTNER ECONOMICS =====
let s5 = pres.addSlide();
s5.background = { color: WHITE };
s5.addText("Partner economics", { x: 0.8, y: 0.4, w: 8.4, h: 0.6, fontSize: 28, fontFace: HEAD, color: DARK, bold: true });

s5.addTable([
    [
        { text: "Your clients", options: { fill: { color: ACCENT }, color: WHITE, bold: true, fontSize: 13, fontFace: BODY } },
        { text: "You charge", options: { fill: { color: ACCENT }, color: WHITE, bold: true, fontSize: 13, fontFace: BODY } },
        { text: "You pay us", options: { fill: { color: ACCENT }, color: WHITE, bold: true, fontSize: 13, fontFace: BODY } },
        { text: "Your margin", options: { fill: { color: ACCENT }, color: WHITE, bold: true, fontSize: 13, fontFace: BODY } },
        { text: "Your revenue", options: { fill: { color: ACCENT }, color: WHITE, bold: true, fontSize: 13, fontFace: BODY } },
    ],
    ["25 clients", "$179/yr", "$99/yr", "$80/client", "$2,000/yr"],
    ["50 clients", "$179/yr", "$99/yr", "$80/client", "$4,000/yr"],
    ["100 clients", "$179/yr", "$99/yr", "$80/client", "$8,000/yr"],
    ["200 clients", "$179/yr", "$89/yr *", "$90/client", "$18,000/yr"],
], { x: 0.5, y: 1.2, w: 9.0, colW: [1.8, 1.8, 1.8, 1.8, 1.8], border: { pt: 0.5, color: "D1D5DB" }, fontSize: 12, fontFace: BODY, color: DARK });

s5.addText("* Volume discount: $89/client/yr at 200+ clients", { x: 0.5, y: 3.5, w: 9.0, h: 0.3, fontSize: 10, fontFace: BODY, color: GRAY, italic: true });

s5.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 3.9, w: 9.0, h: 1.2, fill: { color: LIGHT } });
s5.addText("Zero work on your end", { x: 0.7, y: 4.0, w: 8.6, h: 0.4, fontSize: 16, fontFace: HEAD, color: DARK, bold: true });
s5.addText("No office space needed. No staff. No mail handling. No compliance tracking.\nWe handle 100% of operations. You earn recurring revenue from your existing client relationships.", { x: 0.7, y: 4.4, w: 8.6, h: 0.6, fontSize: 12, fontFace: BODY, color: GRAY, lineSpacingMultiple: 1.4 });

// ===== SLIDE 6: WHAT PARTNERS GET =====
let s6 = pres.addSlide();
s6.background = { color: WHITE };
s6.addText("What you get as a partner", { x: 0.8, y: 0.4, w: 8.4, h: 0.6, fontSize: 28, fontFace: HEAD, color: DARK, bold: true });

const features = [
    ["White-label client portal", "Your logo, your colors, your domain. Clients never see our brand."],
    ["Bulk client onboarding", "Upload a CSV, we create all accounts and send welcome emails."],
    ["Partner dashboard", "Track clients, revenue, renewals, and support tickets in real time."],
    ["Co-marketing materials", "Email templates, social posts, website badge, and client-facing FAQ."],
    ["Dedicated account manager", "One point of contact for everything. Phone, email, or portal."],
    ["API access", "Integrate with your existing practice management software."],
];
features.forEach((f, i) => {
    const y = 1.2 + i * 0.65;
    s6.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 0.06, h: 0.5, fill: { color: ACCENT } });
    s6.addText(f[0], { x: 0.8, y, w: 3.5, h: 0.25, fontSize: 13, fontFace: HEAD, color: DARK, bold: true, margin: 0 });
    s6.addText(f[1], { x: 0.8, y: y + 0.25, w: 8.5, h: 0.25, fontSize: 11, fontFace: BODY, color: GRAY, margin: 0 });
});

// ===== SLIDE 7: 2027 URGENCY =====
let s7 = pres.addSlide();
s7.background = { color: DARK };
s7.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.08, fill: { color: "DC2626" } });
s7.addText("The 2027 deadline changes everything", { x: 0.8, y: 0.5, w: 8.4, h: 0.6, fontSize: 28, fontFace: HEAD, color: WHITE, bold: true });

s7.addText([
    { text: "Starting January 2027", options: { bold: true, color: "FCA5A5", breakLine: true } },
    { text: "PA entities that fail to file annual reports face administrative dissolution six months after the deadline.", options: { breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "For your clients, this means:", options: { bold: true, color: "FCA5A5", breakLine: true } },
    { text: "Loss of business registration and good standing", options: { bullet: true, breakLine: true } },
    { text: "Loss of exclusive rights to their business name", options: { bullet: true, breakLine: true } },
    { text: "Foreign entities cannot reinstate — must re-register under a new name", options: { bullet: true, breakLine: true } },
    { text: "Potential default judgments if service of process is missed", options: { bullet: true, breakLine: true } },
    { text: "", options: { breakLine: true } },
    { text: "Your clients need proactive compliance management. You can provide it today.", options: { bold: true, color: ACCENT } },
], { x: 0.8, y: 1.4, w: 8.4, h: 3.5, fontSize: 14, fontFace: BODY, color: "D1D5DB", lineSpacingMultiple: 1.5, paraSpaceAfter: 4 });

// ===== SLIDE 8: GETTING STARTED =====
let s8 = pres.addSlide();
s8.background = { color: WHITE };
s8.addText("Get started in 3 days", { x: 0.8, y: 0.4, w: 8.4, h: 0.6, fontSize: 28, fontFace: HEAD, color: DARK, bold: true });

const timeline = [
    { day: "Day 1", task: "Sign partner agreement", detail: "15-minute call + e-signature" },
    { day: "Day 2", task: "Portal setup", detail: "We configure your branded portal and onboarding flow" },
    { day: "Day 3", task: "Start onboarding clients", detail: "Upload client list or share referral link" },
];
timeline.forEach((t, i) => {
    const y = 1.3 + i * 1.1;
    s8.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 9.0, h: 0.9, fill: { color: LIGHT }, shadow: mkShadow() });
    s8.addShape(pres.shapes.RECTANGLE, { x: 0.5, y, w: 1.2, h: 0.9, fill: { color: ACCENT } });
    s8.addText(t.day, { x: 0.5, y, w: 1.2, h: 0.9, fontSize: 14, fontFace: HEAD, color: WHITE, bold: true, align: "center", valign: "middle" });
    s8.addText(t.task, { x: 1.9, y: y + 0.1, w: 7.4, h: 0.35, fontSize: 15, fontFace: HEAD, color: DARK, bold: true, margin: 0 });
    s8.addText(t.detail, { x: 1.9, y: y + 0.45, w: 7.4, h: 0.3, fontSize: 12, fontFace: BODY, color: GRAY, margin: 0 });
});

s8.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 4.5, w: 9.0, h: 0.08, fill: { color: ACCENT } });
s8.addText("No minimums. No setup fees. No long-term contracts.", { x: 0.5, y: 4.7, w: 9.0, h: 0.4, fontSize: 14, fontFace: BODY, color: ACCENT, bold: true, align: "center" });

// ===== SLIDE 9: CTA =====
let s9 = pres.addSlide();
s9.background = { color: DARK };
s9.addShape(pres.shapes.RECTANGLE, { x: 0, y: 5.545, w: 10, h: 0.08, fill: { color: ACCENT } });
s9.addText("Ready to add CROP services\nto your practice?", { x: 0.8, y: 1.0, w: 8.4, h: 1.4, fontSize: 36, fontFace: HEAD, color: WHITE, bold: true, lineSpacingMultiple: 1.3 });
s9.addText([
    { text: "Schedule a 15-minute call:", options: { breakLine: true, color: "9CA3AF" } },
    { text: "partners@pacropservices.com", options: { breakLine: true, bold: true, color: ACCENT } },
    { text: "", options: { breakLine: true } },
    { text: "Or visit:", options: { breakLine: true, color: "9CA3AF" } },
    { text: "pacropservices.com/partners", options: { bold: true, color: ACCENT } },
], { x: 0.8, y: 2.8, w: 8.4, h: 2.0, fontSize: 18, fontFace: BODY, lineSpacingMultiple: 1.5 });
s9.addText("PA CROP Services  |  Erie, Pennsylvania  |  A Dynasty Empire Company", { x: 0.8, y: 5.0, w: 8.4, h: 0.4, fontSize: 10, fontFace: BODY, color: "6B7280", align: "center" });

pres.writeFile({ fileName: "/home/claude/PA-CROP-Partner-Deck.pptx" }).then(() => console.log("Partner deck created"));
