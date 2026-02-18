'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step3Schema, type Step3Data } from '@/lib/validations/intake'
import { useWizard } from './WizardContext'
import { FieldWrapper, Input, Select } from '@/components/ui/FormField'

export function Step3Overtime() {
  const { data, updateData, goNext, goPrev } = useWizard()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    defaultValues: {
      paid_overtime: (data.paid_overtime as Step3Data['paid_overtime']) ?? undefined,
      overtime_hours_estimate: data.overtime_hours_estimate ?? '',
      attendance_tracking: (data.attendance_tracking as Step3Data['attendance_tracking']) ?? undefined,
    },
  })

  const paidOvertime = watch('paid_overtime')

  const onSubmit = (values: Step3Data) => {
    updateData(values)
    goNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">שעות עבודה ושעות נוספות</h2>
        <p className="text-sm text-gray-500">נבדוק אם קיבלתם תגמול הולם</p>
      </div>

      <FieldWrapper
        label="האם קיבלתם תשלום עבור שעות נוספות?"
        error={errors.paid_overtime?.message}
        required
      >
        <Select {...register('paid_overtime')} error={!!errors.paid_overtime}>
          <option value="">בחרו תשובה</option>
          <option value="yes">כן, תמיד</option>
          <option value="partial">חלקית</option>
          <option value="no">לא</option>
        </Select>
      </FieldWrapper>

      {(paidOvertime === 'no' || paidOvertime === 'partial') && (
        <FieldWrapper
          label="הערכת שעות נוספות ממוצעות לשבוע"
          error={errors.overtime_hours_estimate?.message}
          hint="לדוגמה: 5 שעות, 10 שעות וכו'"
        >
          <Input
            {...register('overtime_hours_estimate')}
            placeholder="לדוגמה: 8 שעות"
            error={!!errors.overtime_hours_estimate}
          />
        </FieldWrapper>
      )}

      <FieldWrapper
        label="האם הייתה מערכת נוכחות / שעון נוכחות?"
        error={errors.attendance_tracking?.message}
        required
      >
        <Select {...register('attendance_tracking')} error={!!errors.attendance_tracking}>
          <option value="">בחרו תשובה</option>
          <option value="yes">כן</option>
          <option value="partial">חלקית</option>
          <option value="no">לא</option>
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
