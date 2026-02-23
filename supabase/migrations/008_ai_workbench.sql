-- ============================================================
-- Migration 008: AI Workbench
-- Adds playbooks table, extends AI state/drafts/messages for
-- the AI Workbench feature (rubrics, dual-output emails,
-- Hebrew translations, tone selection, audit metadata).
-- ============================================================

-- ============================================================
-- 1. New table: ai_playbooks (topic-based rubrics)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_playbooks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title_he        text NOT NULL,
  title_en        text,
  description_he  text,
  questions       jsonb NOT NULL DEFAULT '[]',
  documents       jsonb NOT NULL DEFAULT '[]',
  red_flags       jsonb NOT NULL DEFAULT '[]',
  strengths       jsonb NOT NULL DEFAULT '[]',
  is_active       boolean NOT NULL DEFAULT true,
  display_order   int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE ai_playbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ai_playbooks"
  ON ai_playbooks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage ai_playbooks"
  ON ai_playbooks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index
CREATE INDEX IF NOT EXISTS ai_playbooks_active_order_idx
  ON ai_playbooks (is_active, display_order);

-- ============================================================
-- 2. Extend case_ai_state (workbench columns)
-- ============================================================
ALTER TABLE case_ai_state
  ADD COLUMN IF NOT EXISTS active_playbooks text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS workbench_summary text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS recommended_questions jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS risk_flags jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS strength_flags jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS documents_requested jsonb NOT NULL DEFAULT '[]';

-- ============================================================
-- 3. Extend case_ai_drafts (dual-output + metadata)
-- ============================================================
ALTER TABLE case_ai_drafts
  ADD COLUMN IF NOT EXISTS internal_summary_he text,
  ADD COLUMN IF NOT EXISTS tone text NOT NULL DEFAULT 'friendly',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'he',
  ADD COLUMN IF NOT EXISTS hebrew_translation text,
  ADD COLUMN IF NOT EXISTS ai_metadata jsonb,
  ADD COLUMN IF NOT EXISTS approved_by_admin_id uuid,
  ADD COLUMN IF NOT EXISTS edited_text text,
  ADD COLUMN IF NOT EXISTS edited_html text;

-- Add check constraint for tone (separate statement for IF NOT EXISTS compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'case_ai_drafts_tone_check'
  ) THEN
    ALTER TABLE case_ai_drafts
      ADD CONSTRAINT case_ai_drafts_tone_check
      CHECK (tone IN ('friendly', 'formal', 'firm'));
  END IF;
END $$;

-- ============================================================
-- 4. Extend email_messages (translation + language + AI metadata)
-- ============================================================
ALTER TABLE email_messages
  ADD COLUMN IF NOT EXISTS hebrew_translation text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS ai_metadata jsonb;

-- ============================================================
-- 5. Extend case_ai_actions (prompt versioning)
-- ============================================================
ALTER TABLE case_ai_actions
  ADD COLUMN IF NOT EXISTS prompt_version text;

-- ============================================================
-- 6. Seed playbooks (7 topics)
-- ============================================================
INSERT INTO ai_playbooks (slug, title_he, title_en, description_he, questions, documents, red_flags, strengths, display_order)
VALUES

-- 1. Overtime
('overtime', 'שעות נוספות', 'Overtime', 'בדיקת תשלום שעות נוספות כדין',
 '[
   {"key":"weekly_hours","label_he":"כמה שעות אתה עובד בשבוע?","priority":1},
   {"key":"overtime_monthly","label_he":"כמה שעות נוספות בערך בחודש?","priority":1},
   {"key":"overtime_compensation","label_he":"האם שעות נוספות משולמות? באיזה שיעור?","priority":1},
   {"key":"attendance_method","label_he":"האם מתנהל דיווח נוכחות (שעון, אפליקציה)?","priority":2},
   {"key":"global_overtime_clause","label_he":"האם יש סעיף שעות גלובליות בחוזה?","priority":2},
   {"key":"rest_day_work","label_he":"האם עבדת בימי מנוחה?","priority":3}
 ]'::jsonb,
 '[
   {"key":"payslips","label_he":"תלושי שכר (3 חודשים אחרונים לפחות)"},
   {"key":"attendance_records","label_he":"דוחות נוכחות"},
   {"key":"employment_contract","label_he":"חוזה עבודה"}
 ]'::jsonb,
 '[
   {"condition":"no_overtime_pay","label_he":"שעות נוספות לא משולמות כלל","severity":"high"},
   {"condition":"no_attendance","label_he":"אין דיווח נוכחות","severity":"medium"},
   {"condition":"global_clause","label_he":"סעיף שעות גלובליות — יש לבדוק חוקיות","severity":"low"}
 ]'::jsonb,
 '[{"condition":"has_attendance_records","label_he":"קיימים דוחות נוכחות — ראיה חזקה"}]'::jsonb,
 1),

