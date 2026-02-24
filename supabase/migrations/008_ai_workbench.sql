-- ============================================================
-- Migration 008: AI Workbench – extend email_messages + case_ai_state
-- ============================================================

-- ── email_messages: add draft/status workflow columns ──

ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent'
    CHECK (status IN ('draft', 'sent', 'failed'));

ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'he';

ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS hebrew_translation text;

ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS ai_metadata jsonb;

ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Back-fill: existing messages are already sent
UPDATE email_messages SET sent_at = occurred_at WHERE sent_at IS NULL;

-- Index for quick draft lookup per lead
CREATE INDEX IF NOT EXISTS email_messages_status_idx
  ON email_messages(status) WHERE status = 'draft';

-- ── case_ai_state: add workbench columns ──

ALTER TABLE case_ai_state
  ADD COLUMN IF NOT EXISTS summary_he text NOT NULL DEFAULT '';

ALTER TABLE case_ai_state
  ADD COLUMN IF NOT EXISTS missing_info_he jsonb NOT NULL DEFAULT '[]';

ALTER TABLE case_ai_state
  ADD COLUMN IF NOT EXISTS recommended_questions jsonb NOT NULL DEFAULT '[]';

ALTER TABLE case_ai_state
  ADD COLUMN IF NOT EXISTS documents_checklist jsonb NOT NULL DEFAULT '[]';

ALTER TABLE case_ai_state
  ADD COLUMN IF NOT EXISTS risk_notes_internal jsonb NOT NULL DEFAULT '[]';

ALTER TABLE case_ai_state
  ADD COLUMN IF NOT EXISTS workbench_ai_metadata jsonb;

ALTER TABLE case_ai_state
  ADD COLUMN IF NOT EXISTS workbench_generated_at timestamptz;
