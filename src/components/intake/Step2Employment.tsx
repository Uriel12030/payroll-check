'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step2Schema, type Step2Data } from '@/lib/validations/intake'
import { useWizard } from './WizardContext'
import { FieldWrapper, Input, Select } from '@/components/ui/FormField'

export function Step2Employment() {
  const { data, updateData, goNext, goPrev } = useWizard()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      employer_name: data.employer_name ?? '',
      role_title: data.role_title ?? '',
      employment_type: (data.employment_type as Step2Data['employment_type']) ?? undefined,
      start_date: data.start_date ?? '',
      end_date: data.end_date ?? '',
      still_employed: data.still_employed ?? false,
      avg_monthly_salary: data.avg_monthly_salary ?? ('' as unknown as number),
    },
  })

  const stillEmployed = watch('still_employed')

  const onSubmit = (values: Step2Data) => {
    updateData(values)
    goNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">פרטי העסקה</h2>
        <p className="text-sm text-gray-500">ספרו לנו על מקום העבודה</p>
      </div>

      <FieldWrapper label="שם המעסיק" error={errors.employer_name?.message} required>
        <Input {...register('employer_name')} placeholder="חברה בע&quot;מ" error={!!errors.employer_name} />
      </FieldWrapper>

      <FieldWrapper label="תפקיד" error={errors.role_title?.message} required>
        <Input {...register('role_title')} placeholder="מנהל מכירות" error={!!errors.role_title} />
      </FieldWrapper>

      <FieldWrapper label="סוג העסקה" error={errors.employment_type?.message} required>
        <Select {...register('employment_type')} error={!!errors.employment_type}>
          <option value="">בחרו סוג העסקה</option>
          <option value="full_time">משרה מלאה</option>
          <option value="part_time">משרה חלקית</option>
          <option value="hourly">שכר שעתי</option>
          <option value="freelance">עצמאי / פרילנסר</option>
          <option value="other">אחר</option>
        </Select>
      </FieldWrapper>

      <div className="grid grid-cols-2 gap-4">
        <FieldWrapper label="תאריך תחילה" error={errors.start_date?.message} required>
          <Input {...register('start_date')} type="date" error={!!errors.start_date} />
        </FieldWrapper>

        <FieldWrapper label="תאריך סיום" error={errors.end_date?.message}>
          <Input
            {...register('end_date')}
            type="date"
            disabled={stillEmployed}
            error={!!errors.end_date}
          />
        </FieldWrapper>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          {...register('still_employed')}
          type="checkbox"
          className="w-5 h-5 rounded border-gray-300 text-blue-600"
        />
        <span className="text-sm font-medium text-gray-700">אני עדיין עובד/ת במקום זה</span>
      </label>

      <FieldWrapper
        label="שכר ברוטו ממוצע לחודש (₪)"
        error={errors.avg_monthly_salary?.message}
        required
      >
        <Input
          {...register('avg_monthly_salary', { valueAsNumber: true })}
          type="number"
          min={1}
          placeholder="12000"
          dir="ltr"
          error={!!errors.avg_monthly_salary}
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
