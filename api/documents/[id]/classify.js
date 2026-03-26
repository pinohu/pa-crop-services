import { setCors, authenticateRequest } from '../../services/auth.js';
import * as db from '../../services/db.js';

const CLASSIFICATION_RULES = {
  'irs': { document_type: 'tax_notice', urgency: 'high' },
  'internal revenue': { document_type: 'tax_notice', urgency: 'high' },
  'department of state': { document_type: 'government_notice', urgency: 'high' },
  'dos': { document_type: 'government_notice', urgency: 'normal' },
  'annual report': { document_type: 'annual_report', urgency: 'normal' },
  'service of process': { document_type: 'service_of_process', urgency: 'critical' },
  'summons': { document_type: 'service_of_process', urgency: 'critical' },
  'complaint': { document_type: 'service_of_process', urgency: 'critical' },
  'subpoena': { document_type: 'service_of_process', urgency: 'critical' },
  'certificate': { document_type: 'certificate', urgency: 'normal' },
  'invoice': { document_type: 'invoice', urgency: 'normal' },
  'tax': { document_type: 'tax_notice', urgency: 'high' },
  'dissolution': { document_type: 'government_notice', urgency: 'critical' },
  'reinstatement': { document_type: 'government_notice', urgency: 'high' }
};

function classifyByContent(filename, extractedText) {
  const searchText = `${filename || ''} ${extractedText || ''}`.toLowerCase();
  const entities = [];

  for (const [keyword, classification] of Object.entries(CLASSIFICATION_RULES)) {
    if (searchText.includes(keyword)) {
      return { ...classification, extracted_entities: entities, match_keyword: keyword };
    }
  }

  // Extract potential entities from text
  const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{1,2},?\s*\d{4})\b/g;
  const dollarPattern = /\$[\d,]+\.?\d*/g;
  const casePattern = /(?:case|docket|no\.?)\s*#?\s*[\w-]+/gi;

  for (const match of searchText.matchAll(datePattern)) entities.push({ type: 'date', value: match[0] });
  for (const match of searchText.matchAll(dollarPattern)) entities.push({ type: 'amount', value: match[0] });
  for (const match of searchText.matchAll(casePattern)) entities.push({ type: 'case_number', value: match[0] });

  return { document_type: 'general_mail', urgency: 'normal', extracted_entities: entities };
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method_not_allowed' });

  const session = await authenticateRequest(req);
  if (!session.valid) return res.status(401).json({ success: false, error: 'unauthenticated' });

  try {
    const { document_type, urgency, filename, extracted_text } = req.body || {};

    // If manual classification provided, use it; otherwise auto-classify
    let classification;
    if (document_type) {
      classification = {
        document_type,
        urgency: urgency || 'normal',
        extracted_entities: [],
        method: 'manual'
      };
    } else {
      classification = classifyByContent(filename, extracted_text);
      classification.method = 'auto';
    }

    const doc = await db.updateDocument(req.query.id, {
      document_type: classification.document_type,
      urgency: classification.urgency,
      processed_at: new Date().toISOString(),
      review_status: classification.method === 'manual' ? 'reviewed' : 'auto_classified',
      extracted_entities: classification.extracted_entities
    });

    await db.writeAuditEvent({
      actor_type: classification.method === 'manual' ? 'client' : 'system',
      actor_id: classification.method === 'manual' ? session.clientId : 'classifier',
      event_type: 'document.classified', target_type: 'document', target_id: req.query.id,
      after_json: classification, reason: `${classification.method}_classification`
    });

    return res.status(200).json({
      success: true,
      classification: {
        document_type: classification.document_type,
        urgency: classification.urgency,
        extracted_entities: classification.extracted_entities,
        method: classification.method
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
