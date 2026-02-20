'use client'

import { useRef, useEffect } from 'react'
import { Send, ArrowRight, Inbox, ChevronLeft } from 'lucide-react'
import type { EmailConversation, EmailMessage, ConversationStatus } from '@/types'
import { AiPanel } from '../AiPanel'
import { formatDateTime } from './ConversationList'

const statusLabels: Record<ConversationStatus, { label: string; color: string }> = {
  open: { label: 'פתוח', color: 'bg-green-100 text-green-700' },
  pending: { label: 'ממתין', color: 'bg-yellow-100 text-yellow-700' },
  closed: { label: 'סגור', color: 'bg-gray-100 text-gray-500' },
}

interface Props {
  leadId: string
  leadEmail: string
  conversation: EmailConversation | undefined
  messages: EmailMessage[]
  messagesLoading: boolean
  replyBody: string
  replying: boolean
  sendError: string
  onReplyBodyChange: (value: string) => void
  onReply: () => void
  onBack: () => void
}

export function ConversationThread({
  leadId,
  leadEmail,
  conversation,
  messages,
  messagesLoading,
  replyBody,
  replying,
  sendError,
  onReplyBodyChange,
  onReply,
  onBack,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-600"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{conversation?.subject}</p>
          <p className="text-xs text-gray-400">{leadEmail}</p>
        </div>
        {conversation && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusLabels[conversation.status as ConversationStatus]?.color ?? ''}`}>
            {statusLabels[conversation.status as ConversationStatus]?.label ?? conversation.status}
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

      {/* AI Panel */}
      <AiPanel leadId={leadId} conversationId={conversation?.id ?? null} />

      {/* Reply box */}
      <div className="border-t border-gray-100 pt-3">
        <textarea
          value={replyBody}
          onChange={(e) => onReplyBodyChange(e.target.value)}
          rows={3}
          className="form-input resize-none mb-2"
          placeholder="כתוב תשובה..."
        />

        {sendError && (
          <p className="text-sm text-red-600 mb-2">{sendError}</p>
        )}

        <button
          onClick={onReply}
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
