'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step7Schema, type Step7Data } from '@/lib/validations/intake'
import { useWizard } from './WizardContext'
import { submitLead } from '@/actions/submitLead'
import { createClient } from '@/lib/supabase/client'
import type { IntakeFormData } from '@/types'

function ReviewRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '') return null
  const display = typeof value === 'boolean' ? (value ? 'כן' : 'לא') : String(value)
  return (
    <div className="flex gap-2 py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm min-w-[140px]">{label}</span>
      <span className="text-gray-900 text-sm font-medium">{display}</span>
    </div>
  )
}

export function Step7Review() {
  const { data, goPrev } = useWizard()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step7Data>({
    resolver: zodResolver(step7Schema),
    defaultValues: {
      consent: data.consent ?? false,
      marketing_source: data.marketing_source ?? '',
    },
  })

  const onSubmit = async (values: Step7Data) => {
    setSubmitting(true)
    setSubmitError('')

    try {
      // Upload files to Supabase storage
      const supabase = createClient()
      const fileInfos: Array<{
        original_filename: string
        storage_path: string
        mime_type: string
        size_bytes: number
        file_type: string
      }> = []

      const files = data.files ?? []
      for (const file of files) {
        const ext = file.name.split('.').pop()
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('lead-files')
          .upload(path, file, { contentType: file.type })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          // Continue without this file
          continue
        }

        fileInfos.push({
          original_filename: file.name,
          storage_path: path,
          mime_type: file.type,
          size_bytes: file.size,
          file_type: ext ?? 'unknown',
        })
      }

      // Submit lead via server action
      const formPayload: Omit<IntakeFormData, 'files'> = {
        full_name: data.full_name!,
        phone: data.phone!,
        email: data.email!,
        city: data.city!,
        employer_name: data.employer_name!,
        role_title: data.role_title!,
        employment_type: data.employment_type!,
        start_date: data.start_date!,
        end_date: data.end_date ?? '',
        still_employed: data.still_employed ?? false,
        avg_monthly_salary: data.avg_monthly_salary!,
        paid_overtime: data.paid_overtime!,
        overtime_hours_estimate: data.overtime_hours_estimate ?? '',
        attendance_tracking: data.attendance_tracking!,
        pension_provided: data.pension_provided!,
        pension_rate_known: data.pension_rate_known ?? '',
        travel_reimbursement: data.travel_reimbursement!,
        vacation_balance_issue: data.vacation_balance_issue!,
        sick_days_issue: data.sick_days_issue!,
        termination_type: data.termination_type ?? '',
        termination_date: data.termination_date ?? '',
        reason_for_check: data.reason_for_check!,
        consent: values.consent,
        marketing_source: values.marketing_source ?? '',
      }

      const result = await submitLead(formPayload, fileInfos)

      if (!result.success) {
        setSubmitError(result.error ?? 'אירעה שגיאה, נסו שוב.')
        setSubmitting(false)
        return
      }

      router.push(`/thank-you?ref=${result.leadId?.slice(0, 8).toUpperCase()}`)
    } catch (e) {
      console.error(e)
      setSubmitError('אירעה שגיאה בלתי צפויה. נסו שוב.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">סקירה ואישור</h2>
        <p className="text-sm text-gray-500">בדקו את הפרטים לפני השליחה</p>
      </div>

      {/* Summary */}
      <div className="card text-sm">
        <h3 className="font-semibold text-gray-700 mb-3">פרטי קשר</h3>
        <ReviewRow label="שם" value={data.full_name} />
        <ReviewRow label="טלפון" value={data.phone} />
        <ReviewRow label="אימייל" value={data.email} />
        <ReviewRow label="עיר" value={data.city} />
      </div>

      <div className="card text-sm">
        <h3 className="font-semibold text-gray-700 mb-3">פרטי העסקה</h3>
        <ReviewRow label="מעסיק" value={data.employer_name} />
        <ReviewRow label="תפקיד" value={data.role_title} />
        <ReviewRow label="תחילת עבודה" value={data.start_date} />
        <ReviewRow label="עדיין מועסק" value={data.still_employed} />
        <ReviewRow label="שכר ממוצע" value={data.avg_monthly_salary ? `₪${data.avg_monthly_salary.toLocaleString()}` : undefined} />
      </div>

      <div className="card text-sm">
        <h3 className="font-semibold text-gray-700 mb-3">שעות ושכר</h3>
        <ReviewRow label="שעות נוספות שולמו" value={data.paid_overtime} />
        <ReviewRow label="פנסיה הופרשה" value={data.pension_provided} />
        <ReviewRow label="החזר נסיעות" value={data.travel_reimbursement} />
        <ReviewRow label="מסמכים" value={data.files?.length ? `${data.files.length} קבצים` : 'לא הועלו'} />
      </div>

      {/* Source */}
      <div>
        <label className="form-label">איך שמעתם עלינו? (לא חובה)</label>
        <select {...register('marketing_source')} className="form-input bg-white">
          <option value="">בחרו</option>
          <option value="google">גוגל</option>
          <option value="facebook">פייסבוק</option>
          <option value="friend">המלצה מחבר/ה</option>
          <option value="tiktok">TikTok</option>
          <option value="other">אחר</option>
        </select>
      </div>

      {/* Consent */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-xs text-yellow-800 mb-3">
          <strong>הצהרה:</strong> הבדיקה המוצגת היא ממוחשבת בלבד ואינה מהווה ייעוץ משפטי.
          השימוש בשירות כפוף לתנאי השימוש ולמדיניות הפרטיות.
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            {...register('consent')}
            type="checkbox"
            className="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 flex-shrink-0"
          />
          <span className="text-sm text-gray-700">
            אני מסכים/ה לתנאי השימוש ולמדיניות הפרטיות, ומאשר/ת שהפרטים שמסרתי נכונים.
          </span>
        </label>
        {errors.consent && (
          <p className="form-error mt-2">{errors.consent.message}</p>
        )}
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
          {submitError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={goPrev} className="btn-secondary flex-1" disabled={submitting}>
          → חזור
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={submitting}>
          {submitting ? 'שולח...' : 'שלח את הבקשה ←'}
        </button>
      </div>
    </form>
  )
}
