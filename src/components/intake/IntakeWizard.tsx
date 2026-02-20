'use client'

import { WizardProvider, useWizard } from './WizardContext'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Step1Contact } from './Step1Contact'
import { Step2Employment } from './Step2Employment'
import { Step3Overtime } from './Step3Overtime'
import { Step4Benefits } from './Step4Benefits'
import { Step5Termination } from './Step5Termination'
import { Step6Files } from './Step6Files'
import { Step7Review } from './Step7Review'
import type { QuickStartData } from './QuickStart'

const TOTAL_STEPS = 7

function WizardInner() {
  const { step } = useWizard()

  return (
    <div>
      <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />
      {step === 1 && <Step1Contact />}
      {step === 2 && <Step2Employment />}
      {step === 3 && <Step3Overtime />}
      {step === 4 && <Step4Benefits />}
      {step === 5 && <Step5Termination />}
      {step === 6 && <Step6Files />}
      {step === 7 && <Step7Review />}
    </div>
  )
}

interface IntakeWizardProps {
  leadId?: string | null
  quickData?: QuickStartData | null
}

export function IntakeWizard({ leadId, quickData }: IntakeWizardProps) {
  return (
    <WizardProvider leadId={leadId ?? null} quickData={quickData ?? null}>
      <WizardInner />
    </WizardProvider>
  )
}
