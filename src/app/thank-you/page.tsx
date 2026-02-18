import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'תודה! – Payroll Check',
}

interface Props {
  searchParams: { ref?: string }
}

export default function ThankYouPage({ searchParams }: Props) {
  const ref = searchParams.ref

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="card">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            הבקשה התקבלה!
          </h1>

          {ref && (
            <div className="bg-gray-50 rounded-lg px-6 py-3 mb-4 inline-block">
              <p className="text-xs text-gray-500 mb-1">מספר פנייה</p>
              <p className="text-lg font-mono font-bold text-blue-600">{ref}</p>
            </div>
          )}

          <p className="text-gray-600 mb-6">
            קיבלנו את הפרטים שלך ונחזור אליך תוך <strong>48 שעות עבודה</strong> עם הערכה ראשונית.
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-xs text-yellow-700 mb-6 text-right">
            הבדיקה המוצגת היא ממוחשבת בלבד ואינה מהווה ייעוץ משפטי.
            פנייה לייעוץ מחייבת שיחה עם עורך הדין.
          </div>

          <Link href="/" className="btn-secondary inline-block">
            חזור לעמוד הבית
          </Link>
        </div>
      </div>
    </div>
  )
}
