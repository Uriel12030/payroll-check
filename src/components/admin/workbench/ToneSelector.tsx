'use client'

import type { EmailTone } from '@/types'

interface Props {
  value: EmailTone
  onChange: (tone: EmailTone) => void
}

const tones: { value: EmailTone; label: string; description: string }[] = [
  { value: 'friendly', label: 'ידידותי', description: 'נעים ומזמין' },
  { value: 'formal', label: 'רשמי', description: 'מקצועי ועניני' },
  { value: 'firm', label: 'תקיף', description: 'ברור ונחרץ' },
]

export function ToneSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 font-medium">טון:</span>
      <div className="flex gap-1.5">
        {tones.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            title={t.description}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
              value === t.value
                ? 'bg-purple-100 text-purple-700 border-purple-300 ring-1 ring-purple-300'
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
