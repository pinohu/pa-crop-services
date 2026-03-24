-- PA CROP Services — Rules Starter Dataset
-- Source: TECHNICAL-SPECIFICATION.md section 4, data/compliance-rules.json
-- Authority: PA Department of State, 15 Pa.C.S. § 146, Act 122 of 2022
-- Version: 2026-03-24
--
-- Run after 001_schema.sql:
--   psql $DATABASE_URL -f infrastructure/migrations/002_seed_rules.sql

-- ============================================================
-- Pennsylvania Annual Report Rules
-- 3 deadline groups × 12 entity types
-- ============================================================

-- ── CORPORATIONS (June 30 deadline) ─────────────────────────

insert into rules (jurisdiction, entity_type, obligation_type, version, effective_date, is_active, authority_source, authority_url, rule_json) values
('PA', 'domestic_business_corp', 'annual_report', '2026.1', '2025-01-01', true,
 'Pennsylvania Department of State',
 'https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports',
 '{
   "due_date_rule": {"type": "fixed_annual", "month": 6, "day": 30},
   "fee": {"amount_usd": 7},
   "enforcement": {
     "type": "administrative_dissolution",
     "delay_months": 6,
     "enforcement_start_year": 2027,
     "consequence": "administrative dissolution"
   },
   "filing": {
     "method": "online",
     "url": "https://file.dos.pa.gov",
     "form": "DSCB:15-146",
     "client_action_required": true
   },
   "reinstatement": {"available": true, "form": "DSCB:15-4007"},
   "reminders": [
     {"days_before": 90, "priority": "info"},
     {"days_before": 60, "priority": "info"},
     {"days_before": 30, "priority": "warning"},
     {"days_before": 14, "priority": "urgent"},
     {"days_before": 7, "priority": "critical"}
   ],
   "source": {
     "authority_name": "Pennsylvania Department of State",
     "citation_title": "15 Pa.C.S. § 146 — Annual report",
     "authority_url": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports"
   },
   "notes": ["Effective 2025-01-01 per Act 122 of 2022", "Grace period for 2025-2026 reports — no dissolution"]
 }'::jsonb),

('PA', 'foreign_business_corp', 'annual_report', '2026.1', '2025-01-01', true,
 'Pennsylvania Department of State',
 'https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports',
 '{
   "due_date_rule": {"type": "fixed_annual", "month": 6, "day": 30},
   "fee": {"amount_usd": 7},
   "enforcement": {
     "type": "termination_of_authority",
     "delay_months": 6,
     "enforcement_start_year": 2027,
     "consequence": "termination of authority to do business in PA"
   },
   "filing": {
     "method": "online",
     "url": "https://file.dos.pa.gov",
     "form": "DSCB:15-146",
     "client_action_required": true
   },
   "reinstatement": {"available": false, "note": "Foreign entities cannot reinstate — must re-register as new foreign entity"},
   "reminders": [
     {"days_before": 90, "priority": "info"},
     {"days_before": 60, "priority": "info"},
     {"days_before": 30, "priority": "warning"},
     {"days_before": 14, "priority": "urgent"},
     {"days_before": 7, "priority": "critical"}
   ],
   "source": {
     "authority_name": "Pennsylvania Department of State",
     "citation_title": "15 Pa.C.S. § 146 — Annual report",
     "authority_url": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports"
   },
   "notes": ["Foreign corps CANNOT reinstate — this is critical for client communications"]
 }'::jsonb),

('PA', 'domestic_nonprofit_corp', 'annual_report', '2026.1', '2025-01-01', true,
 'Pennsylvania Department of State',
 'https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports',
 '{
   "due_date_rule": {"type": "fixed_annual", "month": 6, "day": 30},
   "fee": {"amount_usd": 0},
   "enforcement": {
     "type": "administrative_dissolution",
     "delay_months": 6,
     "enforcement_start_year": 2027,
     "consequence": "administrative dissolution"
   },
   "filing": {
     "method": "online",
     "url": "https://file.dos.pa.gov",
     "form": "DSCB:15-146",
     "client_action_required": true
   },
   "reinstatement": {"available": true, "form": "DSCB:15-4007"},
   "reminders": [
     {"days_before": 90, "priority": "info"},
     {"days_before": 60, "priority": "info"},
     {"days_before": 30, "priority": "warning"},
     {"days_before": 14, "priority": "urgent"},
     {"days_before": 7, "priority": "critical"}
   ],
   "source": {
     "authority_name": "Pennsylvania Department of State",
     "citation_title": "15 Pa.C.S. § 146 — Annual report",
     "authority_url": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports"
   },
   "notes": ["$0 fee for nonprofits and LLCs/LPs with not-for-profit purpose"]
 }'::jsonb),

