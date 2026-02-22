'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuickStart, QuickStartData } from '@/components/intake/QuickStart'
import { BasicContact } from '@/components/intake/BasicContact'
import { LanguageSelector } from '@/components/LanguageSelector'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'

export default function IntakePage() {
  const { lang } = useLanguage()
  const router = useRouter()
  const [phase, setPhase] = useState<'quick' | 'contact'>('quick')
  const [quickData, setQuickData] = useState<QuickStartData | null>(null)

  const handleQuickComplete = (data: QuickStartData) => {
    setQuickData(data)
    setPhase('contact')
  }

  const handleQuickBack = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Logo + language selector */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-2">
            <div />
            <LanguageSelector />
          </div>
          <a href="/" className="text-blue-600 font-bold text-xl">
            Payroll Check
          </a>
          <p className="text-sm text-gray-500 mt-1">{t('intake.subtitle', lang)}</p>
        </div>

        <div className="card">
          {phase === 'quick' && (
            <QuickStart onComplete={handleQuickComplete} onBack={handleQuickBack} />
          )}
          {phase === 'contact' && quickData && (
            <BasicContact quickData={quickData} />
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {t('intake.disclaimer', lang)}
        </p>
      </div>
    </div>
  )
}
