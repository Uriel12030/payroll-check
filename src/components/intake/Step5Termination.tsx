'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step5Schema, type Step5Data } from '@/lib/validations/intake'
import { useWizard } from './WizardContext'
import { FieldWrapper, Input, Select, Textarea } from '@/components/ui/FormField'

export function Step5Termination() {
  const { data, updateData, goNext, goPrev } = useWizard()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step5Data>({
    resolver: zodResolver(step5Schema),
    defaultValues: {
      termination_type: (data.termination_type as Step5Data['termination_type']) ?? undefined,
      termination_date: data.termination_date ?? '',
      reason_for_check: data.reason_for_check ?? '',
    },
  })

  const terminationType = watch('termination_type')

  const onSubmit = (values: Step5Data) => {
    updateData(values)
    goNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">פרטי סיום עבודה</h2>
        <p className="text-sm text-gray-500">ספרו לנו על נסיבות הסיום</p>
      </div>

      <FieldWrapper
        label="אופן סיום ההעסקה"
        error={errors.termination_type?.message}
      >
        <Select {...register('termination_type')} error={!!errors.termination_type}>
          <option value="">בחרו תשובה</option>
          <option value="still_employed">עדיין מועסק/ת</option>
          <option value="resigned">התפטרתי</option>
          <option value="fired">פוטרתי</option>
          <option value="laid_off">פיטורי צמצום</option>
          <option value="contract_end">סיום חוזה</option>
          <option value="other">אחר</option>
        </Select>
      </FieldWrapper>

      {terminationType && terminationType !== 'still_employed' && (
        <FieldWrapper
          label="תאריך סיום"
          error={errors.termination_date?.message}
        >
          <Input
            {...register('termination_date')}
            type="date"
            error={!!errors.termination_date}
          />
        </FieldWrapper>
      )}

      <FieldWrapper
        label="מה הסיבה שפנית לבדיקת שכר?"
        error={errors.reason_for_check?.message}
        required
        hint="ספרו בקצרה מה מטריד אתכם – זה עוזר לנו להבין את המקרה שלכם"
      >
        <Textarea
          {...register('reason_for_check')}
          placeholder="לדוגמה: לא קיבלתי פיצויים, לא שילמו לי שעות נוספות..."
          error={!!errors.reason_for_check}
        />
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