('PA', 'foreign_nonprofit_corp', 'annual_report', '2026.1', '2025-01-01', true,
 'Pennsylvania Department of State',
 'https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports',
 '{
   "due_date_rule": {"type": "fixed_annual", "month": 6, "day": 30},
   "fee": {"amount_usd": 0},
   "enforcement": {
     "type": "termination_of_authority",
     "delay_months": 6,
     "enforcement_start_year": 2027,
     "consequence": "termination of authority"
   },
   "filing": {
     "method": "online",
     "url": "https://file.dos.pa.gov",
     "form": "DSCB:15-146",
     "client_action_required": true
   },
   "reinstatement": {"available": false, "note": "Foreign entities cannot reinstate"},
   "reminders": [
     {"days_before": 90, "priority": "info"},
     {"days_before": 60, "priority": "info"},
     {"days_before": 30, "priority": "warning"},
     {"days_before": 14, "priority": "urgent"},
     {"days_before": 7, "priority": "critical"}
   ],
   "source": {
     "authority_name": "Pennsylvania Department of State",
     "citation_title": "15 Pa.C.S. § 146 — Annual report",
     "authority_url": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports"
   },
   "notes": ["$0 fee for nonprofits"]
 }'::jsonb),

-- ── LLCs (September 30 deadline) ────────────────────────────

('PA', 'domestic_llc', 'annual_report', '2026.1', '2025-01-01', true,
 'Pennsylvania Department of State',
 'https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports',
 '{
   "due_date_rule": {"type": "fixed_annual", "month": 9, "day": 30},
   "fee": {"amount_usd": 7},
   "enforcement": {
     "type": "administrative_dissolution",
     "delay_months": 6,
     "enforcement_start_year": 2027,
     "consequence": "administrative dissolution"
   },
   "filing": {
     "method": "online",
     "url": "https://file.dos.pa.gov",
     "form": "DSCB:15-146",
     "client_action_required": true
   },
   "reinstatement": {"available": true, "form": "DSCB:15-4007"},
   "reminders": [
     {"days_before": 90, "priority": "info"},
     {"days_before": 60, "priority": "info"},
     {"days_before": 30, "priority": "warning"},
     {"days_before": 14, "priority": "urgent"},
     {"days_before": 7, "priority": "critical"}
   ],
   "source": {
     "authority_name": "Pennsylvania Department of State",
     "citation_title": "15 Pa.C.S. § 146 — Annual report",
     "authority_url": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports"
   },
   "notes": ["Most common entity type for PA CROP clients"]
 }'::jsonb),

('PA', 'foreign_llc', 'annual_report', '2026.1', '2025-01-01', true,
 'Pennsylvania Department of State',
 'https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports',
 '{
   "due_date_rule": {"type": "fixed_annual", "month": 9, "day": 30},
   "fee": {"amount_usd": 7},
   "enforcement": {
     "type": "cancellation_of_registration",
     "delay_months": 6,
     "enforcement_start_year": 2027,
     "consequence": "cancellation of registration — must re-register"
   },
   "filing": {
     "method": "online",
     "url": "https://file.dos.pa.gov",
     "form": "DSCB:15-146",
     "client_action_required": true
   },
   "reinstatement": {"available": false, "note": "Foreign LLCs cannot reinstate after cancellation — must file new foreign registration"},
   "reminders": [
     {"days_before": 90, "priority": "info"},
     {"days_before": 60, "priority": "info"},
     {"days_before": 30, "priority": "warning"},
     {"days_before": 14, "priority": "urgent"},
     {"days_before": 7, "priority": "critical"}
   ],
   "source": {
     "authority_name": "Pennsylvania Department of State",
     "citation_title": "15 Pa.C.S. § 146 — Annual report",
     "authority_url": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports"
   },
   "notes": ["Foreign LLCs face cancellation, not dissolution — cannot reinstate"]
 }'::jsonb),

-- ── OTHERS (December 31 deadline) ───────────────────────────

('PA', 'domestic_lp', 'annual_report', '2026.1', '2025-01-01', true,
 'Pennsylvania Department of State',
 'https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports',
 '{
   "due_date_rule": {"type": "fixed_annual", "month": 12, "day": 31},
   "fee": {"amount_usd": 7},
   "enforcement": {
     "type": "administrative_dissolution",
     "delay_months": 6,
     "enforcement_start_year": 2027,
     "consequence": "administrative dissolution"
   },
   "filing": {
     "method": "online",
     "url": "https://file.dos.pa.gov",
     "form": "DSCB:15-146",
     "client_action_required": true
   },
   "reinstatement": {"available": true, "form": "DSCB:15-4007"},
   "reminders": [
     {"days_before": 90, "priority": "info"},
     {"days_before": 60, "priority": "info"},
     {"days_before": 30, "priority": "warning"},
     {"days_before": 14, "priority": "urgent"},
     {"days_before": 7, "priority": "critical"}
   ],
   "source": {
     "authority_name": "Pennsylvania Department of State",
     "citation_title": "15 Pa.C.S. § 146 — Annual report",
     "authority_url": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports"
   },
   "notes": ["Limited partnerships file by Dec 31"]
 }'::jsonb),

