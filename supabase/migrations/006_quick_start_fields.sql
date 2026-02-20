-- ============================================================
-- Migration 006: Add quick-start / language fields to leads
-- ============================================================

-- Language preference (he, en, ru, am)
alter table leads add column if not exists preferred_language text;

-- Quick-start bucket: how long with current employer
alter table leads add column if not exists years_with_employer_bucket text;

-- Quick-start employment type (separate from the detailed employment_type)
alter table leads add column if not exists employment_type_quick text;

-- Quick-start main issues selected (array of text)
alter table leads add column if not exists main_issues text[];

-- Allow empty required fields for quick-start partial leads
-- These fields were NOT NULL before; we make them nullable so a
-- quick-start lead can be created before the full form is filled.
alter table leads alter column full_name drop not null;
alter table leads alter column phone drop not null;
alter table leads alter column email drop not null;
alter table leads alter column city drop not null;
alter table leads alter column employer_name drop not null;
alter table leads alter column role_title drop not null;
alter table leads alter column employment_type drop not null;
alter table leads alter column start_date drop not null;
alter table leads alter column avg_monthly_salary drop not null;
alter table leads alter column paid_overtime drop not null;
alter table leads alter column attendance_tracking drop not null;
alter table leads alter column pension_provided drop not null;
alter table leads alter column travel_reimbursement drop not null;
alter table leads alter column vacation_balance_issue drop not null;
alter table leads alter column sick_days_issue drop not null;
alter table leads alter column reason_for_check drop not null;
alter table leads alter column consent drop not null;
