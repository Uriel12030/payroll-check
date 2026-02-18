-- ============================================================
-- Migration 002: Row Level Security policies
-- ============================================================

-- Enable RLS on both tables
alter table leads enable row level security;
alter table files enable row level security;

-- ============================================================
-- LEADS policies
-- ============================================================

-- Authenticated admin users can read all leads
create policy "Admin can read leads"
  on leads for select
  to authenticated
  using (true);

-- Authenticated admin users can update leads (status, notes)
create policy "Admin can update leads"
  on leads for update
  to authenticated
  using (true)
  with check (true);

-- Service role inserts via server actions (anon cannot insert directly)
-- Public has NO read, NO insert via client SDK
-- Inserts are done server-side using the service role key

-- ============================================================
-- FILES policies
-- ============================================================

-- Authenticated admin users can read file metadata
create policy "Admin can read files"
  on files for select
  to authenticated
  using (true);

-- ============================================================
-- STORAGE: lead-files bucket
-- Setup note: Create this bucket manually in Supabase dashboard
-- and set it to PRIVATE (not public).
-- Signed URLs are generated server-side for admin access.
-- ============================================================
