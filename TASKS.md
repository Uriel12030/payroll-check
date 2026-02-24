# Open Tasks

## Pending Infrastructure
- [ ] Run migration 007 (last_interaction_at + is_read) in Supabase Dashboard
- [ ] Run migration 008 (AI workbench tables) in Supabase Dashboard
- [ ] Run migration 009 (workbench enhancements: missing_info_he, risk_notes_internal_he) in Supabase Dashboard
- [ ] Run migration 010 (ai_prompt_templates table + 11 seed templates) in Supabase Dashboard
- [ ] Run migration 011 (upload_rate_limits table + check_upload_rate_limit PG function) in Supabase Dashboard
- [ ] Enable Realtime for `case_ai_drafts` and `case_ai_state` tables in Supabase Dashboard
- [ ] Fix Vercel env var: `EMAIL_FROM` — change `oreply@mvp.ashchar.com` → `noreply@ashchar.com`
- [ ] Add `ashchar.com` as verified sending domain in Resend (currently only `mvp.ashchar.com`)
- [ ] Update `EMAIL_INBOUND_DOMAIN` in Vercel after domain verification

## V1: AI Workbench ✅

### Batch 1: Foundation
- [x] 1.1 Create migration 008: `ai_playbooks` table, extend `case_ai_state`, `case_ai_drafts`, `email_messages`, `case_ai_actions`
- [x] 1.2 Update TypeScript types (`src/types/ai.ts`, `src/types/email.ts`)
- [x] 1.3 Add Zod schemas: `workbenchAnalysisOutputSchema`, `emailDraftOutputSchema`, `translationOutputSchema`
- [x] 1.4 Extract shared AI helpers to `src/lib/ai/shared.ts` + refactor `aiAnalyzer.ts`

### Batch 2: AI Logic
- [x] 2.1 Add prompt templates: workbench system/user, email draft system/user, translation
- [x] 2.2 Create `src/lib/ai/workbenchAnalyzer.ts` — analyzeForWorkbench()
- [x] 2.3 Create `src/lib/ai/emailDrafter.ts` — generateEmailDraft()
- [x] 2.4 Create `src/lib/ai/translator.ts` — translateToHebrew()
- [x] 2.5 Create API routes: workbench/analyze, workbench/draft, translate, workbench/draft/send
- [x] 2.6 Extend existing email send route with language, hebrew_translation, ai_metadata

### Batch 3: UI
- [x] 3.1 Create workbench sub-components: WorkbenchSummary, PlaybookTabs, QuestionChecklist, DocumentChecklist, RiskStrengthPanel, ToneSelector, DraftPreview
- [x] 3.2 Create `AiWorkbench.tsx` orchestrator
- [x] 3.3 Add "עבודת AI" tab to `LeadDetailClient.tsx`
- [x] 3.4 Create `HebrewTranslation.tsx` + modify `ConversationThread.tsx` for translation toggle
- [x] 3.5 Add workbench link to `AiPanel.tsx`

### Batch 4: Tests & Verification
- [x] 4.1 Schema validation tests
- [x] 4.2 Prompt builder tests
- [x] 4.3 Build passes (`npm run build`)
- [x] 4.4 All tests pass (`npm test`)

### Gap Fixes (post-V1)
- [x] Added `missing_info_he` and `risk_notes_internal_he` to schema, types, prompts, UI
- [x] Added document priority (high/medium/low) to schema, types, DocumentChecklist
- [x] Fixed language detection in DraftPreview (uses lead's actual language)
- [x] Fixed email reply threading — In-Reply-To/References headers in both send routes
- [x] Migration 009 for new columns

## V2: Future Enhancements
- [ ] Multi-turn: AI updates assessment after receiving replies
- [ ] Document management + received documents checklist
- [ ] Lead scoring/priority based on AI assessment
- [ ] Playbook admin UI (CRUD for playbooks)
- [ ] Auto-send with confidence threshold (opt-in per lead)
- [ ] Follow-up scheduler (time-based re-analysis when no response)
- [ ] Prompt A/B testing infrastructure
