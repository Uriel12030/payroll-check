import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Lead } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  // Verify admin session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !lead) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const l = lead as Lead
  const refId = params.id.slice(0, 8).toUpperCase()
  const date = new Date(l.created_at).toLocaleDateString('he-IL')

  // Generate simple HTML-based PDF content
  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<title>Payroll Check – דוח פנייה ${refId}</title>
<style>
  body { font-family: Arial, sans-serif; direction: rtl; padding: 40px; color: #1a1a1a; }
  h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
  h2 { color: #374151; margin-top: 24px; margin-bottom: 8px; font-size: 14px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
  td:first-child { color: #6b7280; width: 200px; }
  .score { font-size: 36px; font-weight: 900; color: #2563eb; }
  .disclaimer { background: #fefce8; border: 1px solid #fde047; padding: 12px; border-radius: 8px; font-size: 11px; color: #713f12; margin-top: 32px; }
  .flag { display: inline-block; background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin: 2px; }
</style>
</head>
<body>
<h1>Payroll Check – דוח פנייה</h1>
<p style="color:#6b7280">מספר פנייה: <strong>${refId}</strong> · תאריך: ${date}</p>

<h2>פרטי קשר</h2>
<table>
  <tr><td>שם מלא</td><td>${l.full_name}</td></tr>
  <tr><td>טלפון</td><td>${l.phone}</td></tr>
  <tr><td>אימייל</td><td>${l.email}</td></tr>
  <tr><td>עיר</td><td>${l.city}</td></tr>
</table>

<h2>פרטי העסקה</h2>
<table>
  <tr><td>מעסיק</td><td>${l.employer_name}</td></tr>
  <tr><td>תפקיד</td><td>${l.role_title}</td></tr>
  <tr><td>סוג העסקה</td><td>${l.employment_type}</td></tr>
  <tr><td>תחילת עבודה</td><td>${l.start_date}</td></tr>
  <tr><td>סיום עבודה</td><td>${l.end_date ?? 'עדיין מועסק'}</td></tr>
  <tr><td>שכר ברוטו ממוצע</td><td>₪${Number(l.avg_monthly_salary).toLocaleString()}</td></tr>
</table>

<h2>שעות עבודה</h2>
<table>
  <tr><td>שעות נוספות שולמו</td><td>${l.paid_overtime}</td></tr>
  <tr><td>הערכת שעות נוספות</td><td>${l.overtime_hours_estimate ?? '—'}</td></tr>
  <tr><td>מעקב נוכחות</td><td>${l.attendance_tracking}</td></tr>
</table>

<h2>הטבות וזכויות</h2>
<table>
  <tr><td>פנסיה</td><td>${l.pension_provided}</td></tr>
  <tr><td>החזר נסיעות</td><td>${l.travel_reimbursement}</td></tr>
  <tr><td>בעיית חופשה</td><td>${l.vacation_balance_issue}</td></tr>
  <tr><td>בעיית מחלה</td><td>${l.sick_days_issue}</td></tr>
</table>

<h2>סיכום בדיקה</h2>
<p>ציון: <span class="score">${l.lead_score ?? '—'}</span> / 100</p>
${l.admin_notes ? `<h2>הערות מנהל</h2><p>${l.admin_notes}</p>` : ''}

<div class="disclaimer">
  <strong>הצהרה משפטית:</strong> הבדיקה המוצגת בדוח זה היא ממוחשבת בלבד ואינה מהווה ייעוץ משפטי מכל סוג שהוא.
  התוצאות מבוססות על מידע שנמסר על ידי הפונה ואינן מחליפות התייעצות עם עורך דין.
  © ${new Date().getFullYear()} Payroll Check
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="lead-${refId}.html"`,
    },
  })
}
