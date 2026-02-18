'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step4Schema, type Step4Data } from '@/lib/validations/intake'
import { useWizard } from './WizardContext'
import { FieldWrapper, Input, Select } from '@/components/ui/FormField'

export function Step4Benefits() {
  const { data, updateData, goNext, goPrev } = useWizard()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    defaultValues: {
      pension_provided: (data.pension_provided as Step4Data['pension_provided']) ?? undefined,
      pension_rate_known: data.pension_rate_known ?? '',
      travel_reimbursement: (data.travel_reimbursement as Step4Data['travel_reimbursement']) ?? undefined,
      vacation_balance_issue: (data.vacation_balance_issue as Step4Data['vacation_balance_issue']) ?? undefined,
      sick_days_issue: (data.sick_days_issue as Step4Data['sick_days_issue']) ?? undefined,
    },
  })

  const pensionProvided = watch('pension_provided')

  const onSubmit = (values: Step4Data) => {
    updateData(values)
    goNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">הטבות ותנאים סוציאליים</h2>
        <p className="text-sm text-gray-500">נבדוק אם קיבלתם את כל ההטבות המגיעות לכם</p>
      </div>

      <FieldWrapper
        label="האם הופרשה פנסיה על ידי המעסיק?"
        error={errors.pension_provided?.message}
        required
      >
        <Select {...register('pension_provided')} error={!!errors.pension_provided}>
          <option value="">בחרו תשובה</option>
          <option value="yes">כן</option>
          <option value="no">לא</option>
          <option value="unknown">לא בטוח</option>
        </Select>
      </FieldWrapper>

      {pensionProvided === 'yes' && (
        <FieldWrapper
          label="שיעור הפרשה לפנסיה (אם ידוע)"
          hint="לדוגמה: 6.5%, 7.5%"
        >
          <Input
            {...register('pension_rate_known')}
            placeholder="6.5%"
          />
        </FieldWrapper>
      )}

      <FieldWrapper
        label="האם קיבלתם החזר הוצאות נסיעה?"
        error={errors.travel_reimbursement?.message}
        required
      >
        <Select {...register('travel_reimbursement')} error={!!errors.travel_reimbursement}>
          <option value="">בחרו תשובה</option>
          <option value="yes">כן</option>
          <option value="partial">חלקי</option>
          <option value="no">לא</option>
        </Select>
      </FieldWrapper>

      <FieldWrapper
        label="האם הייתה בעיה עם יתרת ימי חופשה?"
        error={errors.vacation_balance_issue?.message}
        required
      >
        <Select {...register('vacation_balance_issue')} error={!!errors.vacation_balance_issue}>
          <option value="">בחרו תשובה</option>
          <option value="yes">כן, הייתה בעיה</option>
          <option value="no">לא</option>
          <option value="unknown">לא בטוח</option>
        </Select>
      </FieldWrapper>

      <FieldWrapper
        label="האם הייתה בעיה עם ימי מחלה?"
        error={errors.sick_days_issue?.message}
        required
      >
        <Select {...register('sick_days_issue')} error={!!errors.sick_days_issue}>
          <option value="">בחרו תשובה</option>
          <option value="yes">כן, הייתה בעיה</option>
          <option value="no">לא</option>
          <option value="unknown">לא בטוח</option>
        </Select>
      </FieldWrapper>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={goPrev} className="btn-secondary flex-1">
          → חזור
        </button>
        <button type="submit" className="btn-primary flex-1">
          המשך ←
        </button>
      </div>
    </form>
  )
}
