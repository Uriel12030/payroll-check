'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Send, ArrowRight, MessageSquare, Clock, Inbox, ChevronLeft } from 'lucide-react'
import type { EmailConversation, EmailMessage, ConversationStatus } from '@/types'

interface Props {
  leadId: string
  leadEmail: string
}

const statusLabels: Record<ConversationStatus, { label: string; color: string }> = {
  open: { label: 'פתוח', color: 'bg-green-100 text-green-700' },
  pending: { label: 'ממתין', color: 'bg-yellow-100 text-yellow-700' },
  closed: { label: 'סגור', color: 'bg-gray-100 text-gray-500' },
}

function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function EmailTab({ leadId, leadEmail }: Props) {
  const [conversations, setConversations] = useState<EmailConversation[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<EmailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)

  // Compose state
  const [showCompose, setShowCompose] = useState(false)
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  // Reply state (composing within a conversation)
  const [replyBody, setReplyBody] = useState('')
  const [replying, setReplying] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Load conversations
  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from('email_conversations')
      .select('*')
      .eq('customer_id', leadId)
      .order('last_message_at', { ascending: false })

    if (data) setConversations(data)
    setLoading(false)
  }, [leadId, supabase])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Load messages for selected conversation
  const loadMessages = useCallback(async (convId: string) => {
    setMessagesLoading(true)
    const { data } = await supabase
      .from('email_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('occurred_at', { ascending: true })

    if (data) setMessages(data)
    setMessagesLoading(false)
  }, [supabase])

  useEffect(() => {
    if (selectedConvId) {
      loadMessages(selectedConvId)
    }
  }, [selectedConvId, loadMessages])

  // Realtime subscription for new messages
  useEffect(() => {
    if (!selectedConvId) return

    const channel = supabase
      .channel(`email_messages:${selectedConvId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_messages',
          filter: `conversation_id=eq.${selectedConvId}`,
        },
        (payload) => {
          const newMsg = payload.new as EmailMessage
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConvId, supabase])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send new email (new conversation)
  const handleSendNew = async () => {
    if (!composeSubject.trim() || !composeBody.trim()) return

    setSending(true)
    setSendError('')

    try {
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          subject: composeSubject,
          text: composeBody,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }

      const { conversationId } = await res.json()

      // Reset compose form and refresh
      setShowCompose(false)
      setComposeSubject('')
      setComposeBody('')
      await loadConversations()
      setSelectedConvId(conversationId)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'שגיאה בשליחה')
    } finally {
      setSending(false)
    }
  }

  // Reply within existing conversation
  const handleReply = async () => {
    if (!replyBody.trim() || !selectedConvId) return

    setReplying(true)
    setSendError('')

    const selectedConv = conversations.find((c) => c.id === selectedConvId)

    try {
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          conversationId: selectedConvId,
          subject: selectedConv?.subject ?? 'Re:',
          text: replyBody,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }

      setReplyBody('')
      await loadMessages(selectedConvId)
      await loadConversations()
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'שגיאה בשליחה')
    } finally {
      setReplying(false)
    }
  }

  // Conversation list view
  if (!selectedConvId && !showCompose) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            אימיילים
          </h2>
          <button
            onClick={() => setShowCompose(true)}
            className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"
          >
            <Send className="w-4 h-4" />
            שלח אימייל חדש
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">טוען...</p>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">אין שיחות אימייל עדיין</p>
            <p className="text-xs mt-1">לחץ &quot;שלח אימייל חדש&quot; כדי להתחיל</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => {
              const statusCfg = statusLabels[conv.status as ConversationStatus]
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className="w-full text-right p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{conv.subject}</p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(conv.last_message_at)}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusCfg?.color ?? ''}`}>
                      {statusCfg?.label ?? conv.status}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Compose new email view
  if (showCompose) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setShowCompose(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-semibold text-gray-900">שליחת אימייל חדש</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="form-label">אל</label>
            <input
              type="text"
              value={leadEmail}
              disabled
              className="form-input bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="form-label">נושא</label>
            <input
              type="text"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              className="form-input"
              placeholder="נושא ההודעה..."
            />
          </div>
          <div>
            <label className="form-label">הודעה</label>
            <textarea
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              rows={8}
              className="form-input resize-none"
              placeholder="תוכן ההודעה..."
            />
          </div>

          {sendError && (
            <p className="text-sm text-red-600">{sendError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSendNew}
              disabled={sending || !composeSubject.trim() || !composeBody.trim()}
              className="btn-primary text-sm py-2 px-5 flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              {sending ? 'שולח...' : 'שלח'}
            </button>
            <button
              onClick={() => setShowCompose(false)}
              className="btn-secondary text-sm py-2 px-5"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Conversation thread view
  const selectedConv = conversations.find((c) => c.id === selectedConvId)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
        <button
          onClick={() => {
            setSelectedConvId(null)
            setMessages([])
            setSendError('')
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{selectedConv?.subject}</p>
          <p className="text-xs text-gray-400">{leadEmail}</p>
        </div>
        {selectedConv && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusLabels[selectedConv.status as ConversationStatus]?.color ?? ''}`}>
            {statusLabels[selectedConv.status as ConversationStatus]?.label ?? selectedConv.status}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto mb-4 px-1">
        {messagesLoading ? (
          <p className="text-sm text-gray-400 text-center py-4">טוען הודעות...</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">אין הודעות עדיין</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg p-3 ${
                msg.direction === 'outbound'
                  ? 'bg-blue-50 border border-blue-100 mr-8'
                  : 'bg-gray-50 border border-gray-100 ml-8'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {msg.direction === 'outbound' ? (
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                ) : (
                  <Inbox className="w-3.5 h-3.5 text-gray-500" />
                )}
                <span className="text-xs font-medium text-gray-600">
                  {msg.direction === 'outbound' ? 'אתה' : msg.from_email}
                </span>
                <span className="text-xs text-gray-400 mr-auto">
                  {formatDateTime(msg.occurred_at)}
                </span>
              </div>

              {/* Render sanitized HTML if available, otherwise text */}
              {msg.html_body ? (
                <div
                  className="text-sm text-gray-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: msg.html_body }}
                />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {msg.text_body ?? ''}
                </p>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply box */}
      <div className="border-t border-gray-100 pt-3">
        <textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          rows={3}
          className="form-input resize-none mb-2"
          placeholder="כתוב תשובה..."
        />

        {sendError && (
          <p className="text-sm text-red-600 mb-2">{sendError}</p>
        )}

        <button
          onClick={handleReply}
          disabled={replying || !replyBody.trim()}
          className="btn-primary text-sm py-2 px-5 flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          {replying ? 'שולח...' : 'שלח תשובה'}
        </button>
      </div>
    </div>
  )
}
