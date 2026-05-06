import { setCors, isAdminRequest } from './services/auth.js';

// PA CROP Services — Auto-Generated Knowledge Base
// GET /api/knowledge-base (public — returns all KB articles)
// GET /api/knowledge-base?key=ADMIN&generate=true (generates new entries)

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const GROQ_KEY = process.env.GROQ_API_KEY;
  const generate = req.query?.generate === 'true';

  // Static knowledge base (always available)
  const KB = [
    { id: 'kb-1', q: 'What is a CROP?', a: 'A Commercial Registered Office Provider (CROP) is a licensed entity that provides registered office addresses to PA business entities under 15 Pa. C.S. § 109. Instead of using your home address, a CROP provides a professional business address for receiving legal documents and government correspondence.', category: 'basics' },
    { id: 'kb-2', q: 'When is my annual report due?', a: 'PA annual reports are due by the entity\'s anniversary date (the date it was originally formed or registered). For example, if your LLC was formed on March 15, your annual report is due every year by March 15. The filing fee is $7 at file.dos.pa.gov.', category: 'annual_reports' },
    { id: 'kb-3', q: 'What happens if I miss my annual report?', a: 'If you miss your annual report, you receive a "not in compliance" status. After continued non-compliance, PA DOS may initiate administrative dissolution. Dissolution means your entity loses its legal existence, liability protection ends, and you may lose your business name.', category: 'dissolution' },
    { id: 'kb-4', q: 'What is service of process?', a: 'Service of process is the delivery of legal documents (lawsuits, court orders, subpoenas) to your entity\'s registered office. As your CROP, we receive these documents, immediately scan them, and notify you by email and SMS so you can respond within the required timeframe.', category: 'legal' },
    { id: 'kb-5', q: 'How do I change my registered office?', a: 'File DSCB:15-108 (Change of Registered Office) at file.dos.pa.gov. The fee is $5. If you\'re switching to PA CROP Services, we handle the filing for you as part of your onboarding.', category: 'procedures' },
    { id: 'kb-6', q: 'Do I need a CROP if I have a physical office?', a: 'Not necessarily, but a CROP provides benefits even with a physical office: someone is always available during business hours to accept legal documents, you get professional handling of correspondence, and compliance monitoring ensures you never miss a deadline.', category: 'basics' },
  ];

  // Generate additional entries via Groq if requested
  if (generate && GROQ_KEY && isAdminRequest(req)) {
    try {
      const genRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', max_tokens: 800,
          messages: [
            { role: 'system', content: 'Generate 5 knowledge base articles for a PA CROP service. Each should answer a real question PA business owners ask. Respond ONLY with JSON: {"articles":[{"q":"question","a":"answer (2-3 sentences)","category":"basics|annual_reports|dissolution|legal|procedures|taxes"}]}' },
            { role: 'user', content: `Generate 5 NEW knowledge base articles not covered by these existing topics: ${KB.map(k => k.q).join(', ')}` }
          ]
        })
      });
      const text = (await genRes.json())?.choices?.[0]?.message?.content || '';
      try {
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        const newArticles = (parsed.articles || []).map((a, i) => ({ id: `kb-gen-${Date.now()}-${i}`, ...a, generated: true }));
        return res.status(200).json({ success: true, articles: [...KB, ...newArticles], generated: newArticles.length });
      } catch(e) {}
    } catch(e) {}
  }

  // Search if query provided
  const search = req.query?.q?.toLowerCase();
  if (search) {
    const results = KB.filter(k => k.q.toLowerCase().includes(search) || k.a.toLowerCase().includes(search));
    return res.status(200).json({ success: true, query: search, results, total: results.length });
  }

  return res.status(200).json({ success: true, articles: KB, total: KB.length });
}
