-- ============================================================
-- Migration 004: Email conversations for admin ↔ lead messaging
-- ============================================================

-- ============================================================
-- TABLE: email_conversations
-- ============================================================
create table if not exists email_conversations (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references leads(id) on delete cascade,
  subject         text not null,
  status          text not null default 'open'
                    check (status in ('open', 'pending', 'closed')),
  reply_token     text unique not null default encode(gen_random_bytes(12), 'hex'),
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- ============================================================
-- TABLE: email_messages
-- ============================================================
create table if not exists email_messages (
  id                  uuid primary key default gen_random_uuid(),
  conversation_id     uuid not null references email_conversations(id) on delete cascade,
  direction           text not null check (direction in ('inbound', 'outbound')),
  from_email          text not null,
  to_email            text not null,
  subject             text,
  text_body           text,
  html_body           text,
  provider            text not null default 'resend',
  provider_message_id text,
  headers             jsonb,
  occurred_at         timestamptz not null default now(),
  created_by_admin_id uuid,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- TABLE: inbound_unmatched
-- Stores inbound emails that could not be matched to a lead.
-- ============================================================
create table if not exists inbound_unmatched (
  id                  uuid primary key default gen_random_uuid(),
  from_email          text not null,
  to_email            text not null,
  subject             text,
  text_body           text,
  html_body           text,
  headers             jsonb,
  raw_payload         jsonb,
  created_at          timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists email_conversations_customer_last_msg_idx
  on email_conversations(customer_id, last_message_at desc);

create index if not exists email_messages_conversation_occurred_idx
  on email_messages(conversation_id, occurred_at asc);

create index if not exists email_conversations_reply_token_idx
  on email_conversations(reply_token);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table email_conversations enable row level security;
alter table email_messages enable row level security;
alter table inbound_unmatched enable row level security;

-- Authenticated admin users can fully manage email conversations
create policy "Admin can read email_conversations"
  on email_conversations for select
  to authenticated
  using (true);

create policy "Admin can insert email_conversations"
  on email_conversations for insert
  to authenticated
  with check (true);

create policy "Admin can update email_conversations"
  on email_conversations for update
  to authenticated
  using (true)
  with check (true);

create policy "Admin can delete email_conversations"
  on email_conversations for delete
  to authenticated
  using (true);

-- Authenticated admin users can fully manage email messages
create policy "Admin can read email_messages"
  on email_messages for select
  to authenticated
  using (true);

create policy "Admin can insert email_messages"
  on email_messages for insert
  to authenticated
  with check (true);

create policy "Admin can update email_messages"
  on email_messages for update
  to authenticated
  using (true)
  with check (true);

-- Authenticated admin users can read unmatched inbound emails
create policy "Admin can read inbound_unmatched"
  on inbound_unmatched for select
  to authenticated
  using (true);

-- ============================================================
-- Enable Realtime for email_messages (for live updates in UI)
-- Run this manually in Supabase Dashboard → SQL Editor if needed:
--   alter publication supabase_realtime add table email_messages;
-- ============================================================
