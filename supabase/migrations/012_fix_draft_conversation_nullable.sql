-- ============================================================
-- Migration 012: Make conversation_id nullable in case_ai_drafts
-- ============================================================
-- The Workbench can generate drafts without an existing conversation.
-- The original schema had conversation_id NOT NULL which caused insert
-- failures when drafts were generated from the Workbench without a
-- conversation context, resulting in "מזהה הטיוטה חסר" error.
-- ============================================================

ALTER TABLE case_ai_drafts
  ALTER COLUMN conversation_id DROP NOT NULL;
