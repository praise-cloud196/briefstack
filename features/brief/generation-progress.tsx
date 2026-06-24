'use client'

interface Step {
  key: string
  label: string
}

const STEPS: Step[] = [
  { key: 'analysing', label: 'Analysing topic and audience' },
  { key: 'searchIntent', label: 'Identifying search intent' },
  { key: 'structuring', label: 'Structuring content framework' },
  { key: 'building', label: 'Building content framework' },
  { key: 'finalising', label: 'Finalising brief' },
]

interface GenerationProgressProps {
  currentStep: number
}

export function GenerationProgress({ currentStep }: GenerationProgressProps) {
  return (
    <div className="space-y-3">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStep
        const isActive = index === currentStep
        const isUpcoming = index > currentStep

        return (
          <div key={step.key} className="flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
              {isCompleted && (
                <span className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center text-xs">
                  {'\u2713'}
                </span>
              )}
              {isActive && (
                <span className="w-7 h-7 rounded-full border-2 border-primary flex items-center justify-center">
                  <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </span>
              )}
              {isUpcoming && (
                <span className="w-4 h-4 rounded-full border-2 border-outline-variant" />
              )}
            </div>
            <span
              className={`font-body-medium transition-colors ${
                isCompleted
                  ? 'text-primary'
                  : isActive
                    ? 'text-on-surface'
                    : 'text-on-surface-variant'
              }`}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
