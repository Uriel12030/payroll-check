'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { Language, getLangDir } from './translations'

const STORAGE_KEY = 'pc_lang'

interface LanguageContextType {
  lang: Language
  dir: 'rtl' | 'ltr'
  setLang: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'he',
  dir: 'rtl',
  setLang: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('he')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null
    if (stored && ['he', 'en', 'ru', 'am'].includes(stored)) {
      setLangState(stored)
    }
    setMounted(true)
  }, [])

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang)
    localStorage.setItem(STORAGE_KEY, newLang)
    // Update HTML attributes for RTL/LTR
    const dir = getLangDir(newLang)
    document.documentElement.setAttribute('dir', dir)
    document.documentElement.setAttribute('lang', newLang)
    // Update body direction for form inputs
    document.body.style.direction = dir
  }, [])

  // Apply direction on mount based on stored lang
  useEffect(() => {
    if (mounted) {
      const dir = getLangDir(lang)
      document.documentElement.setAttribute('dir', dir)
      document.documentElement.setAttribute('lang', lang)
      document.body.style.direction = dir
    }
  }, [lang, mounted])

  const dir = getLangDir(lang)

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
