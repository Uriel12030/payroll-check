'use client'

import Link from 'next/link'
import { CheckCircle, Shield, Clock, FileText } from 'lucide-react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import { LanguageSelector } from '@/components/LanguageSelector'

const benefitIcons = [Clock, Shield, FileText, CheckCircle] as const
const benefitKeys = [
  { titleKey: 'benefits.overtime_title', descKey: 'benefits.overtime_desc' },
  { titleKey: 'benefits.pension_title', descKey: 'benefits.pension_desc' },
  { titleKey: 'benefits.severance_title', descKey: 'benefits.severance_desc' },
  { titleKey: 'benefits.vacation_title', descKey: 'benefits.vacation_desc' },
]

const stepNums = ['01', '02', '03']
const stepKeys = [
  { titleKey: 'how.step1_title', descKey: 'how.step1_desc' },
  { titleKey: 'how.step2_title', descKey: 'how.step2_desc' },
  { titleKey: 'how.step3_title', descKey: 'how.step3_desc' },
]

export default function HomePage() {
  const { lang } = useLanguage()

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-bold text-xl text-blue-600">Payroll Check</div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">
              {t('nav.how_it_works', lang)}
            </a>
            <a href="#benefits" className="hover:text-blue-600 transition-colors">
              {t('nav.what_we_check', lang)}
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSelector />
            <Link href="/intake" className="btn-primary text-sm py-2 px-4">
              {t('nav.free_check', lang)}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            {t('hero.badge', lang)}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {t('hero.title_line1', lang)}
            <span className="text-blue-600">{t('hero.title_line2', lang)}</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            {t('hero.subtitle', lang)}
          </p>
          <Link
            href="/intake"
            className="inline-block bg-blue-600 text-white text-lg font-bold px-10 py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            {t('hero.cta', lang)}
          </Link>
          <p className="text-sm text-gray-400 mt-4">
            {t('hero.disclaimer', lang)}
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">
            {t('how.title', lang)}
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            {stepNums.map((num, i) => (
              <div key={num} className="text-center">
                <div className="text-5xl font-black text-blue-100 mb-3">{num}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {t(stepKeys[i].titleKey, lang)}
                </h3>
                <p className="text-gray-500 text-sm">
                  {t(stepKeys[i].descKey, lang)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">
            {t('benefits.title', lang)}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {benefitKeys.map((b, i) => {
              const Icon = benefitIcons[i]
              return (
                <div key={b.titleKey} className="card flex gap-5 items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{t(b.titleKey, lang)}</h3>
                    <p className="text-gray-500 text-sm">{t(b.descKey, lang)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{t('cta.title', lang)}</h2>
          <p className="text-blue-100 mb-8">
            {t('cta.subtitle', lang)}
          </p>
          <Link
            href="/intake"
            className="inline-block bg-white text-blue-600 font-bold text-lg px-10 py-4 rounded-xl hover:bg-blue-50 transition-colors"
          >
            {t('cta.button', lang)}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4">
        <div className="max-w-5xl mx-auto text-center text-sm">
          <div className="font-bold text-white text-lg mb-2">Payroll Check</div>
          <p className="mb-4">{t('footer.subtitle', lang)}</p>
          <p className="text-xs text-gray-600">
            {t('footer.disclaimer', lang)} © {new Date().getFullYear()} Payroll Check
          </p>
        </div>
      </footer>
    </div>
  )
}
