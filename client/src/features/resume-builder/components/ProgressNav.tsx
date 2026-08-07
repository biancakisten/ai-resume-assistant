import { RESUME_STEPS, type StepIndex } from '../types'

interface ProgressNavProps {
  currentStep: StepIndex
  highestUnlockedStep: StepIndex
  completedSteps: StepIndex[]
  skippedSteps: StepIndex[]
  onNavigate: (step: StepIndex) => void
}

export function ProgressNav({
  currentStep,
  highestUnlockedStep,
  completedSteps,
  skippedSteps,
  onNavigate,
}: ProgressNavProps) {
  return (
    <nav aria-label="Resume builder progress">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {RESUME_STEPS.map((step, index) => {
          const stepIndex = index as StepIndex
          const locked = stepIndex > highestUnlockedStep
          const current = stepIndex === currentStep
          const completed = completedSteps.includes(stepIndex)
          const skipped = skippedSteps.includes(stepIndex)
          const status = current
            ? 'Current'
            : completed
              ? 'Completed'
              : skipped
                ? 'Skipped'
                : locked
                  ? 'Locked'
                  : 'Available'
          return (
            <li key={step.title}>
              <button
                aria-current={current ? 'step' : undefined}
                aria-label={`Step ${index + 1}: ${step.title}. ${status}`}
                className={`min-h-14 w-full rounded-xl border px-3 py-2 text-left text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  current
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : completed
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : skipped
                        ? 'border-amber-300 bg-amber-50 text-amber-900'
                        : 'border-slate-200 bg-white text-slate-600'
                } disabled:cursor-not-allowed disabled:opacity-55`}
                disabled={locked}
                onClick={() => onNavigate(stepIndex)}
                type="button"
              >
                <span className="block">Step {index + 1}</span>
                <span className="mt-0.5 block truncate">{step.title}</span>
                <span className="block font-normal">{status}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
