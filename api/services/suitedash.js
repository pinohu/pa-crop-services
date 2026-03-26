import { logError } from '../_log.js';
// PA CROP Services — SuiteDash CRM Integration
// Maximally leverages SuiteDash as the CRM source of truth for clients + companies.
// SuiteDash owns: contacts, companies, onboarding status, portal access, file sharing, invoicing.
// The compliance engine (Neon Postgres) owns: obligations, rules, audit, AI conversations.
//
// SuiteDash API: https://app.suitedash.com/secure-api/swagger
// Auth: X-Public-ID + X-Secret-Key headers
// Rate limits: Pinnacle plan = 20,000 calls/month

const SD_BASE = 'https://app.suitedash.com/secure-api';
const SD_PUBLIC = process.env.SUITEDASH_PUBLIC_ID || '';
const SD_SECRET = process.env.SUITEDASH_SECRET_KEY || '';

function sdHeaders() {
  return {
    'X-Public-ID': SD_PUBLIC,
    'X-Secret-Key': SD_SECRET,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

function isConfigured() {
  return !!(SD_PUBLIC && SD_SECRET);
}

// ── Low-level fetch wrapper ────────────────────────────────

async function sdFetch(method, path, body) {
  if (!isConfigured()) return { success: false, error: 'suitedash_not_configured' };
  const opts = { method, headers: sdHeaders() };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);
  try {
    const resp = await fetch(`${SD_BASE}${path}`, opts);
    const data = await resp.json();
    return { success: resp.ok, status: resp.status, data };
  } catch (err) {
    logError("suitedash_request_failed", { method, path }, err);
    return { success: false, error: err.message };
  }
}

// ── Meta / Schema ──────────────────────────────────────────

export async function getMeta() {
  return sdFetch('GET', '/contact/meta');
}

// ── Contacts (People) ──────────────────────────────────────

export async function getContacts(params = {}) {
  const query = new URLSearchParams(params).toString();
  return sdFetch('GET', `/contacts${query ? '?' + query : ''}`);
}

export async function getContact(uid) {
  return sdFetch('GET', `/contact/${uid}`);
}

export async function getContactByEmail(email) {
  return sdFetch('GET', `/contacts?email=${encodeURIComponent(email)}`);
}

export async function createContact(contact) {
  // contact: { first_name, last_name, email, phone, role, company_uid, custom_fields, send_welcome_email }
  return sdFetch('POST', '/contact', contact);
}

export async function updateContact(uid, updates) {
  // updates: { first_name, last_name, phone, role, custom_fields, tags, ... }
  return sdFetch('PUT', `/contact/${uid}`, updates);
}

// ── Companies (Business Entities) ──────────────────────────

export async function getCompanies(params = {}) {
  const query = new URLSearchParams(params).toString();
  return sdFetch('GET', `/companies${query ? '?' + query : ''}`);
}

export async function getCompany(uid) {
  return sdFetch('GET', `/company/${uid}`);
}

export async function createCompany(company) {
  // company: { name, role (lead/prospect/client), primary_contact_uid, custom_fields, ... }
  return sdFetch('POST', '/company', company);
}

export async function updateCompany(uid, updates) {
  return sdFetch('PUT', `/company/${uid}`, updates);
}

// ── Custom Fields (Compliance Data in SuiteDash) ───────────
// We use SuiteDash custom fields to store compliance metadata on contacts/companies:
//   entity_type, dos_number, plan_code, compliance_status, risk_level,
//   next_deadline, last_filing_date, neon_org_id (links to Postgres)

export async function setComplianceFields(contactUid, fields) {
  // fields: { entity_type, dos_number, compliance_status, risk_level, next_deadline, neon_org_id }
  return updateContact(contactUid, { custom_fields: fields });
}

export async function setCompanyComplianceFields(companyUid, fields) {
  return updateCompany(companyUid, { custom_fields: fields });
}

// ── High-Level: Client Onboarding ──────────────────────────

export async function onboardClient({ email, firstName, lastName, phone, entityName, entityType, planCode, dosNumber }) {
  if (!isConfigured()) return { success: false, error: 'suitedash_not_configured' };

  // 1. Create company in SuiteDash
  const companyResult = await createCompany({
    name: entityName,
    role: 'client',
    custom_fields: {
      entity_type: entityType,
      dos_number: dosNumber || '',
      plan_code: planCode,
      compliance_status: 'active',
      onboarding_status: 'in_progress'
    }
  });

  // 2. Create contact as primary
  const contactResult = await createContact({
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || '',
    role: 'client',
    company_uid: companyResult.data?.uid,
    send_welcome_email: true,
    custom_fields: {
      plan_code: planCode,
      entity_type: entityType
    }
  });

  return {
    success: companyResult.success && contactResult.success,
    company_uid: companyResult.data?.uid,
    contact_uid: contactResult.data?.uid,
    company: companyResult.data,
    contact: contactResult.data
  };
}

// ── High-Level: Sync Compliance Status Back to SuiteDash ───

export async function syncComplianceStatus(contactUid, companyUid, { status, riskLevel, nextDeadline, lastFiling, neonOrgId }) {
  const fields = {
    compliance_status: status,
    risk_level: riskLevel,
    next_deadline: nextDeadline,
    last_filing_date: lastFiling || '',
    neon_org_id: neonOrgId || ''
  };

  const results = [];
  if (contactUid) results.push(await setComplianceFields(contactUid, fields));
  if (companyUid) results.push(await setCompanyComplianceFields(companyUid, fields));

  return { success: results.every(r => r.success), results };
}

// ── High-Level: Get All Clients with Compliance Context ────

export async function getAllClientsWithCompliance() {
  if (!isConfigured()) return [];
  const result = await getContacts({ limit: 500 });
  if (!result.success) return [];
  const contacts = Array.isArray(result.data) ? result.data : (result.data?.data || []);
  return contacts.map(c => ({
    uid: c.uid || c.id,
    email: c.email,
    name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
    phone: c.phone,
    role: c.role,
    company_uid: c.company_uid,
    company_name: c.company_name || c.company,
    // Custom fields
    entity_type: c.custom_fields?.entity_type || '',
    dos_number: c.custom_fields?.dos_number || '',
    plan_code: c.custom_fields?.plan_code || 'compliance_only',
    compliance_status: c.custom_fields?.compliance_status || 'unknown',
    risk_level: c.custom_fields?.risk_level || 'unknown',
    next_deadline: c.custom_fields?.next_deadline || '',
    neon_org_id: c.custom_fields?.neon_org_id || '',
    onboarding_status: c.custom_fields?.onboarding_status || 'not_started',
    created_at: c.created_at
  }));
}

// ── High-Level: Find Client by Email ───────────────────────

export async function findClientByEmail(email) {
  if (!isConfigured()) return null;
  const result = await getContactByEmail(email);
  if (!result.success) return null;
  const contacts = Array.isArray(result.data) ? result.data : (result.data?.data || []);
  return contacts[0] || null;
}

// ── Export config check ────────────────────────────────────

export { isConfigured };
