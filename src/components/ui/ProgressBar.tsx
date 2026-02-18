'use client'

interface ProgressBarProps {
  currentStep: number
  totalSteps: number
}

const stepLabels = [
  'פרטי קשר',
  'פרטי העסקה',
  'שעות עבודה',
  'הטבות',
  'סיום עבודה',
  'מסמכים',
  'אישור',
]

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const pct = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100)

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-600">
          שלב {currentStep} מתוך {totalSteps}
        </span>
        <span className="text-sm text-gray-400">
          {stepLabels[currentStep - 1]}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
