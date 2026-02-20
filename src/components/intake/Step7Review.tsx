'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step7Schema, type Step7Data } from '@/lib/validations/intake'
import { useWizard } from './WizardContext'
import { submitLead } from '@/actions/submitLead'
import type { IntakeFormData } from '@/types'

type FileInfo = {
  original_filename: string
  storage_path: string
  mime_type: string
  size_bytes: number
  file_type: string
}

/** Holds the result of a partial upload failure so the user can decide. */
type PartialUploadState = {
  fileInfos: FileInfo[]        // successfully uploaded
  failedNames: string[]        // names of files that failed
  payload: Omit<IntakeFormData, 'files'>
}

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
  const { data, goPrev, leadId } = useWizard()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [partialUpload, setPartialUpload] = useState<PartialUploadState | null>(null)

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

  /** Upload a single file through the server-side API route (uses service role key). */
  const uploadFile = async (file: File): Promise<FileInfo> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
    return json as FileInfo
  }

  /** Call the submitLead server action and redirect on success. */
  const doSubmitLead = async (
    payload: Omit<IntakeFormData, 'files'>,
    fileInfos: FileInfo[]
  ) => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await submitLead(payload, fileInfos, leadId)
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

  const onSubmit = async (values: Step7Data) => {
    setSubmitting(true)
    setSubmitError('')
    setPartialUpload(null)

    try {
      // Upload all files in parallel via the server-side route.
      // Using the service role key server-side means no anon RLS policy is needed.
      const files = data.files ?? []
      const results = await Promise.allSettled(files.map(uploadFile))

      const fileInfos: FileInfo[] = []
      const failedNames: string[] = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          fileInfos.push(r.value)
        } else {
          console.error('[Step7] Upload failed for', files[i]?.name, r.reason)
          failedNames.push(files[i]?.name ?? `קובץ ${i + 1}`)
        }
      })

      const payload: Omit<IntakeFormData, 'files'> = {
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

      if (failedNames.length > 0) {
        // Pause: show the user which files failed and let them decide.
        setPartialUpload({ fileInfos, failedNames, payload })
        setSubmitting(false)
        return
      }

      await doSubmitLead(payload, fileInfos)
    } catch (e) {
      console.error(e)
      setSubmitError('אירעה שגיאה בלתי צפויה. נסו שוב.')
      setSubmitting(false)
    }
  }

  // ── Partial-upload failure screen ──────────────────────────────────────────
  if (partialUpload) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">שגיאה בהעלאת קבצים</h2>
          <p className="text-sm text-gray-500">
            חלק מהקבצים לא הועלו בהצלחה. תוכלו להמשיך ללא הקבצים שנכשלו, או לחזור ולנסות שנית.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-yellow-800">הקבצים הבאים לא הועלו:</p>
          <ul className="list-disc list-inside space-y-1">
            {partialUpload.failedNames.map((name) => (
              <li key={name} className="text-sm text-yellow-700 font-mono truncate">
                {name}
              </li>
            ))}
          </ul>
          {partialUpload.fileInfos.length > 0 && (
            <p className="text-xs text-yellow-700 pt-1">
              {partialUpload.fileInfos.length} קבצים הועלו בהצלחה ויישמרו.
            </p>
          )}
        </div>

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 text-sm">
            {submitError}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => { setPartialUpload(null); setSubmitError('') }}
            className="btn-secondary flex-1"
            disabled={submitting}
          >
            → חזור לטופס
          </button>
          <button
            type="button"
            onClick={() => doSubmitLead(partialUpload.payload, partialUpload.fileInfos)}
            className="btn-primary flex-1"
            disabled={submitting}
          >
            {submitting ? 'שולח...' : 'המשך ללא הקבצים שנכשלו ←'}
          </button>
        </div>
      </div>
    )
  }

  // ── Normal review form ─────────────────────────────────────────────────────
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
          {submitting ? 'מעלה קבצים ושולח...' : 'שלח את הבקשה ←'}
        </button>
      </div>
    </form>
  )
}
