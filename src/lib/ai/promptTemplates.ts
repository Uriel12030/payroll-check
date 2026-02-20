import type { RequiredField } from '@/types'

/**
 * System prompt for the AI email assistant.
 * Kept in one place for maintainability and stability.
 */
export function buildSystemPrompt(): string {
  return `אתה עוזר משפטי ממוחשב במערכת "Payroll Check" – מערכת לבדיקת זכויות עובדים.
תפקידך:
1. לסכם את השיחה עם הפונה.
2. לחלץ עובדות מהשיחה (תאריכים, שמות, סכומים, נתונים רלוונטיים).
3. לנסח אימייל תשובה מנומס ומקצועי בעברית, שכולל שאלות ממוקדות למילוי מידע חסר.

כללים חשובים:
- כתוב תמיד בעברית.
- הטון: מקצועי, אמפתי, ברור.
- אל תספק מסקנות משפטיות סופיות. תמיד הדגש שמדובר בבדיקה ראשונית.
- שאל רק שאלות שרלוונטיות למידע החסר שקיבלת ברשימה.
- היה תמציתי. השתמש בנקודות (bullets) לשאלות.
- אם הפונה שאל שאלה דחופה, הכר בה וציין שאנו בודקים.
- אל תמציא מידע שלא קיים בשיחה.

פלט: ענה אך ורק ב-JSON תקין לפי הפורמט שתקבל.`
}

/**
 * Build the user prompt with context for analysis.
 */
export function buildAnalysisPrompt(params: {
  leadName: string
  caseType: string
  currentSummary: string
  knownFacts: Record<string, string | number | boolean | null>
  missingFields: RequiredField[]
  conversationThread: Array<{
    direction: string
    from: string
    occurred_at: string
    text: string
  }>
}): string {
  const { leadName, caseType, currentSummary, knownFacts, missingFields, conversationThread } = params

  const factsStr = Object.entries(knownFacts)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n')

  const missingStr = missingFields
    .map((f) => `  - ${f.label} (${f.key}): "${f.question}"`)
    .join('\n')

  const threadStr = conversationThread
    .map((m) => `[${m.direction === 'inbound' ? 'פונה' : 'מערכת'}] (${m.occurred_at}):\n${m.text}`)
    .join('\n\n---\n\n')

  return `## פרטי התיק
שם הפונה: ${leadName}
סוג תיק: ${caseType}

## סיכום נוכחי
${currentSummary || '(אין סיכום עדיין)'}

## עובדות ידועות
${factsStr || '(אין עובדות עדיין)'}

## מידע חסר – שאל רק על אלה:
${missingStr || '(אין מידע חסר)'}

## שרשור השיחה (מהישן לחדש)
${threadStr}

## הנחיות פלט
ענה ב-JSON בלבד, בדיוק בפורמט הזה:
{
  "case_summary": "סיכום מעודכן של התיק",
  "extracted_facts": { "key": "ערך שחולץ מהשיחה" },
  "risk_flags": ["דגל סיכון אם רלוונטי"],
  "suggested_subject": "נושא המייל המוצע",
  "suggested_reply_text": "גוף המייל המוצע בטקסט רגיל",
  "suggested_reply_html": null,
  "questions": ["שאלה 1", "שאלה 2"]
}

חשוב: ב-questions כלול רק שאלות שמתאימות לשדות החסרים מהרשימה למעלה.`
}
