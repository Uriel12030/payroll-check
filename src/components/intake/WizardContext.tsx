'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import type { IntakeFormData } from '@/types'

interface WizardContextType {
  step: number
  data: Partial<IntakeFormData>
  setStep: (step: number) => void
  updateData: (fields: Partial<IntakeFormData>) => void
  goNext: () => void
  goPrev: () => void
}

const WizardContext = createContext<WizardContextType | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<Partial<IntakeFormData>>({
    still_employed: false,
    files: [],
    consent: false,
  })

  const updateData = (fields: Partial<IntakeFormData>) => {
    setData((prev) => ({ ...prev, ...fields }))
  }

  const goNext = () => setStep((s) => Math.min(s + 1, 7))
  const goPrev = () => setStep((s) => Math.max(s - 1, 1))

  return (
    <WizardContext.Provider value={{ step, data, setStep, updateData, goNext, goPrev }}>
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used within WizardProvider')
  return ctx
}