-- 2. Wage withholding
('wage_withholding', 'הלנת שכר / אי תשלום', 'Wage Withholding', 'בדיקת הלנת שכר ואי תשלום',
 '[
   {"key":"unpaid_months","label_he":"אילו חודשים לא שולמו?","priority":1},
   {"key":"partial_or_full","label_he":"האם השכר לא שולם כלל או שולם באופן חלקי?","priority":1},
   {"key":"agreed_salary","label_he":"מה השכר המוסכם?","priority":1},
   {"key":"demand_letter_sent","label_he":"האם נשלח מכתב דרישה למעסיק?","priority":2},
   {"key":"written_contract","label_he":"האם יש חוזה עבודה כתוב?","priority":2}
 ]'::jsonb,
 '[
   {"key":"payslips","label_he":"תלושי שכר"},
   {"key":"bank_statements","label_he":"דפי חשבון בנק"},
   {"key":"employment_contract","label_he":"חוזה עבודה"},
   {"key":"demand_letter","label_he":"מכתב דרישה (אם נשלח)"}
 ]'::jsonb,
 '[
   {"condition":"multiple_months","label_he":"כמה חודשים ללא תשלום","severity":"high"},
   {"condition":"no_contract","label_he":"אין חוזה כתוב","severity":"medium"}
 ]'::jsonb,
 '[{"condition":"has_demand_letter","label_he":"נשלח מכתב דרישה"}]'::jsonb,
 2),

-- 3. Pension
('pension', 'פנסיה והפרשות', 'Pension & Contributions', 'בדיקת הפרשות פנסיוניות',
 '[
   {"key":"pension_status","label_he":"האם הופרשו כספי פנסיה?","priority":1},
   {"key":"pension_start_date","label_he":"ממתי הופרשה פנסיה?","priority":1},
   {"key":"pension_rate","label_he":"מה שיעור ההפרשה?","priority":2},
   {"key":"pension_fund","label_he":"באיזו קרן פנסיה?","priority":3},
   {"key":"education_fund","label_he":"האם יש קרן השתלמות?","priority":3}
 ]'::jsonb,
 '[
   {"key":"payslips","label_he":"תלושי שכר"},
   {"key":"pension_statement","label_he":"דו\"ח פנסיה שנתי"},
   {"key":"employment_contract","label_he":"חוזה עבודה"}
 ]'::jsonb,
 '[
   {"condition":"no_pension","label_he":"לא הופרשה פנסיה כלל","severity":"high"},
   {"condition":"late_pension","label_he":"הפרשה התחילה באיחור (מעל 6 חודשים)","severity":"medium"},
   {"condition":"low_rate","label_he":"שיעור הפרשה נמוך מהנדרש","severity":"medium"}
 ]'::jsonb,
 '[]'::jsonb,
 3),

-- 4. Severance
('severance', 'פיצויי פיטורים', 'Severance Pay', 'בדיקת זכאות לפיצויי פיטורים',
 '[
   {"key":"termination_reason","label_he":"מה הייתה סיבת הפיטורים?","priority":1},
   {"key":"severance_received","label_he":"האם קיבלת פיצויי פיטורים?","priority":1},
   {"key":"severance_amount","label_he":"מה הסכום שהתקבל?","priority":2},
   {"key":"prior_notice","label_he":"האם קיבלת הודעה מוקדמת? כמה זמן?","priority":2},
   {"key":"hearing_held","label_he":"האם נערך לך שימוע?","priority":1}
 ]'::jsonb,
 '[
   {"key":"termination_letter","label_he":"מכתב פיטורים"},
   {"key":"hearing_protocol","label_he":"פרוטוקול שימוע"},
   {"key":"payslips","label_he":"תלושי שכר אחרונים"},
   {"key":"severance_calculation","label_he":"תחשיב פיצויים (אם התקבל)"}
 ]'::jsonb,
 '[
   {"condition":"no_hearing","label_he":"לא נערך שימוע","severity":"high"},
   {"condition":"no_severance","label_he":"לא שולמו פיצויים","severity":"high"},
   {"condition":"no_prior_notice","label_he":"לא ניתנה הודעה מוקדמת","severity":"medium"}
 ]'::jsonb,
 '[{"condition":"has_hearing_protocol","label_he":"קיים פרוטוקול שימוע"}]'::jsonb,
 4),

