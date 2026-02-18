import { z } from 'zod'

export const step1Schema = z.object({
  full_name: z.string().min(2, 'שם מלא חובה').max(100),
  phone: z.string().regex(/^05\d{8}$/, 'מספר טלפון לא תקין (לדוגמה: 0501234567)'),
  email: z.string().email('כתובת אימייל לא תקינה'),
  city: z.string().min(2, 'עיר מגורים חובה').max(100),
})

// Base object schema used for merging into fullIntakeSchema
const step2BaseSchema = z.object({
  employer_name: z.string().min(2, 'שם המעסיק חובה').max(200),
  role_title: z.string().min(2, 'תפקיד חובה').max(200),
  employment_type: z.enum(['full_time', 'part_time', 'hourly', 'freelance', 'other'], {
    message: 'יש לבחור סוג העסקה',
  }),
  start_date: z.string().min(1, 'תאריך תחילת עבודה חובה'),
  end_date: z.string().optional(),
  still_employed: z.boolean(),
  avg_monthly_salary: z
    .number({ message: 'יש להזין מספר' })
    .min(1, 'שכר חובה')
    .max(1000000),
})

// Step 2 schema with end_date conditional refinement (used for per-step validation)
export const step2Schema = step2BaseSchema.refine(
  (data) => {
    if (!data.still_employed && !data.end_date) return false
    return true
  },
  { message: 'תאריך סיום עבודה חובה', path: ['end_date'] }
)

export const step3Schema = z.object({
  paid_overtime: z.enum(['yes', 'no', 'partial'], {
    message: 'יש לבחור תשובה',
  }),
  overtime_hours_estimate: z.string().optional(),
  attendance_tracking: z.enum(['yes', 'no', 'partial'], {
    message: 'יש לבחור תשובה',
  }),
})

export const step4Schema = z.object({
  pension_provided: z.enum(['yes', 'no', 'unknown'], {
    message: 'יש לבחור תשובה',
  }),
  pension_rate_known: z.string().optional(),
  travel_reimbursement: z.enum(['yes', 'no', 'partial'], {
    message: 'יש לבחור תשובה',
  }),
  vacation_balance_issue: z.enum(['yes', 'no', 'unknown'], {
    message: 'יש לבחור תשובה',
  }),
  sick_days_issue: z.enum(['yes', 'no', 'unknown'], {
    message: 'יש לבחור תשובה',
  }),
})

export const step5Schema = z.object({
  termination_type: z
    .enum(['resigned', 'fired', 'laid_off', 'contract_end', 'still_employed', 'other'])
    .optional(),
  termination_date: z.string().optional(),
  reason_for_check: z.string().min(10, 'יש לפרט לפחות 10 תווים').max(2000),
})

export const step7Schema = z.object({
  consent: z.boolean().refine((val) => val === true, {
    message: 'יש לאשר את תנאי השימוש',
  }),
  marketing_source: z.string().optional(),
})

export const fullIntakeSchema = step1Schema
  .merge(step2BaseSchema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema)
  .merge(step7Schema)
  .refine(
    (data) => data.still_employed || !!data.end_date,
    { message: 'תאריך סיום עבודה חובה', path: ['end_date'] }
  )

export type Step1Data = z.infer<typeof step1Schema>
export type Step2Data = z.infer<typeof step2Schema>
export type Step3Data = z.infer<typeof step3Schema>
export type Step4Data = z.infer<typeof step4Schema>
export type Step5Data = z.infer<typeof step5Schema>
export type Step7Data = z.infer<typeof step7Schema>
export type FullIntakeData = z.infer<typeof fullIntakeSchema>
