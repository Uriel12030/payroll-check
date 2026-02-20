'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brain, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import type { CaseAiState, CaseAiDraft } from '@/types'
import { AiStateSummary } from './ai/AiStateSummary'
import { AiDraftCard } from './ai/AiDraftCard'

interface Props {
  leadId: string
  conversationId: string | null
}

export function AiPanel({ leadId, conversationId }: Props) {
  const [aiState, setAiState] = useState<CaseAiState | null>(null)
  const [draft, setDraft] = useState<CaseAiDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(true)

  const supabase = createClient()

  const loadAiData = useCallback(async () => {
    setLoading(true)

    const { data: state } = await supabase
      .from('case_ai_state')
      .select('*')
      .eq('lead_id', leadId)
      .single()

    if (state) setAiState(state as CaseAiState)

    if (conversationId) {
      const { data: latestDraft } = await supabase
        .from('case_ai_drafts')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('status', 'proposed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestDraft) setDraft(latestDraft as CaseAiDraft)
      else setDraft(null)
    }

    setLoading(false)
  }, [leadId, conversationId, supabase])

  useEffect(() => {
    loadAiData()
  }, [loadAiData])

  // Realtime subscription for draft updates
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`ai_drafts:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_ai_drafts',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          loadAiData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, supabase, loadAiData])

  const handleAnalyze = async () => {
    if (!conversationId) return
    setAnalyzing(true)
    setError('')

    try {
      const res = await fetch('/api/admin/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, conversationId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'ניתוח נכשל')
      }

      await loadAiData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בניתוח')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSendDraft = async () => {
    if (!draft || !conversationId) return
    setSending(true)
    setError('')

    try {
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          conversationId,
          subject: draft.suggested_subject,
          text: draft.suggested_text,
          html: draft.suggested_html ?? undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'שליחה נכשלה')
      }

      await supabase
        .from('case_ai_drafts')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', draft.id)

      setDraft(null)
      await loadAiData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחה')
    } finally {
      setSending(false)
    }
  }

  const handleCopy = async () => {
    if (!draft) return
    await navigator.clipboard.writeText(draft.suggested_text)
  }

  if (!conversationId) return null

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-purple-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900 text-sm">עוזר AI</h3>
          {aiState?.confidence_score != null && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              {aiState.confidence_score}% שלמות
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-400">טוען...</p>
          ) : (
            <>
              {aiState && <AiStateSummary aiState={aiState} />}

              {draft && (
                <AiDraftCard
                  draft={draft}
                  sending={sending}
                  analyzing={analyzing}
                  onSendDraft={handleSendDraft}
                  onCopy={handleCopy}
                  onRefresh={handleAnalyze}
                />
              )}

              {!draft && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 w-full justify-center"
                >
                  <Brain className={`w-4 h-4 ${analyzing ? 'animate-pulse' : ''}`} />
                  {analyzing ? 'מנתח את השיחה...' : 'נתח שיחה וצור טיוטה'}
                </button>
              )}

              {error && (
                <div className="flex items-center gap-1.5 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
