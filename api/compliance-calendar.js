import * as db from './services/db.js';
import { setCors, authenticateRequest } from './services/auth.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Allow token as query param for calendar subscription
  const token = req.query.token || (req.headers.authorization || '').replace('Bearer ', '');
  let orgId = req.query.org;

  if (!orgId && token) {
    try {
      const { authenticateRequest: auth } = await import('./services/auth.js');
      const fakeReq = { headers: { authorization: `Bearer ${token}` } };
      const session = await auth(fakeReq);
      if (session.valid) orgId = session.orgId;
    } catch {}
  }

  if (!orgId) return res.status(400).json({ success: false, error: 'org_id_required' });

  try {
    const org = await db.getOrganization(orgId);
    const obligations = await db.getObligationsForOrg(orgId);
    const notifications = await db.getNotificationsForOrg(orgId);

    const now = new Date();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//PA CROP Services//Compliance Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${org?.legal_name || 'PA CROP'} Compliance`,
    ];

    for (const obl of obligations) {
      if (['closed', 'filed_confirmed'].includes(obl.obligation_status)) continue;
      const due = obl.due_date.replace(/-/g, '');
      const uid = `obl-${obl.id}@pacropservices.com`;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTART;VALUE=DATE:${due}`);
      lines.push(`SUMMARY:${obl.obligation_type.replace(/_/g, ' ').toUpperCase()} DUE — ${org?.legal_name || 'Entity'}`);
      lines.push(`DESCRIPTION:Filing fee: $${obl.fee_usd}. File at https://file.dos.pa.gov`);
      lines.push('STATUS:CONFIRMED');
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-P7D');
      lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:Annual report due in 7 days');
      lines.push('END:VALARM');
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-P30D');
      lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:Annual report due in 30 days');
      lines.push('END:VALARM');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${(org?.legal_name || 'compliance').replace(/[^a-zA-Z0-9]/g, '_')}_calendar.ics"`);
    return res.status(200).send(lines.join('\r\n'));
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
