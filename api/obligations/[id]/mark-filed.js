import { setCors, authenticateRequest, isAdminRequest } from '../../services/auth.js';
import { markFiled } from '../../services/obligations.js';
import { isValidUUID, isValidString } from '../../_validate.js';
import { createLogger } from '../../_log.js';

const log = createLogger('mark-filed');

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  // Two paths:
  //   - Admin (mailroom / Ike) marks a managed-filing obligation completed.
  //   - Authenticated client marks their own self-filing obligation completed.
  const isAdmin = isAdminRequest(req);
  const session = !isAdmin ? await authenticateRequest(req) : null;
  if (!isAdmin && (!session || !session.valid)) {
    return res.status(401).json({ success: false, error: 'unauthenticated' });
  }

  const obligationId = req.query.id;
  if (!obligationId || !isValidUUID(obligationId)) {
    return res.status(400).json({ success: false, error: 'invalid_obligation_id' });
  }

  const { proof_document_id, filing_reference } = req.body || {};
  if (proof_document_id !== undefined && !isValidUUID(proof_document_id)) {
    return res.status(400).json({ success: false, error: 'invalid_proof_document_id' });
  }
  if (filing_reference !== undefined && !isValidString(filing_reference, { minLength: 0, maxLength: 100 })) {
    return res.status(400).json({ success: false, error: 'filing_reference_too_long' });
  }

  try {
    const { getObligation } = await import('../../services/db.js');
    const obl = await getObligation(obligationId);
    if (!obl) return res.status(404).json({ success: false, error: 'not_found' });

    // Client path requires ownership. Admin path skips that check (admins
    // operate across all orgs by design).
    if (!isAdmin) {
      if (obl.organization_id !== session.orgId) {
        return res.status(403).json({ success: false, error: 'access_denied' });
      }
    }

    const actor = isAdmin
      ? { type: 'admin', id: 'dashboard' }
      : { type: 'client', id: session.clientId };

    await markFiled(obligationId,
      { proof_document_id, filing_reference },
      actor);
    return res.status(200).json({ success: true, obligation: obl });
  } catch (err) {
    log.error('mark_filed_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(400).json({ success: false, error: 'transition_failed' });
  }
}
