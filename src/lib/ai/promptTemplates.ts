import type { RequiredField, AiPlaybook, EmailTone } from '@/types'
import type { ConversationThread } from './shared'

// ============================================================
// EXISTING PROMPTS (legacy — used by aiAnalyzer.ts)
// ============================================================

/**
 * System prompt for the AI email assistant (legacy).
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
 * Build the user prompt with context for analysis (legacy).
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

// ============================================================
// WORKBENCH PROMPTS (new — used by workbenchAnalyzer.ts)
// ============================================================

/**
 * Build playbooks section for prompts.
 */
function formatPlaybooksSection(playbooks: AiPlaybook[]): string {
  return playbooks.map((pb) => {
    const questions = pb.questions
      .map((q) => `    - ${q.label_he} (${q.key}, עדיפות: ${q.priority})`)
      .join('\n')
    const docs = pb.documents
      .map((d) => `    - ${d.label_he} (${d.key})`)
      .join('\n')
    const flags = pb.red_flags
      .map((f) => `    - ${f.label_he} (${f.severity ?? 'medium'})`)
      .join('\n')
    const strengths = pb.strengths
      .map((s) => `    - ${s.label_he}`)
      .join('\n')

    return `### ${pb.title_he} (slug: "${pb.slug}")
${pb.description_he ?? ''}
  שאלות:
${questions || '    (אין)'}
  מסמכים לבקש:
${docs || '    (אין)'}
  דגלי סיכון:
${flags || '    (אין)'}
  נקודות חוזק:
${strengths || '    (אין)'}`
  }).join('\n\n')
}

/**
 * System prompt for workbench analysis.
 */
export function buildWorkbenchSystemPrompt(playbooks: AiPlaybook[]): string {
  const playbooksSection = formatPlaybooksSection(playbooks)

  return `אתה עוזר משפטי ממוחשב (סטאז'ר AI) במערכת "Payroll Check" לבדיקת זכויות עובדים בישראל.

תפקידך לנתח תיק עובד ולהכין לוח עבודה לעורך הדין:
1. סכם את כל המידע הידוע בנקודות ברורות.
2. זהה אילו נושאים (playbooks) רלוונטיים לתיק מבין הנושאים הזמינים.
3. הפק רשימת שאלות ממוקדות (מקסימום 12), מקובצות לפי נושא.
4. זהה דגלי סיכון ונקודות חוזק.
5. המלץ על מסמכים לבקש מהפונה.

כללים:
- כתוב תמיד בעברית.
- אל תספק מסקנות משפטיות — רק ניתוח עובדתי.
- אל תמציא מידע שלא קיים.
- סמן שאלות לפי סדר עדיפות.
- לכל שאלה ציין מאיזה נושא (playbook_slug) היא מגיעה.
- סמן רק playbooks שרלוונטיים — אל תסמן הכל.
- בשדה extracted_facts, חלץ עובדות חדשות מהשיחה עם מפתחות ברורים.
- בשדה missing_info_he, ציין 3 רשימות קצרות: מה הבנת, מה חסר כדי להעריך, מה לבקש עכשיו.
- בשדה risk_notes_internal_he, רשום הערות פנימיות לעו"ד — הערכות ("נראה חלש", "סיכוי טוב") שלעולם לא יופיעו מול הלקוח.
- לכל מסמך ציין עדיפות: high/medium/low.

## נושאים זמינים (Playbooks):
${playbooksSection}

פלט: JSON בלבד לפי הפורמט שתקבל.`
}

/**
 * User prompt for workbench analysis.
 */
