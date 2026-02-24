'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brain, AlertTriangle, Loader2, Sparkles, FileText } from 'lucide-react'
import type {
  CaseAiState,
  EmailTone,
  WorkbenchQuestion,
  DocumentRequest,
} from '@/types'
import type { EmailDraftOutput } from '@/lib/ai/schemas'
import { WorkbenchSummary } from './WorkbenchSummary'
import { QuestionChecklist } from './QuestionChecklist'
import { DocumentChecklist } from './DocumentChecklist'
import { RiskStrengthPanel } from './RiskStrengthPanel'
import { ToneSelector } from './ToneSelector'
import { DraftPreview } from './DraftPreview'

interface Props {
  leadId: string
  leadLanguage?: string
}

export function AiWorkbench({ leadId, leadLanguage = 'he' }: Props) {
  const [aiState, setAiState] = useState<CaseAiState | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [activePlaybook, setActivePlaybook] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)

  // Draft state
  const [tone, setTone] = useState<EmailTone>('friendly')
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  const [selectedDocumentKeys, setSelectedDocumentKeys] = useState<string[]>([])
  const [adminNotes, setAdminNotes] = useState('')
  const [draft, setDraft] = useState<EmailDraftOutput | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)

  const supabase = createClient()

  const loadAiState = useCallback(async () => {
    setLoading(true)

    const { data: state } = await supabase
      .from('case_ai_state')
      .select('*')
      .eq('lead_id', leadId)
      .single()

    if (state) {
      const typed = state as CaseAiState
      setAiState(typed)

      // Pre-select questions that are marked as selected and not answered
      const questions = (typed.recommended_questions ?? []) as WorkbenchQuestion[]
      setSelectedQuestionIds(
        questions.filter((q) => q.selected && !q.answered).map((q) => q.id)
      )

      // Pre-select pending documents
      const docs = (typed.documents_requested ?? []) as DocumentRequest[]
      setSelectedDocumentKeys(
        docs.filter((d) => d.status === 'pending').map((d) => d.key)
      )
    }

    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  useEffect(() => {
    loadAiState()
  }, [loadAiState])

  // ---------- Handlers ----------

  const handleAnalyze = async () => {
    setAnalyzing(true)
    setError('')
    setDraft(null)
    setDraftId(null)

    try {
      const res = await fetch('/api/admin/ai/workbench/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'ניתוח נכשל')
      }

      await loadAiState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בניתוח')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleGenerateDraft = async () => {
    setDrafting(true)
    setError('')

    try {
      const res = await fetch('/api/admin/ai/workbench/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          tone,
          selectedQuestionIds,
          selectedDocumentKeys,
          adminNotes: adminNotes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'יצירת טיוטה נכשלה')
      }

      const data = await res.json()
      setDraft(data.draft)
      setDraftId(data.draftId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת טיוטה')
    } finally {
      setDrafting(false)
    }
  }

  const handleSendDraft = async (editedText: string, editedHtml: string | null, editedSubject: string) => {
    if (!draftId) {
      setError('שגיאה: מזהה הטיוטה חסר — נסו ליצור טיוטה מחדש')
      return
    }
    setSending(true)
    setError('')
    setSendSuccess(false)

    try {
      const res = await fetch('/api/admin/ai/workbench/draft/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId,
          editedText: editedText !== draft?.suggested_text ? editedText : undefined,
          editedHtml: editedHtml !== draft?.suggested_html ? editedHtml : undefined,
          editedSubject: editedSubject !== draft?.suggested_subject ? editedSubject : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'שליחה נכשלה')
      }

      setDraft(null)
      setDraftId(null)
      setSendSuccess(true)
      // Reload state to reflect changes
      await loadAiState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחה')
    } finally {
      setSending(false)
    }
  }

  const handleCopy = () => {
    if (!draft) return
    navigator.clipboard.writeText(draft.suggested_text)
  }

  const handleDiscard = async () => {
    if (!draftId) return

    await supabase
      .from('case_ai_drafts')
      .update({ status: 'discarded', updated_at: new Date().toISOString() })
      .eq('id', draftId)

    setDraft(null)
    setDraftId(null)
  }

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const addCustomQuestion = (text: string) => {
    if (!aiState) return
    const newQ: WorkbenchQuestion = {
      id: `custom_${Date.now()}`,
      text_he: text,
      playbook_slug: null,
      selected: true,
      answered: false,
    }
    setAiState({
      ...aiState,
      recommended_questions: [...aiState.recommended_questions, newQ],
    })
    setSelectedQuestionIds((prev) => [...prev, newQ.id])
  }

  const toggleDocument = (key: string) => {
    setSelectedDocumentKeys((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    )
  }

  // ---------- Render ----------

  // Workbench-specific analysis exists when workbench_summary is non-empty
  const hasWorkbenchAnalysis = !!aiState?.workbench_summary?.trim()
  // Basic AI state exists (e.g., from email tab analysis) when last_analyzed_at is set
  const hasBasicAnalysis = !!aiState?.last_analyzed_at && !hasWorkbenchAnalysis

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
        <span className="text-sm text-gray-400 mr-2">טוען נתוני AI...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-gray-900">AI Workbench</h2>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"
        >
          {analyzing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {analyzing ? 'מנתח...' : hasWorkbenchAnalysis ? 'נתח מחדש' : 'נתח תיק'}
        </button>
      </div>

      {/* Success banner */}
      {sendSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <Sparkles className="w-4 h-4 text-green-500" />
          <p className="text-sm text-green-700">האימייל נשלח בהצלחה!</p>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* No data yet — no analysis of any kind */}
      {!hasWorkbenchAnalysis && !hasBasicAnalysis && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Brain className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">לחצו &quot;נתח תיק&quot; כדי להתחיל</p>
          <p className="text-gray-400 text-xs mt-1">ה-AI יעבור על כל השיחות ויזהה נושאים, שאלות, מסמכים וסיכונים</p>
        </div>
      )}

      {/* Basic analysis exists (from email tab) but no full workbench analysis */}
      {hasBasicAnalysis && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 text-center">
          <Brain className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm text-blue-800 font-medium mb-1">קיים ניתוח בסיסי מלשונית האימיילים</p>
          {aiState?.summary && (
            <p className="text-sm text-blue-700 mb-3" dir="rtl">{aiState.summary}</p>
          )}
          <p className="text-xs text-blue-600">לחצו &quot;נתח תיק&quot; לניתוח מלא עם שאלות, מסמכים וסיכונים</p>
        </div>
      )}

      {/* Full workbench analysis results */}
      {hasWorkbenchAnalysis && aiState && (
        <>
          {/* Summary + playbook tabs */}
          <WorkbenchSummary
            aiState={aiState}
            activePlaybook={activePlaybook}
            onPlaybookChange={setActivePlaybook}
          />

          {/* Risk & Strength */}
          <RiskStrengthPanel
            riskFlags={aiState.risk_flags}
            strengthFlags={aiState.strength_flags}
            playbookFilter={activePlaybook}
          />

          {/* Questions + Documents side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <QuestionChecklist
              questions={aiState.recommended_questions}
              selectedIds={selectedQuestionIds}
              onToggle={toggleQuestion}
              onAddCustom={addCustomQuestion}
              playbookFilter={activePlaybook}
            />
            <DocumentChecklist
              documents={aiState.documents_requested}
              selectedKeys={selectedDocumentKeys}
              onToggle={toggleDocument}
            />
          </div>

          {/* Draft section */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-purple-600" />
              טיוטת אימייל
            </h3>

            {/* Tone + notes */}
            <div className="flex flex-wrap items-end gap-4 mb-4">
              <ToneSelector value={tone} onChange={setTone} />
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-gray-500 block mb-1">הערות לטיוטה (אופציונלי)</label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="למשל: להדגיש שעות נוספות..."
                  className="form-input text-sm py-1.5"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Generate button or draft preview */}
            {draft ? (
              <DraftPreview
                draft={draft}
                language={leadLanguage}
                sending={sending}
                onSend={handleSendDraft}
                onCopy={handleCopy}
                onRegenerate={handleGenerateDraft}
                onDiscard={handleDiscard}
              />
            ) : (
              <button
                onClick={handleGenerateDraft}
                disabled={drafting || selectedQuestionIds.length === 0}
                className="btn-primary text-sm py-2.5 px-6 flex items-center gap-1.5 w-full justify-center"
              >
                {drafting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {drafting ? 'יוצר טיוטה...' : 'צור טיוטת אימייל'}
              </button>
            )}

            {selectedQuestionIds.length === 0 && !draft && (
              <p className="text-xs text-gray-400 text-center mt-2">
                סמנו לפחות שאלה אחת כדי ליצור טיוטה
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
