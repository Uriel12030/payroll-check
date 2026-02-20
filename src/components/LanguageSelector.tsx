'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LANGUAGES, Language } from '@/lib/i18n/translations'

export function LanguageSelector({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage()

  return (
    <div className={`flex items-center gap-1 flex-wrap ${className}`} role="group" aria-label="Select language">
      {LANGUAGES.map((l, i) => (
        <span key={l.code} className="flex items-center">
          <button
            type="button"
            onClick={() => setLang(l.code as Language)}
            className={`px-2 py-1 text-sm rounded transition-colors ${
              l.code === lang
                ? 'text-blue-600 font-bold bg-blue-50'
                : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            {l.label}
          </button>
          {i < LANGUAGES.length - 1 && (
            <span className="text-gray-300 text-xs mx-0.5 select-none">|</span>
          )}
        </span>
      ))}
    </div>
  )
}