export function buildWorkbenchAnalysisPrompt(params: {
  leadName: string
  caseType: string
  currentSummary: string
  knownFacts: Record<string, string | number | boolean | null>
  missingFields: RequiredField[]
  conversationThread: ConversationThread[]
  playbooks: AiPlaybook[]
}): string {
  const { leadName, caseType, currentSummary, knownFacts, missingFields, conversationThread, playbooks } = params

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

  const playbookSlugs = playbooks.map((p) => `"${p.slug}"`).join(', ')

  return `## פרטי התיק
שם הפונה: ${leadName}
סוג תיק: ${caseType}

## סיכום נוכחי
${currentSummary || '(אין סיכום עדיין — זהו ניתוח ראשון)'}

## עובדות ידועות
${factsStr || '(אין עובדות עדיין)'}

## מידע חסר
${missingStr || '(אין מידע חסר)'}

## שרשור השיחות (מהישן לחדש)
${threadStr || '(אין שיחות עדיין)'}

## הנחיות פלט
ענה ב-JSON בלבד, בדיוק בפורמט הזה:
{
  "workbench_summary": "סיכום מפורט בנקודות (bullets) — כל מה שידוע, מה חסר, ומה חשוב",
  "case_summary": "משפט-שניים סיכום קצר",
  "missing_info_he": ["מה חסר כדי להעריך את התיק — פריט 1", "פריט 2"],
  "risk_notes_internal_he": ["הערה פנימית לעו\"ד בלבד — לעולם לא מול הלקוח"],
  "extracted_facts": { "key": "ערך חדש שחולץ" },
  "active_playbooks": [${playbookSlugs}],
  "recommended_questions": [
    {
      "id": "q_1",
      "text_he": "השאלה בעברית",
      "playbook_slug": "overtime",
      "selected": true,
      "answered": false
    }
  ],
  "risk_flags": [
    {"label_he": "תיאור הסיכון", "severity": "high", "playbook_slug": "overtime", "source": "ai"}
  ],
  "strength_flags": [
    {"label_he": "נקודת חוזק", "playbook_slug": null, "source": "ai"}
  ],
  "documents_to_request": [
    {"key": "payslips", "label_he": "תלושי שכר", "priority": "high"}
  ]
}

חשוב:
- ב-active_playbooks כלול רק slugs של נושאים רלוונטיים מהרשימה: ${playbookSlugs}
- ב-recommended_questions מקסימום 12 שאלות, מקובצות לפי playbook_slug
- ב-extracted_facts חלץ רק מידע חדש שלא נמצא כבר ב"עובדות ידועות"
- לכל שאלה תן id ייחודי (q_1, q_2, ...)
- ב-missing_info_he כלול פריטים קצרים: מה חסר כדי להעריך את התיק נכון
- ב-risk_notes_internal_he כלול הערכות פנימיות בלבד (לעיני עו"ד) — לדוגמה: "הטענה נראית חלשה", "סיכוי טוב לתביעה"
- לכל מסמך ב-documents_to_request ציין priority: high/medium/low
- אל תמציא — אם אין מספיק מידע, כתוב פחות`
}

// ============================================================
// EMAIL DRAFT PROMPTS (used by emailDrafter.ts)
// ============================================================

const TONE_INSTRUCTIONS: Record<EmailTone, string> = {
  friendly: 'ידידותי, חם, אמפתי. פנייה בגוף שני, שפה פשוטה וברורה.',
  formal: 'רשמי ומקצועי. פנייה בגוף שלישי, שפה עניינית ומדויקת.',
  firm: 'תקיף אך מכבד. הדגש שהמידע חשוב ודחוף לטיפול.',
}

const LANGUAGE_NAMES: Record<string, string> = {
  he: 'עברית',
  en: 'אנגלית',
  ru: 'רוסית',
  am: 'אמהרית',
}

/**
 * System prompt for email draft generation.
 */
export function buildEmailDraftSystemPrompt(tone: EmailTone, language: string): string {
  const toneInstruction = TONE_INSTRUCTIONS[tone] ?? TONE_INSTRUCTIONS.friendly
  const langName = LANGUAGE_NAMES[language] ?? language

  return `אתה עוזר משפטי ממוחשב (סטאז'ר AI) במערכת "Payroll Check". תפקידך לנסח אימייל לפונה.

## כללים קריטיים:
- זהו אימייל איסוף מידע + תיאום שיחה. לא מכתב דרישה.
- אין מסקנות משפטיות, אין הבטחות, אין סכומים.
- מקסימום 8-12 שאלות מקובצות לפי נושא.
- בקש מסמכים רלוונטיים (תלושים, חוזה, מכתבים).
- CTA: השב עם תשובות ומסמכים, או קבע שיחה טלפונית.
- הוסף הערת פרטיות קצרה: "המידע שלך מאובטח וישמש רק לצורך הבדיקה."
- הוסף: "עורך דין יעבור על המידע ויצור איתך קשר."
- אתה עוזר, לא עורך דין. אל תתייצג כעורך דין.

## טון: ${toneInstruction}
## שפת האימייל החיצוני: ${langName}

## פלט כפול:
1. internal_summary_he: סיכום פנימי בעברית לעורך הדין — מה אנחנו שולחים ולמה. כאן מותר לכלול הערכות פנימיות ("הטענה נראית חלשה", "יש סיכוי טוב") שלעולם לא יופיעו באימייל החיצוני.
2. suggested_subject + suggested_text + suggested_html: האימייל עצמו בשפת ${langName}.
3. hebrew_translation: תרגום עברי של האימייל החיצוני (null אם השפה עברית).

פלט: JSON בלבד.`
}

