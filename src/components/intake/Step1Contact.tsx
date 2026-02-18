'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { step1Schema, type Step1Data } from '@/lib/validations/intake'
import { useWizard } from './WizardContext'
import { FieldWrapper, Input } from '@/components/ui/FormField'

export function Step1Contact() {
  const { data, updateData, goNext } = useWizard()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      full_name: data.full_name ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      city: data.city ?? '',
    },
  })

  const onSubmit = (values: Step1Data) => {
    updateData(values)
    goNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">פרטי קשר</h2>
        <p className="text-sm text-gray-500">הפרטים ישמשו ליצירת קשר לאחר הבדיקה</p>
      </div>

      <FieldWrapper label="שם מלא" error={errors.full_name?.message} required>
        <Input
          {...register('full_name')}
          placeholder="ישראל ישראלי"
          error={!!errors.full_name}
        />
      </FieldWrapper>

      <FieldWrapper label="טלפון" error={errors.phone?.message} required>
        <Input
          {...register('phone')}
          type="tel"
          placeholder="0501234567"
          error={!!errors.phone}
          dir="ltr"
        />
      </FieldWrapper>

      <FieldWrapper label="אימייל" error={errors.email?.message} required>
        <Input
          {...register('email')}
          type="email"
          placeholder="you@example.com"
          error={!!errors.email}
          dir="ltr"
        />
      </FieldWrapper>

      <FieldWrapper label="עיר מגורים" error={errors.city?.message} required>
        <Input
          {...register('city')}
          placeholder="תל אביב"
          error={!!errors.city}
        />
      </FieldWrapper>

      <div className="pt-2">
        <button type="submit" className="btn-primary w-full">
          המשך לשלב הבא ←
        </button>
      </div>
    </form>
  )
}
