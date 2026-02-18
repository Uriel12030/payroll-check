import Link from 'next/link'
import { CheckCircle, Shield, Clock, FileText } from 'lucide-react'

const benefits = [
  { icon: Clock, title: 'שעות נוספות', desc: 'בדקו אם קיבלתם תגמול מלא עבור שעות עבודה מעבר לנורמה' },
  { icon: Shield, title: 'פנסיה ורווחה', desc: 'וודאו שהמעסיק הפריש לפנסיה ולביטוח לאומי כנדרש' },
  { icon: FileText, title: 'פיצויים', desc: 'בדקו זכאות לפיצויי פיטורים, דמי הודעה מוקדמת ועוד' },
  { icon: CheckCircle, title: 'חופשה ומחלה', desc: 'בדקו אם ניצלתם את מלוא ימי החופשה והמחלה המגיעים לכם' },
]

const steps = [
  { num: '01', title: 'מלאו פרטים', desc: 'שאלון קצר על תנאי העסקתכם – 5 דקות בלבד' },
  { num: '02', title: 'העלו מסמכים', desc: 'תלושי שכר, חוזה עבודה או כל מסמך רלוונטי' },
  { num: '03', title: 'קבלו תשובה', desc: 'עורך דין יבדוק ויחזור אליכם תוך 48 שעות' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-bold text-xl text-blue-600">Payroll Check</div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">איך זה עובד</a>
            <a href="#benefits" className="hover:text-blue-600 transition-colors">מה בודקים</a>
          </nav>
          <Link href="/intake" className="btn-primary text-sm py-2 px-4">
            בדיקה חינם
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block bg-blue-100 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            ✓ ללא עלות · ללא התחייבות
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            האם מגיע לכם כסף
            <span className="text-blue-600"> מהמעסיק?</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            מילאתם שנים של עבודה – בדקו אם קיבלתם את כל המגיע לכם: שעות נוספות, פנסיה, פיצויים, חופשה ועוד.
          </p>
          <Link
            href="/intake"
            className="inline-block bg-blue-600 text-white text-lg font-bold px-10 py-4 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            התחילו בדיקה חינם ←
          </Link>
          <p className="text-sm text-gray-400 mt-4">
            בדיקה ממוחשבת בלבד. אינה מהווה ייעוץ משפטי.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">
            איך זה עובד?
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div className="text-5xl font-black text-blue-100 mb-3">{step.num}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">
            מה הבדיקה כוללת?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="card flex gap-5 items-start">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                  <benefit.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{benefit.title}</h3>
                  <p className="text-gray-500 text-sm">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">מוכנים לבדוק?</h2>
          <p className="text-blue-100 mb-8">
            מאות עובדים כבר גילו שמגיע להם תשלום שלא קיבלו. הבדיקה חינם ולוקחת 5 דקות.
          </p>
          <Link
            href="/intake"
            className="inline-block bg-white text-blue-600 font-bold text-lg px-10 py-4 rounded-xl hover:bg-blue-50 transition-colors"
          >
            התחילו עכשיו – חינם
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4">
        <div className="max-w-5xl mx-auto text-center text-sm">
          <div className="font-bold text-white text-lg mb-2">Payroll Check</div>
          <p className="mb-4">בדיקת זכויות עובדים – ממוחשבת ומהירה</p>
          <p className="text-xs text-gray-600">
            הבדיקה היא ממוחשבת בלבד ואינה מהווה ייעוץ משפטי.
            הפנייה לעורך דין כפופה לתנאי השירות. © {new Date().getFullYear()} Payroll Check
          </p>
        </div>
      </footer>
    </div>
  )
}