/**
 * User prompt for email draft generation.
 */
export function buildEmailDraftPrompt(params: {
  leadName: string
  caseType: string
  language: string
  knownFacts: Record<string, string | number | boolean | null>
  selectedQuestions: Array<{ id: string; text_he: string; playbook_slug: string | null }>
  selectedDocuments: Array<{ key: string; label_he: string }>
  conversationThread: ConversationThread[]
  adminNotes?: string
}): string {
  const { leadName, caseType, language, knownFacts, selectedQuestions, selectedDocuments, conversationThread, adminNotes } = params

  const langName = LANGUAGE_NAMES[language] ?? language

  const factsStr = Object.entries(knownFacts)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n')

  const questionsStr = selectedQuestions
    .map((q) => `  - [${q.id}] ${q.text_he}${q.playbook_slug ? ` (${q.playbook_slug})` : ''}`)
    .join('\n')

  const docsStr = selectedDocuments
    .map((d) => `  - ${d.label_he} (${d.key})`)
    .join('\n')

  const threadStr = conversationThread
    .map((m) => `[${m.direction === 'inbound' ? 'פונה' : 'מערכת'}] (${m.occurred_at}):\n${m.text}`)
    .join('\n\n---\n\n')

  return `## פרטי התיק
שם הפונה: ${leadName}
סוג תיק: ${caseType}
שפה מועדפת: ${langName}

## עובדות ידועות
${factsStr || '(אין עובדות עדיין)'}

## שאלות לכלול במייל
${questionsStr || '(אין שאלות נבחרות)'}

## מסמכים לבקש
${docsStr || '(אין מסמכים לבקש)'}

## שרשור שיחה קודמת
${threadStr || '(אין שיחה קודמת — זהו מייל ראשון)'}

${adminNotes ? `## הערות עו"ד\n${adminNotes}` : ''}

## הנחיות פלט
ענה ב-JSON בלבד:
{
  "internal_summary_he": "סיכום פנימי בעברית לעו\"ד — מה שולחים ולמה, כולל הערכות פנימיות",
  "suggested_subject": "נושא המייל ב${langName}",
  "suggested_text": "גוף המייל ב${langName} (טקסט רגיל)",
  "suggested_html": null,
  "hebrew_translation": ${language === 'he' ? 'null' : '"תרגום עברי של האימייל"'},
  "questions_included": ["q_1", "q_2"]
}

חשוב:
- כתוב את האימייל החיצוני ב${langName}, לא בעברית${language !== 'he' ? ' (אלא אם השפה עברית)' : ''}.
- ב-questions_included רשום את ה-IDs של השאלות שנכללו בפועל.
- ${language !== 'he' ? 'ב-hebrew_translation תרגם את האימייל החיצוני לעברית (לשימוש פנימי).' : 'hebrew_translation = null כי השפה עברית.'}
- internal_summary_he הוא לעיני עו"ד בלבד — מותר לכתוב הערכות שלא יישלחו ללקוח.`
}

// ============================================================
// TRANSLATION PROMPT (used by translator.ts)
// ============================================================

/**
 * Build a prompt for translating text to Hebrew.
 */
export function buildTranslationPrompt(text: string): string {
  return `תרגם את הטקסט הבא לעברית. שמור על משמעות מדויקת, טון מקצועי, ופורמט מקורי.

## טקסט לתרגום:
${text}

## הנחיות פלט
ענה ב-JSON בלבד:
{
  "hebrew_translation": "הטקסט המתורגם לעברית"
}`
}
