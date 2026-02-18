-- ============================================================
-- Migration 001: Initial schema for Payroll Check
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE: leads
-- ============================================================
create table if not exists leads (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  status                  text not null default 'new'
                            check (status in ('new', 'reviewing', 'rejected', 'accepted')),

  -- Contact
  full_name               text not null,
  phone                   text not null,
  email                   text not null,
  city                    text not null,

  -- Employment
  employer_name           text not null,
  role_title              text not null,
  employment_type         text not null,
  start_date              date not null,
  end_date                date,
  still_employed          boolean not null default false,
  avg_monthly_salary      numeric(12, 2) not null,

  -- Overtime & attendance
  paid_overtime           text not null,
  overtime_hours_estimate text,
  attendance_tracking     text not null,

  -- Benefits
  pension_provided        text not null,
  pension_rate_known      text,
  travel_reimbursement    text not null,
  vacation_balance_issue  text not null,
  sick_days_issue         text not null,

  -- Termination
  termination_type        text,
  termination_date        date,
  reason_for_check        text not null,

  -- Consent & marketing
  consent                 boolean not null,
  marketing_source        text,

  -- Scoring
  lead_score              int,
  lead_flags              jsonb,

  -- Admin
  admin_notes             text
);

-- ============================================================
-- TABLE: files
-- ============================================================
create table if not exists files (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references leads(id) on delete cascade,
  created_at        timestamptz not null default now(),
  file_type         text,
  original_filename text not null,
  storage_path      text not null,
  mime_type         text not null,
  size_bytes        int not null
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists leads_status_idx on leads(status);
create index if not exists leads_created_at_idx on leads(created_at desc);
create index if not exists leads_email_idx on leads(email);
create index if not exists files_lead_id_idx on files(lead_id);
