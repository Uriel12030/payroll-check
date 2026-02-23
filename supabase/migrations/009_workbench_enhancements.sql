-- Migration 009: Workbench enhancements
-- Adds missing_info_he, risk_notes_internal_he to case_ai_state
-- These fields come from the enhanced workbench analysis prompt.

-- 1. Add missing_info_he column (array of strings)
alter table case_ai_state
  add column if not exists missing_info_he jsonb default '[]'::jsonb;

-- 2. Add risk_notes_internal_he column (array of strings, internal only)
alter table case_ai_state
  add column if not exists risk_notes_internal_he jsonb default '[]'::jsonb;

-- Note: documents_requested already exists as jsonb from migration 008.
-- The priority field is stored inside the jsonb array elements and does not need a schema change.
