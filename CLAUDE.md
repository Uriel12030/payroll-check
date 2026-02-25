# Payroll Check

Israeli employee rights checking application. Legal lead intake and admin management system.

## Tech Stack
- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (Postgres + Auth + Storage + Realtime)
- **Email**: Resend (outbound) + Svix (webhook verification for inbound)
- **AI**: OpenAI GPT (case analysis and email drafting)
- **Validation**: Zod v4
- **Forms**: react-hook-form
- **Testing**: Vitest

## Language
UI, prompts, database seeds, and user-facing content are in **Hebrew** (RTL).
Multi-language support (he, en, ru, am) via `src/lib/i18n/translations.ts`.
Global `dir="rtl"` on `<html>`. In RTL flex, `justify-end` = visual left. Last DOM item = leftmost visual position.

## Commands
```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Run tests (vitest)
npm run test:watch # Watch mode tests
```

## Project Structure
```
src/
  actions/         # Server actions (submitLead, updateLead, createQuickLead, updateLeadContact)
  app/             # Next.js App Router pages + API routes
    admin/         # Admin dashboard (login, leads, lead detail, health)
    api/           # Route handlers (admin email/ai, inbound webhook, upload, debug)
    auth/callback/ # OAuth callback route (Google SSO → exchanges code → /admin/leads)
    intake/        # Public intake wizard
  components/
    admin/         # Admin components
      workbench/   # AI Workbench (AiWorkbench, DraftPreview, WorkbenchSummary, ToneSelector, etc.)
      email/       # Email sub-components (ConversationList, ComposeEmail, ConversationThread)
      ai/          # AI sub-components (AiStateSummary, AiDraftCard)
    intake/        # Intake wizard steps (Step1-7, QuickStart, BasicContact)
    ui/            # Shared primitives (FormField, ProgressBar)
  lib/
    ai/            # AI pipeline:
                   #   aiAnalyzer.ts      — legacy analyze flow
                   #   emailDrafter.ts    — email draft generation (generateEmailDraft)
                   #   workbenchAnalyzer.ts — workbench analyze flow
                   #   shared.ts          — callOpenAIWithSchema, SchemaValidationError, loadLeadContext
                   #   schemas.ts         — Zod schemas (emailDraftOutputSchema, workbenchAnalysisOutputSchema)
                   #   promptTemplates.ts — hardcoded fallback prompts
                   #   promptLoader.ts    — loads prompts from DB (ai_prompt_templates), falls back to hardcoded
                   #   rateLimiter.ts     — per-lead + global AI rate limits (case_ai_actions table)
                   #   openai.ts          — OpenAI client (model: env AI_MODEL ?? 'gpt-4.1-mini')
    auth/          # Admin authorization (isAdmin)
    email/         # Email utilities (resend, sanitize, webhook)
    i18n/          # Internationalization (translations, LanguageContext)
    supabase/      # Supabase clients (client, server, middleware)
    validations/   # Zod schemas for intake form
    env.ts         # Environment variable helpers
    scoring.ts     # Lead scoring algorithm (rule-based, 0-100)
    utils.ts       # Utility functions (cn, formatDate, formatCurrency)
  types/
    lead.ts        # Lead, LeadFlags, LeadFile types
    email.ts       # EmailConversation, EmailMessage types
    ai.ts          # AI-related types (CaseAiState, CaseAiDraft, CaseAiAction, WorkbenchQuestion, etc.)
    intake.ts      # IntakeFormData type
    index.ts       # Re-exports all types
  middleware.ts    # Supabase auth middleware (CSP nonces, security headers, admin route guard)
supabase/migrations/ # SQL migration files (001–011)
```

## Key Conventions
- Path alias: `@/*` maps to `./src/*`
- Server-only env access: use `getRequiredEnv()` from `src/lib/env.ts`
- Admin check: `isAdmin(email)` from `src/lib/auth/isAdmin.ts`
- Type imports: `import type { Lead } from '@/types'`
- Supabase server client: `createClient()` (uses cookies) or `createServiceClient()` (service role, bypasses RLS)
- AI errors: `callOpenAIWithSchema` throws `SchemaValidationError` on Zod validation failure (not `z.ZodError`)
- `workbench_summary` in `CaseAiState` is a `string` (not array) — newlines separate bullet points
- Missing fields detection is deterministic (no LLM) in `missingFieldsEngine.ts`

## AI Workbench Flow
1. **Analyze**: POST `/api/admin/ai/workbench/analyze` → `workbenchAnalyzer.generateWorkbenchAnalysis()` → stores in `case_ai_state`
2. **Draft**: POST `/api/admin/ai/workbench/draft` → `emailDrafter.generateEmailDraft()` → stores in `case_ai_drafts`, returns `{ draftId, draft: EmailDraftOutput }`
3. **Send**: POST `/api/admin/ai/workbench/draft/send` → sends via Resend, marks draft `sent`
4. Prompt templates load from DB (`ai_prompt_templates`) first, fall back to hardcoded in `promptTemplates.ts`
5. Rate limits: `checkAiRateLimit()` checks `case_ai_actions` table (per-lead: 10/day, global: 200/day)

## Database Schema (key tables)
- `leads` — main lead table
- `case_ai_state` — per-lead AI workbench state (workbench_summary, recommended_questions, risk_flags, etc.)
- `case_ai_drafts` — email draft records (suggested_subject, suggested_text, internal_summary_he, tone, language, status)
- `case_ai_actions` — audit log of every AI call (tokens, model, prompt_version, status)
- `ai_playbooks` — topic rubrics (overtime, severance, pension, etc.)
- `ai_prompt_templates` — editable prompt templates with versioning
- `email_conversations` / `email_messages` — inbound/outbound email threads
- `upload_rate_limits` — per-IP upload rate limiting (15-min windows)

## Security Architecture
- **CSP**: Per-request nonce via middleware (`x-nonce` header) → layout reads it → `nonce-{nonce} strict-dynamic` in CSP
- **Security headers**: X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy — all set in `src/lib/supabase/middleware.ts`
- **Admin guard**: Middleware redirects unauthenticated `/admin/*` to `/admin/login`; `isAdmin()` checks email allowlist
- **Upload rate limit**: Supabase RPC `check_upload_rate_limit(ip, max)` — atomic, shared across serverless instances
- **Webhook dedup**: Inbound emails deduplicated by `provider_message_id`
- **HTML sanitization**: `src/lib/email/sanitize.ts` — strict CSS allowlist, no wildcard `/.*/` patterns
- **PDF route**: All user fields HTML-escaped via `escapeHtml()` in `src/app/api/admin/leads/[id]/pdf/route.ts`
- **Debug route**: `/api/debug/email` returns 404 in production

## Environment Variables
Required (see `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` / `RESEND_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `ADMIN_ALLOWLIST_EMAILS` (comma-separated)
Optional:
- `AI_MODEL` (default: `gpt-4.1-mini`)
- `AI_MAX_COMPLETION_TOKENS` (default: `1500`)
- `AI_PER_LEAD_DAILY_LIMIT` (default: `10`)
- `AI_GLOBAL_DAILY_CALL_LIMIT` (default: `200`)
- `AI_GLOBAL_DAILY_TOKEN_LIMIT` (default: `500000`)

## Pending / Known Issues
- Migration 011 (`upload_rate_limits` table + `check_upload_rate_limit` PG function) must be applied in Supabase dashboard before upload rate limiting works in prod
- "Generate Draft" regression: clicking "צור טיוטת אימייל" shows no error and no draft — root cause unconfirmed; defensive `if (!data.draft)` check added to surface the failure
