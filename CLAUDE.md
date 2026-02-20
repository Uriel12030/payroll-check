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
    intake/        # Public intake wizard
  components/
    admin/         # Admin components (EmailTab coordinator, AiPanel coordinator)
      email/       # Email sub-components (ConversationList, ComposeEmail, ConversationThread)
      ai/          # AI sub-components (AiStateSummary, AiDraftCard)
    intake/        # Intake wizard steps (Step1-7, QuickStart, BasicContact)
    ui/            # Shared primitives (FormField, ProgressBar)
  lib/
    ai/            # AI pipeline (aiAnalyzer, missingFieldsEngine, promptTemplates, schemas, openai)
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
    ai.ts          # AI-related types (CaseAiState, CaseAiDraft, CaseAiAction, etc.)
    intake.ts      # IntakeFormData type
    index.ts       # Re-exports all types
  middleware.ts    # Supabase auth middleware
supabase/migrations/ # SQL migration files
```

## Key Conventions
- Path alias: `@/*` maps to `./src/*`
- Server-only env access: use `getRequiredEnv()` from `src/lib/env.ts`
- Admin check: `isAdmin(email)` from `src/lib/auth/isAdmin.ts`
- Type imports: `import type { Lead } from '@/types'`
- AI analysis pipeline is in `src/lib/ai/aiAnalyzer.ts` (split into helpers: loadLeadContext, fetchConversationThread, callOpenAI, persistResults)
- Missing fields detection is deterministic (no LLM) in `missingFieldsEngine.ts`

## Environment Variables
Required (see `.env.local.example`):
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` / `RESEND_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `ADMIN_ALLOWLIST_EMAILS` (comma-separated)
