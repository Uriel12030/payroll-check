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
- **Resend** for transactional email (admin email conversations)

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
    /api/admin/email/send     → Send email to lead
    /api/email/inbound/resend → Inbound webhook (Resend)
  /components
    /intake              → Wizard step components + context
    /admin               → Admin UI components
    /ui                  → Shared UI primitives
  /lib
    /supabase            → Client, server, middleware helpers
    /email               → Resend client, sanitization, webhook verification
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
3. `supabase/migrations/004_email_conversations.sql`

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
| `/admin/leads/[id]` | Lead detail, status, notes, files, emails |

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

## Admin Email Conversations

Admin users can send emails to leads and receive replies directly within the lead detail page.

### Setup

1. **Create a Resend account** at [resend.com](https://resend.com) and get an API key.

2. **Verify your sending domain** in Resend Dashboard → Domains. This is required for the `EMAIL_FROM` address (e.g., `support@yourdomain.com`).

3. **Configure inbound routing** in Resend Dashboard → Domains → Inbound:
   - Set the inbound domain (e.g., `inbound.yourdomain.com`).
   - Add a webhook endpoint pointing to: `https://your-app-url.com/api/email/inbound/resend`

4. **Create a webhook** in Resend Dashboard → Webhooks:
   - Subscribe to the `email.received` event.
   - URL: `https://your-app-url.com/api/email/inbound/resend`
   - Copy the signing secret for `RESEND_WEBHOOK_SECRET`.

5. **Set environment variables** (see `.env.local.example`):
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM=support@yourdomain.com
   EMAIL_INBOUND_DOMAIN=inbound.yourdomain.com
   RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
   ```

6. **Run migration** `004_email_conversations.sql` in Supabase SQL Editor.

7. **Enable Realtime** for the `email_messages` table:
   ```sql
   alter publication supabase_realtime add table email_messages;
   ```

### How it works

- Outbound emails are sent via Resend from the configured `EMAIL_FROM` address.
- Each conversation generates a unique `reply+<token>@<inbound-domain>` reply-to address.
- When the lead replies, Resend delivers the inbound email to the webhook endpoint.
- The webhook matches the reply token to the conversation, sanitizes HTML, and stores the message.
- The admin UI shows conversations and messages in realtime via Supabase Realtime.

### Testing locally

**Send an email** (requires admin session cookie):
```bash
curl -X POST http://localhost:3000/api/admin/email/send \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{
    "leadId": "<lead-uuid>",
    "subject": "Test from admin",
    "text": "Hello, this is a test email."
  }'
```

**Simulate an inbound webhook** (for local testing without real Resend signatures, temporarily disable signature verification or use a tool like [svix-cli](https://github.com/svix/svix-cli)):
```bash
curl -X POST http://localhost:3000/api/email/inbound/resend \
  -H "Content-Type: application/json" \
  -H "svix-id: msg_test123" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: v1,test" \
  -d '{
    "type": "email.received",
    "data": {
      "from": "lead@example.com",
      "to": ["reply+<token>@inbound.yourdomain.com"],
      "subject": "Re: Test from admin",
      "text": "Thanks for reaching out!",
      "html": "<p>Thanks for reaching out!</p>"
    }
  }'
```

> **Note:** The above curl for inbound will fail signature verification in production. For real testing, use Resend's test mode or the Svix CLI to generate valid signatures.

## Security

- All writes use **service role** server actions (bypasses RLS safely server-side)
- Public users have **no read access** to any table
- Authenticated admins can read and update leads
- Storage files are in a **private bucket** — signed URLs expire after 1 hour
- Consent is required and validated before any data is stored
- Admin routes are protected by middleware + layout-level auth checks
- Inbound email webhooks are verified using Svix signatures (Resend)
- Inbound HTML is sanitized with `sanitize-html` before storage and rendering
- Email tables have RLS policies restricted to authenticated (admin) users

## Vercel Environment Variables (Production)

Set **all four** variables in Vercel **Project Settings → Environment Variables** (applies to Production, Preview, and Development environments as appropriate):

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | From Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | From Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | **Server-only** — never exposed to the browser |
| `ADMIN_ALLOWLIST_EMAILS` | Yes | Comma-separated admin emails, e.g. `admin@example.com` |
| `RESEND_API_KEY` | For email | From Resend Dashboard → API Keys |
| `EMAIL_FROM` | For email | Verified sending address, e.g. `support@yourdomain.com` |
| `EMAIL_INBOUND_DOMAIN` | For email | Inbound domain for reply routing |
| `RESEND_WEBHOOK_SECRET` | For email | Webhook signing secret from Resend |

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
