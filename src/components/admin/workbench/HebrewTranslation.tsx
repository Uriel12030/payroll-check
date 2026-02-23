'use client'

import { useState } from 'react'
import { Languages, Loader2 } from 'lucide-react'

interface Props {
  messageId: string
  messageText: string
  existingTranslation?: string | null
}

export function HebrewTranslation({ messageId, messageText, existingTranslation }: Props) {
  const [translation, setTranslation] = useState(existingTranslation ?? null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(!!existingTranslation)
  const [error, setError] = useState('')

  const handleTranslate = async () => {
    if (!messageText.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText, messageId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'תרגום נכשל')
      }

      const data = await res.json()
      setTranslation(data.hebrew_translation)
      setExpanded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בתרגום')
    } finally {
      setLoading(false)
    }
  }

  // If we already have a translation, show toggle
  if (translation) {
    return (
      <div className="mt-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
        >
          <Languages className="w-3 h-3" />
          תרגום לעברית {expanded ? '▲' : '▼'}
        </button>
        {expanded && (
          <div className="mt-1.5 p-2.5 bg-blue-50 rounded-md text-sm text-blue-900 whitespace-pre-wrap" dir="rtl">
            {translation}
          </div>
        )}
      </div>
    )
  }

  // Show translate button
  return (
    <div className="mt-2">
      <button
        onClick={handleTranslate}
        disabled={loading}
        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Languages className="w-3 h-3" />
        )}
        {loading ? 'מתרגם...' : 'תרגם לעברית'}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
