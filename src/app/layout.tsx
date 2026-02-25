import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { LanguageProvider } from '@/lib/i18n/LanguageContext'
import { MetaPixel } from '@/components/MetaPixel'
import { AnalyticsTracker } from '@/components/AnalyticsTracker'
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
  // Read the per-request nonce set by middleware for Content-Security-Policy
  const nonce = headers().get('x-nonce') ?? ''

  return (
    <html lang="he" dir="rtl">
      <head>
        {/* Expose nonce to Next.js runtime so its own inline scripts get the attribute */}
        {nonce && <meta property="csp-nonce" content={nonce} />}
      </head>
      <body className="antialiased bg-gray-50 min-h-screen" {...(nonce ? { 'data-nonce': nonce } : {})}>
        <MetaPixel nonce={nonce} />
        <LanguageProvider>
          <AnalyticsTracker />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