('PA', 'foreign_lp', 'annual_report', '2026.1', '2025-01-01', true,
 'Pennsylvania Department of State',
 'https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports',
 '{
   "due_date_rule": {"type": "fixed_annual", "month": 12, "day": 31},
   "fee": {"amount_usd": 7},
   "enforcement": {
     "type": "cancellation_of_registration",
     "delay_months": 6,
     "enforcement_start_year": 2027,
     "consequence": "cancellation of registration"
   },
   "filing": {"method": "online", "url": "https://file.dos.pa.gov", "form": "DSCB:15-146", "client_action_required": true},
   "reinstatement": {"available": false, "note": "Foreign LPs cannot reinstate"},
   "reminders": [{"days_before": 90}, {"days_before": 60}, {"days_before": 30}, {"days_before": 14}, {"days_before": 7}],
   "source": {"authority_name": "Pennsylvania Department of State", "citation_title": "15 Pa.C.S. § 146", "authority_url": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports"},
   "notes": []
 }'::jsonb),

('PA', 'domestic_llp', 'annual_report', '2026.1', '2025-01-01', true,
 'Pennsylvania Department of State',
 'https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports',
 '{
   "due_date_rule": {"type": "fixed_annual", "month": 12, "day": 31},
   "fee": {"amount_usd": 7},
   "enforcement": {"type": "administrative_dissolution", "delay_months": 6, "enforcement_start_year": 2027, "consequence": "administrative dissolution"},
   "filing": {"method": "online", "url": "https://file.dos.pa.gov", "form": "DSCB:15-146", "client_action_required": true},
   "reinstatement": {"available": true, "form": "DSCB:15-4007"},
   "reminders": [{"days_before": 90}, {"days_before": 60}, {"days_before": 30}, {"days_before": 14}, {"days_before": 7}],
   "source": {"authority_name": "Pennsylvania Department of State", "citation_title": "15 Pa.C.S. § 146", "authority_url": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports"},
   "notes": ["Limited liability partnerships file by Dec 31"]
 }'::jsonb),

('PA', 'foreign_llp', 'annual_report', '2026.1', '2025-01-01', true,
 'Pennsylvania Department of State',
 'https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports',
 '{
   "due_date_rule": {"type": "fixed_annual", "month": 12, "day": 31},
   "fee": {"amount_usd": 7},
   "enforcement": {"type": "cancellation_of_registration", "delay_months": 6, "enforcement_start_year": 2027, "consequence": "cancellation of registration"},
   "filing": {"method": "online", "url": "https://file.dos.pa.gov", "form": "DSCB:15-146", "client_action_required": true},
   "reinstatement": {"available": false, "note": "Foreign LLPs cannot reinstate"},
   "reminders": [{"days_before": 90}, {"days_before": 60}, {"days_before": 30}, {"days_before": 14}, {"days_before": 7}],
   "source": {"authority_name": "Pennsylvania Department of State", "citation_title": "15 Pa.C.S. § 146", "authority_url": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports"},
   "notes": []
 }'::jsonb),

('PA', 'professional_association', 'annual_report', '2026.1', '2025-01-01', true,
 'Pennsylvania Department of State',
 'https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports',
 '{
   "due_date_rule": {"type": "fixed_annual", "month": 12, "day": 31},
   "fee": {"amount_usd": 7},
   "enforcement": {"type": "administrative_dissolution", "delay_months": 6, "enforcement_start_year": 2027, "consequence": "administrative dissolution"},
   "filing": {"method": "online", "url": "https://file.dos.pa.gov", "form": "DSCB:15-146", "client_action_required": true},
   "reinstatement": {"available": true, "form": "DSCB:15-4007"},
   "reminders": [{"days_before": 90}, {"days_before": 60}, {"days_before": 30}, {"days_before": 14}, {"days_before": 7}],
   "source": {"authority_name": "Pennsylvania Department of State", "citation_title": "15 Pa.C.S. § 146", "authority_url": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports"},
   "notes": ["Professional associations, business trusts, and other filing entities"]
 }'::jsonb),

('PA', 'business_trust', 'annual_report', '2026.1', '2025-01-01', true,
 'Pennsylvania Department of State',
 'https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports',
 '{
   "due_date_rule": {"type": "fixed_annual", "month": 12, "day": 31},
   "fee": {"amount_usd": 7},
   "enforcement": {"type": "administrative_dissolution", "delay_months": 6, "enforcement_start_year": 2027, "consequence": "administrative dissolution"},
   "filing": {"method": "online", "url": "https://file.dos.pa.gov", "form": "DSCB:15-146", "client_action_required": true},
   "reinstatement": {"available": true, "form": "DSCB:15-4007"},
   "reminders": [{"days_before": 90}, {"days_before": 60}, {"days_before": 30}, {"days_before": 14}, {"days_before": 7}],
   "source": {"authority_name": "Pennsylvania Department of State", "citation_title": "15 Pa.C.S. § 146", "authority_url": "https://www.pa.gov/agencies/dos/programs/business/types-of-filings-and-registrations/annual-reports"},
   "notes": []
 }'::jsonb);

-- ============================================================
-- Verify
-- ============================================================

-- Should return 12 rows (one per entity type)
-- select jurisdiction, entity_type, (rule_json->'due_date_rule'->>'month')::int as due_month,
--        (rule_json->'fee'->>'amount_usd')::numeric as fee,
--        rule_json->'reinstatement'->>'available' as can_reinstate
-- from rules where is_active = true order by due_month, entity_type;
