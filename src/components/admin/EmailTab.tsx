'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { EmailConversation, EmailMessage } from '@/types'
import { ConversationList } from './email/ConversationList'
import { ComposeEmail } from './email/ComposeEmail'
import { ConversationThread } from './email/ConversationThread'

interface Props {
  leadId: string
  leadEmail: string
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

  // Reply state
  const [replyBody, setReplyBody] = useState('')
  const [replying, setReplying] = useState(false)

  const supabase = createClient()

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
      <ConversationList
        conversations={conversations}
        loading={loading}
        onSelectConversation={setSelectedConvId}
        onCompose={() => setShowCompose(true)}
      />
    )
  }

  // Compose new email view
  if (showCompose) {
    return (
      <ComposeEmail
        leadEmail={leadEmail}
        subject={composeSubject}
        body={composeBody}
        sending={sending}
        sendError={sendError}
        onSubjectChange={setComposeSubject}
        onBodyChange={setComposeBody}
        onSend={handleSendNew}
        onCancel={() => setShowCompose(false)}
      />
    )
  }

  // Conversation thread view
  const selectedConv = conversations.find((c) => c.id === selectedConvId)

  return (
    <ConversationThread
      leadId={leadId}
      leadEmail={leadEmail}
      conversation={selectedConv}
      messages={messages}
      messagesLoading={messagesLoading}
      replyBody={replyBody}
      replying={replying}
      sendError={sendError}
      onReplyBodyChange={setReplyBody}
      onReply={handleReply}
      onBack={() => {
        setSelectedConvId(null)
        setMessages([])
        setSendError('')
      }}
    />
  )
}
