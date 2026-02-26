'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'

interface Props {
  onContinue: () => void
}

export function PreliminaryResult({ onContinue }: Props) {
  const { lang } = useLanguage()

  return (
    <div className="text-center space-y-6 py-4">
      <div className="text-5xl">🎯</div>

      <h2 className="text-xl font-bold text-gray-900">
        {t('result.title', lang)}
      </h2>

      <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-4">
        <p className="text-lg font-bold text-green-700">
          {t('result.subtitle', lang)}
        </p>
      </div>

      <p className="text-gray-600 text-sm">
        {t('result.cta', lang)}
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="w-full py-4 rounded-xl text-lg font-bold text-white transition-colors bg-green-500 hover:bg-green-600"
      >
        {t('result.button', lang)}
      </button>
    </div>
  )
}
