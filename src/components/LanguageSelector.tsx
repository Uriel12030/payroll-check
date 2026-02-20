'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LANGUAGES, Language } from '@/lib/i18n/translations'
import { Globe } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function LanguageSelector({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = LANGUAGES.find((l) => l.code === lang)!

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
        aria-label="Select language"
      >
        <Globe className="w-4 h-4" />
        <span>{current.label}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[100] min-w-[140px] end-0">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code as Language)
                setOpen(false)
              }}
              className={`w-full text-start px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${
                l.code === lang ? 'text-blue-600 font-medium bg-blue-50' : 'text-gray-700'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
