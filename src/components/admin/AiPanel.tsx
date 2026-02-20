'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Brain,
  RefreshCw,
  Send,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CircleDot,
} from 'lucide-react'
import type { CaseAiState, CaseAiDraft } from '@/types'

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
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(true)

  const supabase = createClient()

  // Load AI state and latest draft
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

  // Trigger AI analysis (manual)
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

  // Send the draft as an actual email
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

      // Mark draft as sent
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

  // Copy draft text
  const handleCopy = async () => {
    if (!draft) return
    await navigator.clipboard.writeText(draft.suggested_text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!conversationId) return null

  const missingFields = (aiState?.missing_fields ?? []) as Array<{ key: string; label: string; question: string }>

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

      {!expanded && null}

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-400">טוען...</p>
          ) : (
            <>
              {/* Summary */}
              {aiState?.summary && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">סיכום תיק</p>
                  <p className="text-sm text-gray-700 bg-white rounded-lg p-3 border border-gray-100">
                    {aiState.summary}
                  </p>
                </div>
              )}

              {/* Missing fields */}
              {missingFields.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">
                    מידע חסר ({missingFields.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingFields.map((f) => (
                      <span
                        key={f.key}
                        className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1"
                      >
                        <CircleDot className="w-3 h-3" />
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Draft */}
              {draft && (
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">טיוטת תשובה מוצעת</p>
                  <div className="bg-white rounded-lg border border-gray-100 p-3">
                    <p className="text-xs text-gray-400 mb-1">
                      נושא: <span className="text-gray-700">{draft.suggested_subject}</span>
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {draft.suggested_text}
                    </p>
                    {draft.questions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-400 mb-1">שאלות ממוקדות:</p>
                        <ul className="text-sm text-gray-600 list-disc mr-4 space-y-0.5">
                          {draft.questions.map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Draft actions */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleSendDraft}
                      disabled={sending}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {sending ? 'שולח...' : 'שלח טיוטה'}
                    </button>
                    <button
                      onClick={handleCopy}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'הועתק' : 'העתק'}
                    </button>
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
                      {analyzing ? 'מנתח...' : 'חדש'}
                    </button>
                  </div>
                </div>
              )}

              {/* No draft yet - offer to generate */}
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

              {/* Error */}
              {error && (
                <div className="flex items-center gap-1.5 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {/* Last analyzed timestamp */}
              {aiState?.last_analyzed_at && (
                <p className="text-xs text-gray-400">
                  ניתוח אחרון:{' '}
                  {new Intl.DateTimeFormat('he-IL', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(new Date(aiState.last_analyzed_at))}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
