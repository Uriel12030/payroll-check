# Payroll Check

A production-ready legal lead intake and admin review system built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS**
- **Supabase** (Postgres + Storage)
- **Supabase Auth** (admin only)
- **Zod** for validation
- **Server Actions** for all writes
- **RLS** enforced on all tables
- **Private Storage** bucket for file uploads

## Architecture

```
/src
  /app
    /                    → Landing page
    /intake              → 7-step wizard (public)
    /thank-you           → Confirmation page
    /admin
      /login             → Admin login
      /leads             → Lead list with filters
      /leads/[id]        → Lead detail view
    /api/admin/leads/[id]/pdf → PDF export
  /components
    /intake              → Wizard step components + context
    /admin               → Admin UI components
    /ui                  → Shared UI primitives
  /lib
    /supabase            → Client, server, middleware helpers
    /validations         → Zod schemas for each wizard step
    /scoring.ts          → Lead scoring algorithm
    /utils.ts            → Utility functions
  /actions               → Server actions (submitLead, updateLead)
  /types                 → TypeScript type definitions
/supabase/migrations     → SQL migration files
/scripts                 → Cleanup scripts
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Run Supabase migrations

In the [Supabase Dashboard](https://app.supabase.com) → SQL Editor, run in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`

### 4. Create Storage bucket

In Supabase Dashboard → Storage:
- Create bucket named: **`lead-files`**
- Set to **Private** (not public)
- No public access policy needed — signed URLs are used

### 5. Create admin user

In Supabase Dashboard → Authentication → Users:
- Add a user with email/password
- This user will be the admin

### 6. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page with CTA |
| `/intake` | 7-step intake wizard |
| `/thank-you` | Confirmation with reference ID |
| `/admin/login` | Admin authentication |
| `/admin/leads` | Lead list with search/filter |
| `/admin/leads/[id]` | Lead detail, status, notes, files |

## Lead Scoring

Rule-based score (0–100):

| Rule | Points |
|------|--------|
| No pension provided | +25 |
| Unpaid overtime with hours estimate | +25 |
| No travel reimbursement | +10 |
| Vacation balance issue | +10 |
| Sick days issue | +10 |
| Fired or laid off | +10 |
| Still employed or ended < 12 months ago | +5 |

> **Disclaimer**: Automated screening only. Not legal advice.

## Data Retention Cleanup

To delete leads and files older than 60 days:

```bash
npx ts-node scripts/cleanup-old-leads.ts
```

Recommended: schedule this as a weekly cron job or Supabase Edge Function.

## Security

- All writes use **service role** server actions (bypasses RLS safely server-side)
- Public users have **no read access** to any table
- Authenticated admins can read and update leads
- Storage files are in a **private bucket** — signed URLs expire after 1 hour
- Consent is required and validated before any data is stored
- Admin routes are protected by middleware + layout-level auth checks

## Vercel Environment Variables (Production)

Set **all four** variables in Vercel **Project Settings → Environment Variables** (applies to Production, Preview, and Development environments as appropriate):

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | From Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | From Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Server-only** — never exposed to the browser |
| `ADMIN_ALLOWLIST_EMAILS` | Yes | Comma-separated admin emails, e.g. `admin@example.com` |

> **Important:** If `ADMIN_ALLOWLIST_EMAILS` is missing or empty, no one will be able to access `/admin`.
> Missing any of the Supabase variables causes a hard startup error (fail-fast) rather than a silent mismatch.

## Production Deployment

1. Deploy to **Vercel** (recommended):
   ```bash
   vercel deploy
   ```

2. Set all environment variables in Vercel dashboard (see table above).

3. Ensure `SUPABASE_SERVICE_ROLE_KEY` is **never** exposed to the client.

## How to verify in production

After setting env vars and redeploying, run through this checklist:

- [ ] **Set env vars in Vercel** – all four variables configured in Project Settings.
- [ ] **Redeploy** – trigger a fresh deployment after setting variables (changes take effect on next deploy).
- [ ] **Visit `/admin/login`** – should show the login form without redirect loops (`ERR_TOO_MANY_REDIRECTS` = env vars or middleware bug).
- [ ] **Log in** with an email listed in `ADMIN_ALLOWLIST_EMAILS`.
- [ ] **Confirm `/admin/leads` loads** – should show the lead list table.
- [ ] **Confirm lead updates work** – change a lead's status; should persist without errors.
- [ ] **Confirm file upload works** – submit a test intake form at `/intake` with an attachment; the file should appear in the lead detail view.
- [ ] **Visit `/admin/health`** – should show Supabase URL (masked), session email, `isAdmin: true`, and DB connectivity confirmation.
- [ ] **Non-allowlisted user** – log in with a non-admin Supabase user; should be redirected back to `/admin/login`.

---

> הבדיקה היא ממוחשבת בלבד ואינה מהווה ייעוץ משפטי.
> © 2024 Payroll Check
