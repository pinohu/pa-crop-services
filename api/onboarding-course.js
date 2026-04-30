import { setCors, isAdminRequest } from './services/auth.js';

// PA CROP Services — Client Onboarding Course Generator
// GET /api/onboarding-course?key=ADMIN (generates 5-lesson course)
// POST /api/onboarding-course { email } (assigns course to client)

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const isAdmin = isAdminRequest(req);
  const GROQ_KEY = process.env.GROQ_API_KEY;

  // Static course structure (always available)
  const COURSE = {
    title: 'PA Business Compliance Essentials',
    lessons: [
      { id: 1, title: 'What is a CROP and Why You Need One', duration: '3 min', topics: ['15 Pa. C.S. § 109', 'registered office requirements', 'CROP vs registered agent'], quiz: { q: 'What PA statute governs CROPs?', a: '15 Pa. C.S. § 109' } },
      { id: 2, title: 'Your Annual Report — When, How, and Why', duration: '4 min', topics: ['filing deadlines', 'DSCB:15-530/532 forms', '$7 fee', 'file.dos.pa.gov'], quiz: { q: 'What is the PA annual report filing fee?', a: '$7' } },
      { id: 3, title: 'Understanding Entity Status and Dissolution Risk', duration: '3 min', topics: ['active vs inactive', 'administrative dissolution', 'reinstatement process'], quiz: { q: 'What happens if you miss annual reports?', a: 'Administrative dissolution' } },
      { id: 4, title: 'Service of Process — What to Do When You Get Served', duration: '3 min', topics: ['what counts as service', 'response deadlines', 'how CROP handles it'], quiz: { q: 'How quickly does PA CROP scan and notify you of legal documents?', a: 'Same business day' } },
      { id: 5, title: 'Using Your Portal and Staying Compliant Year-Round', duration: '4 min', topics: ['portal features', 'document management', 'reminder system', 'compliance checklist'], quiz: { q: 'How many days of advance reminders does PA CROP send before your annual report deadline?', a: 'Five tiers: 90, 60, 30, 14, and 7 days' } },
    ],
    totalDuration: '17 min',
    certification: 'PA Compliance Certified badge upon completion'
  };

  if (req.method === 'GET') {
    // Generate expanded content for each lesson if admin
    if (isAdmin && req.query?.expand === 'true' && GROQ_KEY) {
      for (const lesson of COURSE.lessons) {
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile', max_tokens: 400,
              messages: [
                { role: 'system', content: 'Write lesson content for a PA compliance course. 150 words, clear, actionable. Include one real PA statute reference.' },
                { role: 'user', content: `Lesson ${lesson.id}: "${lesson.title}". Topics: ${lesson.topics.join(', ')}` }
              ]
            })
          });
          lesson.content = (await r.json())?.choices?.[0]?.message?.content || '';
        } catch(e) {}
      }
    }
    return res.status(200).json({ success: true, course: COURSE });
  }

  // POST: Assign course to client
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ success: false, error: 'email required' });

  const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID;
  const SD_SECRET = process.env.SUITEDASH_SECRET_KEY;
  if (SD_PUBLIC && SD_SECRET) {
    try {
      const sdRes = await fetch(`https://app.suitedash.com/secure-api/contacts?email=${encodeURIComponent(email)}&limit=1`, {
        headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET }
      });
      const contact = ((await sdRes.json())?.data || [])[0];
      if (contact?.id) {
        await fetch(`https://app.suitedash.com/secure-api/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'X-Public-ID': SD_PUBLIC, 'X-Secret-Key': SD_SECRET, 'Content-Type': 'application/json' },
          body: JSON.stringify({ custom_fields: { course_assigned: 'yes', course_progress: '0', course_assigned_date: new Date().toISOString() } })
        });
      }
    } catch(e) {}
  }

  return res.status(200).json({ success: true, assigned: email, course: COURSE });
}
