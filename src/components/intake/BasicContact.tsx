'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { t } from '@/lib/i18n/translations'
import { FieldWrapper, Input } from '@/components/ui/FormField'
import { updateLeadContact } from '@/actions/updateLeadContact'
import { CheckCircle } from 'lucide-react'

interface BasicContactProps {
  leadId: string
}

export function BasicContact({ leadId }: BasicContactProps) {
  const { lang } = useLanguage()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)
  const [refCode, setRefCode] = useState('')

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!firstName.trim()) errs.first_name = t('contact.first_name_required', lang)
    if (!lastName.trim()) errs.last_name = t('contact.last_name_required', lang)
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = t('contact.email_invalid', lang)
    // Phone is optional – only validate format if provided
    const cleaned = phone.replace(/[\s\-]/g, '')
    if (cleaned && !/^0\d{8,9}$/.test(cleaned))
      errs.phone = t('contact.phone_invalid', lang)
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setSubmitError('')

    try {
      const result = await updateLeadContact({
        leadId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.replace(/[\s\-]/g, '').trim(),
      })
      if (!result.success) {
        setSubmitError(result.error ?? t('contact.error', lang))
        setSubmitting(false)
        return
      }
      setRefCode(leadId.slice(0, 8).toUpperCase())
      setDone(true)
    } catch {
      setSubmitError(t('contact.error', lang))
      setSubmitting(false)
    }
  }

  // ── Thank You state ──
  if (done) {
    return (
      <div className="text-center space-y-5 py-4">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t('thankyou.title', lang)}</h2>
        {refCode && (
          <div className="bg-gray-50 rounded-lg px-6 py-3 inline-block">
            <p className="text-xs text-gray-500 mb-1">{t('thankyou.ref', lang)}</p>
            <p className="text-lg font-mono font-bold text-blue-600">{refCode}</p>
          </div>
        )}
        <p className="text-gray-600 text-sm">{t('thankyou.message', lang)}</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs text-yellow-700">
          {t('thankyou.disclaimer', lang)}
        </div>
        <a href="/" className="btn-secondary inline-block">
          {t('thankyou.home', lang)}
        </a>
      </div>
    )
  }

  // ── Contact form ──
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('contact.title', lang)}</h2>
        <p className="text-sm text-gray-500">{t('contact.subtitle', lang)}</p>
      </div>

      <FieldWrapper label={t('contact.first_name', lang)} error={errors.first_name} required>
        <Input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={t('contact.placeholder_first', lang)}
          error={!!errors.first_name}
        />
      </FieldWrapper>

      <FieldWrapper label={t('contact.last_name', lang)} error={errors.last_name} required>
        <Input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder={t('contact.placeholder_last', lang)}
          error={!!errors.last_name}
        />
      </FieldWrapper>

      <FieldWrapper label={t('contact.email', lang)} error={errors.email} required>
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="you@example.com"
          error={!!errors.email}
          dir="ltr"
        />
      </FieldWrapper>

      <FieldWrapper label={t('contact.phone', lang)} error={errors.phone}>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          placeholder={t('contact.placeholder_phone', lang)}
          error={!!errors.phone}
          dir="ltr"
        />
      </FieldWrapper>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
          {submitError}
        </div>
      )}

      <div className="pt-2">
        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? t('contact.submitting', lang) : t('contact.submit', lang)}
        </button>
      </div>
    </form>
  )
}
