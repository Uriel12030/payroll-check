'use client'

import { Mail, Send, MessageSquare, Clock } from 'lucide-react'
import type { EmailConversation, ConversationStatus } from '@/types'

const statusLabels: Record<ConversationStatus, { label: string; color: string }> = {
  open: { label: 'פתוח', color: 'bg-green-100 text-green-700' },
  pending: { label: 'ממתין', color: 'bg-yellow-100 text-yellow-700' },
  closed: { label: 'סגור', color: 'bg-gray-100 text-gray-500' },
}

export function formatDateTime(date: string): string {
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

interface Props {
  conversations: EmailConversation[]
  loading: boolean
  onSelectConversation: (id: string) => void
  onCompose: () => void
}

export function ConversationList({ conversations, loading, onSelectConversation, onCompose }: Props) {
  const unreadCount = conversations.filter((c) => !c.is_read).length

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-500" />
          אימיילים
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </h2>
        <button
          onClick={onCompose}
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
            const isUnread = !conv.is_read
            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-right p-3 rounded-lg border transition-colors ${
                  isUnread
                    ? 'border-blue-200 bg-blue-50/40 hover:bg-blue-50/70'
                    : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 flex items-start gap-2">
                    {isUnread && (
                      <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-900'}`}>
                        {conv.subject}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(conv.last_message_at)}
                      </p>
                    </div>
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
