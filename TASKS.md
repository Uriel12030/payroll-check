# Open Tasks

## Pending Infrastructure
- [ ] Run migration 007 (email read/unread tracking) in Supabase Dashboard
- [ ] Fix Vercel env var: `EMAIL_FROM` — change `oreply@mvp.ashchar.com` → `noreply@ashchar.com`
- [ ] Add `ashchar.com` as verified sending domain in Resend (currently only `mvp.ashchar.com`)
- [ ] Update `EMAIL_INBOUND_DOMAIN` in Vercel after domain verification

## V1: AI Workbench

### Batch 1: Foundation
- [ ] 1.1 Create + run migration 008: `ai_playbooks` table, extend `case_ai_state`, `case_ai_drafts`, `email_messages`, `case_ai_actions`
- [ ] 1.2 Update TypeScript types (`src/types/ai.ts`, `src/types/email.ts`)
- [ ] 1.3 Add Zod schemas: `workbenchAnalysisOutputSchema`, `emailDraftOutputSchema`, `translationOutputSchema`
- [ ] 1.4 Extract shared AI helpers to `src/lib/ai/shared.ts` + refactor `aiAnalyzer.ts`

### Batch 2: AI Logic
- [ ] 2.1 Add prompt templates: workbench system/user, email draft system/user, translation
- [ ] 2.2 Create `src/lib/ai/workbenchAnalyzer.ts` — analyzeForWorkbench()
- [ ] 2.3 Create `src/lib/ai/emailDrafter.ts` — generateEmailDraft()
- [ ] 2.4 Create `src/lib/ai/translator.ts` — translateToHebrew()
- [ ] 2.5 Create API routes: workbench/analyze, workbench/draft, translate, workbench/draft/send
- [ ] 2.6 Extend existing email send route with language, hebrew_translation, ai_metadata

### Batch 3: UI
- [ ] 3.1 Create workbench sub-components: WorkbenchSummary, PlaybookTabs, QuestionChecklist, DocumentChecklist, RiskStrengthPanel, ToneSelector, DraftPreview
- [ ] 3.2 Create `AiWorkbench.tsx` orchestrator
- [ ] 3.3 Add "עבודת AI" tab to `LeadDetailClient.tsx`
- [ ] 3.4 Create `HebrewTranslation.tsx` + modify `ConversationThread.tsx` for translation toggle
- [ ] 3.5 Add workbench link to `AiPanel.tsx`

### Batch 4: Tests & Verification
- [ ] 4.1 Schema validation tests
- [ ] 4.2 Prompt builder tests
- [ ] 4.3 Build passes (`npm run build`)
- [ ] 4.4 All tests pass (`npm test`)

## V2: Future Enhancements
- [ ] Multi-turn: AI updates assessment after receiving replies
- [ ] Document management + received documents checklist
- [ ] Lead scoring/priority based on AI assessment
- [ ] Playbook admin UI (CRUD for playbooks)
- [ ] Auto-send with confidence threshold (opt-in per lead)
- [ ] Follow-up scheduler (time-based re-analysis when no response)
- [ ] Prompt A/B testing infrastructure
