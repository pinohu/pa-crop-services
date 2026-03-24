import { setCors, authenticateRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    const org = await db.getOrganization(req.query.id);
    if (!org) return res.status(404).json({ success: false, error: 'not_found' });

    return res.status(200).json({
      success: true,
      prefill: {
        entity_name: org.legal_name,
        entity_number: org.dos_number,
        entity_type: org.entity_type,
        jurisdiction: org.jurisdiction,
        registered_office: org.registered_office_address || {
          street: '924 W 23rd St', city: 'Erie', state: 'PA', postal_code: '16502'
        },
        filing_url: 'https://file.dos.pa.gov',
        form_number: 'DSCB:15-146',
        fee: 7,
        instructions: [
          'Go to file.dos.pa.gov',
          'Search for your entity by name or number',
          'Select "Annual Report" filing',
          'Verify your registered office address',
          'Pay the $7 filing fee by credit card',
          'Save your confirmation number'
        ]
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
