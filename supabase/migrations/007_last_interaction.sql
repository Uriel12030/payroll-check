-- ============================================================
-- Migration 007: Add last_interaction_at to leads + is_read to conversations
-- ============================================================

-- Track last email interaction on the lead for sorting/display
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz;

-- Backfill: use latest email conversation timestamp, fallback to created_at
UPDATE leads
SET last_interaction_at = COALESCE(
  (SELECT MAX(ec.last_message_at)
   FROM email_conversations ec
   WHERE ec.customer_id = leads.id),
  leads.created_at
);

ALTER TABLE leads ALTER COLUMN last_interaction_at SET DEFAULT now();
ALTER TABLE leads ALTER COLUMN last_interaction_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS leads_last_interaction_at_idx
  ON leads(last_interaction_at DESC);

-- Read/unread tracking on conversations
ALTER TABLE email_conversations ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT true;

-- Mark conversations with pending inbound messages as unread
UPDATE email_conversations SET is_read = false WHERE status = 'pending';
