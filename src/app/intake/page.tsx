'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QuickStart, QuickStartData } from '@/components/intake/QuickStart'
import { BasicContact } from '@/components/intake/BasicContact'
import { LanguageSelector } from '@/components/LanguageSelector'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import { createQuickLead } from '@/actions/createQuickLead'

export default function IntakePage() {
  const { lang } = useLanguage()
  const router = useRouter()
  const [phase, setPhase] = useState<'quick' | 'contact'>('quick')
  const [leadId, setLeadId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [quickError, setQuickError] = useState('')
  const [lastQuickData, setLastQuickData] = useState<QuickStartData | null>(null)

  const handleQuickComplete = async (data: QuickStartData) => {
    setSaving(true)
    setQuickError('')
    setLastQuickData(data)
    try {
      const result = await createQuickLead({
        preferred_language: data.preferred_language,
        years_with_employer_bucket: data.years_with_employer_bucket,
        employment_type: data.employment_type,
        main_issues: data.main_issues,
      })
      if (result.success && result.leadId) {
        setLeadId(result.leadId)
        setPhase('contact')
      } else {
        setQuickError(result.error ?? t('contact.error', lang))
      }
    } catch (err) {
      console.error('Quick lead error:', err)
      setQuickError(t('contact.error', lang))
    } finally {
      setSaving(false)
    }
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
            <>
              <QuickStart onComplete={handleQuickComplete} onBack={handleQuickBack} />
              {saving && (
                <div className="text-center text-sm text-gray-500 mt-4">...</div>
              )}
              {quickError && !saving && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4 text-center">
                  <p className="text-red-600 text-sm mb-3">{quickError}</p>
                  <button
                    type="button"
                    className="btn-primary text-sm"
                    onClick={() => lastQuickData && handleQuickComplete(lastQuickData)}
                  >
                    {t('qs.retry', lang)}
                  </button>
                </div>
              )}
            </>
          )}
          {phase === 'contact' && leadId && (
            <BasicContact leadId={leadId} />
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          {t('intake.disclaimer', lang)}
        </p>
      </div>
    </div>
  )
}
