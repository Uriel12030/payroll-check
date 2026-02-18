import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Payroll Check – בדיקת שכר חינם',
  description: 'בדקו אם מגיע לכם פיצויים, שעות נוספות, או תשלומים שלא קיבלתם מהמעסיק.',
  openGraph: {
    title: 'Payroll Check – בדיקת שכר חינם',
    description: 'בדקו אם מגיע לכם פיצויים, שעות נוספות, או תשלומים שלא קיבלתם מהמעסיק.',
    locale: 'he_IL',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
