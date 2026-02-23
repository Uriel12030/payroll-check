'use client'

const PLAYBOOK_LABELS: Record<string, string> = {
  overtime: 'שעות נוספות',
  wage_withholding: 'הלנת שכר',
  pension: 'פנסיה',
  severance: 'פיצויי פיטורים',
  vacation_sick: 'חופשה/מחלה',
  wrongful_termination: 'שימוע/פיטורים',
  deterioration: 'הרעת תנאים',
}

interface Props {
  activeSlugs: string[]
  selectedSlug: string | null
  onSelect: (slug: string | null) => void
}

export function PlaybookTabs({ activeSlugs, selectedSlug, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onSelect(null)}
        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
          selectedSlug === null
            ? 'bg-purple-100 text-purple-700 border-purple-300 ring-1 ring-purple-300'
            : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
        }`}
      >
        הכל
      </button>
      {activeSlugs.map((slug) => (
        <button
          key={slug}
          onClick={() => onSelect(slug === selectedSlug ? null : slug)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            slug === selectedSlug
              ? 'bg-purple-100 text-purple-700 border-purple-300 ring-1 ring-purple-300'
              : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
          }`}
        >
          {PLAYBOOK_LABELS[slug] ?? slug}
        </button>
      ))}
    </div>
  )
}