-- 5. Vacation & Sick leave
('vacation_sick', 'חופשה ומחלה', 'Vacation & Sick Leave', 'בדיקת ימי חופשה וימי מחלה',
 '[
   {"key":"vacation_balance","label_he":"כמה ימי חופשה נותרו שלא נוצלו?","priority":1},
   {"key":"vacation_paid_on_termination","label_he":"האם קיבלת פדיון חופשה?","priority":2},
   {"key":"sick_days_used","label_he":"האם היו ימי מחלה שלא שולמו?","priority":2},
   {"key":"recuperation_paid","label_he":"האם קיבלת דמי הבראה?","priority":2}
 ]'::jsonb,
 '[
   {"key":"payslips","label_he":"תלושי שכר"},
   {"key":"vacation_balance_doc","label_he":"אישור יתרת חופשה"}
 ]'::jsonb,
 '[
   {"condition":"vacation_not_redeemed","label_he":"חופשה לא נפדתה בסיום","severity":"medium"},
   {"condition":"no_recuperation","label_he":"לא שולמו דמי הבראה","severity":"medium"}
 ]'::jsonb,
 '[]'::jsonb,
 5),

-- 6. Wrongful termination / Hearing
('wrongful_termination', 'שימוע / פיטורים שלא כדין', 'Wrongful Termination', 'בדיקת תקינות הליך הפיטורים',
 '[
   {"key":"hearing_held","label_he":"האם נערך שימוע לפני הפיטורים?","priority":1},
   {"key":"hearing_advance_notice","label_he":"כמה זמן מראש קיבלת הודעה על השימוע?","priority":1},
   {"key":"hearing_representation","label_he":"האם היה לך ייצוג בשימוע?","priority":2},
   {"key":"hearing_genuine","label_he":"האם הרגשת שהשימוע היה אמיתי?","priority":2},
   {"key":"discrimination_suspected","label_he":"האם חשד להפליה (גיל, מין, הריון, מוגבלות)?","priority":1},
   {"key":"protected_employee","label_he":"האם את/ה עובד/ת מוגנ/ת (בהריון, חיילת משוחררת)?","priority":1}
 ]'::jsonb,
 '[
   {"key":"termination_letter","label_he":"מכתב פיטורים"},
   {"key":"hearing_invitation","label_he":"הזמנה לשימוע"},
   {"key":"hearing_protocol","label_he":"פרוטוקול שימוע"}
 ]'::jsonb,
 '[
   {"condition":"no_hearing","label_he":"פיטורים ללא שימוע","severity":"high"},
   {"condition":"sham_hearing","label_he":"שימוע למראית עין","severity":"high"},
   {"condition":"discrimination","label_he":"חשד להפליה","severity":"high"},
   {"condition":"protected_employee","label_he":"עובד/ת מוגנ/ת","severity":"high"}
 ]'::jsonb,
 '[{"condition":"proper_hearing","label_he":"נערך שימוע תקין"}]'::jsonb,
 6),

-- 7. Deterioration of conditions
('deterioration', 'הרעת תנאים', 'Deterioration of Conditions', 'בדיקת הרעת תנאי עבודה',
 '[
   {"key":"conditions_changed","label_he":"אילו תנאים השתנו?","priority":1},
   {"key":"change_date","label_he":"מתי חל השינוי?","priority":1},
   {"key":"employer_notified","label_he":"האם הודעת למעסיק על ההרעה?","priority":1},
   {"key":"written_complaint","label_he":"האם הגשת תלונה בכתב?","priority":2},
   {"key":"resigned_due_to_deterioration","label_he":"האם התפטרת בגלל ההרעה?","priority":2}
 ]'::jsonb,
 '[
   {"key":"employment_contract","label_he":"חוזה עבודה"},
   {"key":"complaint_letter","label_he":"מכתב תלונה (אם נשלח)"},
   {"key":"payslips_before_after","label_he":"תלושי שכר לפני ואחרי השינוי"}
 ]'::jsonb,
 '[
   {"condition":"significant_pay_reduction","label_he":"הפחתת שכר משמעותית","severity":"high"},
   {"condition":"no_written_complaint","label_he":"לא הוגשה תלונה בכתב","severity":"medium"}
 ]'::jsonb,
 '[{"condition":"written_complaint_sent","label_he":"הוגשה תלונה בכתב למעסיק"}]'::jsonb,
 7)

ON CONFLICT (slug) DO NOTHING;
