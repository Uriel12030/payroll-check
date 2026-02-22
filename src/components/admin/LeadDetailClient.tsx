'use client'

import { useState, useTransition } from 'react'
import { updateLeadStatus, updateLeadNotes } from '@/actions/updateLead'
import type { Lead, LeadFile, LeadStatus, LeadFlags } from '@/types'
import { FileText, Download, CheckCircle, XCircle, Clock, AlertCircle, Mail } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { LeadPDFButton } from './LeadPDFButton'
import { EmailTab } from './EmailTab'

type TabKey = 'details' | 'emails'

interface Props {
  lead: Lead
  files: (LeadFile & { signedUrl: string | null })[]
  initialTab?: TabKey
}

const statusConfig: Record<LeadStatus, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: 'חדש', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Clock },
  reviewing: { label: 'בבדיקה', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertCircle },
  accepted: { label: 'מקובל', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  rejected: { label: 'נדחה', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
}

function InfoRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '') return null
  const display = typeof value === 'boolean' ? (value ? 'כן' : 'לא') : String(value)
  return (
    <div className="flex gap-2 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm min-w-[180px] flex-shrink-0">{label}</span>
      <span className="text-gray-900 text-sm">{display}</span>
    </div>
  )
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400">—</span>
  const color = score >= 60 ? 'bg-green-500' : score >= 30 ? 'bg-yellow-500' : 'bg-gray-400'
  return (
    <div className="flex items-center gap-3">
      <span className="text-3xl font-black text-gray-900">{score}</span>
      <div className="flex-1 max-w-[160px] bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm text-gray-400">/ 100</span>
    </div>
  )
}

export function LeadDetailClient({ lead, files, initialTab = 'details' }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab)
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [notes, setNotes] = useState(lead.admin_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleStatusChange = (newStatus: LeadStatus) => {
    startTransition(async () => {
      setStatus(newStatus)
      await updateLeadStatus(lead.id, newStatus)
      setMessage('סטטוס עודכן')
      setTimeout(() => setMessage(''), 2000)
    })
  }

  const handleSaveNotes = async () => {
    setSaving(true)
    await updateLeadNotes(lead.id, notes)
    setSaving(false)
    setMessage('הערות נשמרו')
    setTimeout(() => setMessage(''), 2000)
  }

  const flags = lead.lead_flags as LeadFlags | null

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap items-start gap-6">
          {/* Score */}
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">ציון אוטומטי</p>
            <ScoreBar score={lead.lead_score} />
            <p className="text-xs text-gray-400 mt-2">בדיקה ממוחשבת. אינה ייעוץ משפטי.</p>
          </div>

          {/* Status */}
          <div className="flex-1 min-w-[200px]">
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">סטטוס</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(statusConfig) as LeadStatus[]).map((s) => {
                const cfg = statusConfig[s]
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={isPending}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      status === s
                        ? cfg.color + ' ring-2 ring-offset-1 ring-blue-400'
                        : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Flags */}
          {flags && (
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">דגלים</p>
              <div className="flex flex-wrap gap-1.5">
                {flags.no_pension && <FlagBadge label="ללא פנסיה" />}
                {flags.unpaid_overtime && <FlagBadge label="שעות נוספות לא משולמות" />}
                {flags.no_travel && <FlagBadge label="ללא החזר נסיעות" />}
                {flags.vacation_issue && <FlagBadge label="בעיית חופשה" />}
                {flags.sick_days_issue && <FlagBadge label="בעיית מחלה" />}
                {flags.termination_flag && <FlagBadge label="פיטורים" />}
                {flags.recent_employment && <FlagBadge label="העסקה עדכנית" color="blue" />}
              </div>
            </div>
          )}
        </div>

        {message && (
          <div className="mt-4 text-sm text-green-600 font-medium">{message}</div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'details'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          פרטים
        </button>
        <button
          onClick={() => setActiveTab('emails')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'emails'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Mail className="w-4 h-4" />
          אימיילים
        </button>
      </div>

      {/* Tab: Emails */}
      {activeTab === 'emails' && (
        <EmailTab leadId={lead.id} leadEmail={lead.email} />
      )}

      {/* Tab: Details */}
      {activeTab === 'details' && (
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lead info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">פרטי קשר</h2>
            <InfoRow label="שם מלא" value={lead.full_name} />
            <InfoRow label="טלפון" value={lead.phone} />
            <InfoRow label="אימייל" value={lead.email} />
            <InfoRow label="עיר" value={lead.city} />
            <InfoRow label="תאריך פנייה" value={formatDate(lead.created_at)} />
            <InfoRow label="מקור שיווק" value={lead.marketing_source} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">פרטי העסקה</h2>
            <InfoRow label="מעסיק" value={lead.employer_name} />
            <InfoRow label="תפקיד" value={lead.role_title} />
            <InfoRow label="סוג העסקה" value={lead.employment_type} />
            <InfoRow label="תחילת עבודה" value={lead.start_date} />
            <InfoRow label="סיום עבודה" value={lead.end_date} />
            <InfoRow label="עדיין מועסק" value={lead.still_employed} />
            <InfoRow label="שכר ממוצע" value={`₪${Number(lead.avg_monthly_salary).toLocaleString()}`} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">שעות עבודה</h2>
            <InfoRow label="שעות נוספות שולמו" value={lead.paid_overtime} />
            <InfoRow label="הערכת שעות נוספות" value={lead.overtime_hours_estimate} />
            <InfoRow label="מעקב נוכחות" value={lead.attendance_tracking} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">הטבות וזכויות</h2>
            <InfoRow label="פנסיה הופרשה" value={lead.pension_provided} />
            <InfoRow label="שיעור פנסיה" value={lead.pension_rate_known} />
            <InfoRow label="החזר נסיעות" value={lead.travel_reimbursement} />
            <InfoRow label="בעיית חופשה" value={lead.vacation_balance_issue} />
            <InfoRow label="בעיית מחלה" value={lead.sick_days_issue} />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">סיום עבודה</h2>
            <InfoRow label="אופן סיום" value={lead.termination_type} />
            <InfoRow label="תאריך סיום" value={lead.termination_date} />
            <InfoRow label="סיבת הפנייה" value={lead.reason_for_check} />
          </div>

          {/* Files */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">
              מסמכים ({files.length})
            </h2>
            {files.length === 0 ? (
              <p className="text-sm text-gray-400">לא הועלו מסמכים</p>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{file.original_filename}</p>
                      <p className="text-xs text-gray-400">
                        {(file.size_bytes / 1024 / 1024).toFixed(2)} MB · {file.mime_type}
                      </p>
                    </div>
                    {file.signedUrl && (
                      <a
                        href={file.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                      >
                        <Download className="w-4 h-4" />
                        הורד
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">הערות מנהל</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="form-input resize-none mb-3"
              placeholder="הוסיפו הערות פנימיות..."
            />
            <button
              onClick={handleSaveNotes}
              disabled={saving}
              className="btn-primary text-sm py-2 px-5"
            >
              {saving ? 'שומר...' : 'שמור הערות'}
            </button>
          </div>

          {/* PDF Export */}
          <LeadPDFButton lead={lead} />
        </div>
      </div>
      )}
    </div>
  )
}

function FlagBadge({ label, color = 'red' }: { label: string; color?: 'red' | 'blue' }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
      color === 'red' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
    }`}>
      {label}
    </span>
  )
}
