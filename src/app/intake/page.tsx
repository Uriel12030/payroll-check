import { IntakeWizard } from '@/components/intake/IntakeWizard'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'בדיקת שכר – Payroll Check',
  description: 'מלאו את השאלון וקבלו הערכה ראשונית תוך דקות',
}

export default function IntakePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="text-blue-600 font-bold text-xl">
            Payroll Check
          </a>
          <p className="text-sm text-gray-500 mt-1">בדיקת זכויות עובדים – חינם ומהיר</p>
        </div>

        <div className="card">
          <IntakeWizard />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          הבדיקה ממוחשבת בלבד ואינה ייעוץ משפטי. פרטיך מוצפנים ומאובטחים.
        </p>
      </div>
    </div>
  )
}
