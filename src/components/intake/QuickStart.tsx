'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { t, LANGUAGES, Language } from '@/lib/i18n/translations'

export interface QuickStartData {
  years_with_employer_bucket: string
  employment_type: string
  main_issues: string[]
  preferred_language: Language
}

interface QuickStartProps {
  onComplete: (data: QuickStartData) => void
  onBack: () => void
}

export function QuickStart({ onComplete, onBack }: QuickStartProps) {
  const { lang } = useLanguage()
  const [qStep, setQStep] = useState(1)
  const TOTAL_Q = 4

  const [yearsBucket, setYearsBucket] = useState<string>('')
  const [empType, setEmpType] = useState<string>('')
  const [issues, setIssues] = useState<string[]>([])
  const [emailLang, setEmailLang] = useState<Language>(lang)

  const canNext = () => {
    if (qStep === 1) return !!yearsBucket
    if (qStep === 2) return !!empType
    if (qStep === 3) return issues.length > 0
    if (qStep === 4) return !!emailLang
    return false
  }

  const handleNext = () => {
    if (qStep < TOTAL_Q) {
      setQStep((s) => s + 1)
    } else {
      onComplete({
        years_with_employer_bucket: yearsBucket,
        employment_type: empType,
        main_issues: issues,
        preferred_language: emailLang,
      })
    }
  }

  const handleBack = () => {
    if (qStep > 1) {
      setQStep((s) => s - 1)
    } else {
      onBack()
    }
  }

  const toggleIssue = (issue: string) => {
    setIssues((prev) => {
      if (prev.includes(issue)) return prev.filter((i) => i !== issue)
      if (prev.length >= 2) return prev
      return [...prev, issue]
    })
  }

  const OptionButton = ({
    selected,
    onClick,
    children,
  }: {
    selected: boolean
    onClick: () => void
    children: React.ReactNode
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-start px-4 py-3 rounded-lg border transition-all text-sm ${
        selected
          ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-700'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('qs.title', lang)}</h2>
        <p className="text-sm text-gray-500">
          {t('qs.step_of', lang, { current: String(qStep), total: String(TOTAL_Q) })}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 justify-center">
        {Array.from({ length: TOTAL_Q }).map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i + 1 <= qStep ? 'bg-blue-600 w-8' : 'bg-gray-200 w-8'
            }`}
          />
        ))}
      </div>

      {/* Q1: Years */}
      {qStep === 1 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">{t('qs.q1_title', lang)}</h3>
          {[
            { key: 'less_than_1', label: t('qs.q1_opt1', lang) },
            { key: '1_3', label: t('qs.q1_opt2', lang) },
            { key: '3_7', label: t('qs.q1_opt3', lang) },
            { key: '7_plus', label: t('qs.q1_opt4', lang) },
          ].map((opt) => (
            <OptionButton
              key={opt.key}
              selected={yearsBucket === opt.key}
              onClick={() => setYearsBucket(opt.key)}
            >
              {opt.label}
            </OptionButton>
          ))}
        </div>
      )}

      {/* Q2: Employment type */}
      {qStep === 2 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">{t('qs.q2_title', lang)}</h3>
          {[
            { key: 'direct', label: t('qs.q2_opt1', lang) },
            { key: 'contractor', label: t('qs.q2_opt2', lang) },
            { key: 'not_sure', label: t('qs.q2_opt3', lang) },
          ].map((opt) => (
            <OptionButton
              key={opt.key}
              selected={empType === opt.key}
              onClick={() => setEmpType(opt.key)}
            >
              {opt.label}
            </OptionButton>
          ))}
        </div>
      )}

      {/* Q3: Main issues (multi-select up to 2) */}
      {qStep === 3 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">{t('qs.q3_title', lang)}</h3>
          {[
            { key: 'unpaid_overtime', label: t('qs.q3_opt1', lang) },
            { key: 'severance', label: t('qs.q3_opt2', lang) },
            { key: 'vacation_sick', label: t('qs.q3_opt3', lang) },
            { key: 'pension_benefits', label: t('qs.q3_opt4', lang) },
            { key: 'payslips_missing', label: t('qs.q3_opt5', lang) },
            { key: 'other', label: t('qs.q3_opt6', lang) },
          ].map((opt) => (
            <OptionButton
              key={opt.key}
              selected={issues.includes(opt.key)}
              onClick={() => toggleIssue(opt.key)}
            >
              {opt.label}
            </OptionButton>
          ))}
        </div>
      )}

      {/* Q4: Preferred email language */}
      {qStep === 4 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">{t('qs.q4_title', lang)}</h3>
          {LANGUAGES.map((l) => (
            <OptionButton
              key={l.code}
              selected={emailLang === l.code}
              onClick={() => setEmailLang(l.code)}
            >
              {l.label}
            </OptionButton>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleBack}
          className="btn-secondary flex-1"
        >
          {t('qs.back', lang)}
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!canNext()}
          className="btn-primary flex-1"
        >
          {qStep === TOTAL_Q ? t('qs.continue', lang) : t('qs.next', lang)}
        </button>
      </div>
    </div>
  )
}
