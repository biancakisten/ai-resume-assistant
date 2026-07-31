import { useCallback, useEffect, useRef, useState } from 'react'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { AiConsentDialog } from '../ai/AiConsentDialog'
import { useResumeAiAssistance } from '../ai/useResumeAiAssistance'
import { ProgressNav } from '../components/ProgressNav'
import {
  ResumePreview,
  type ShortenSelection,
} from '../components/ResumePreview'
import { EducationStep } from '../steps/EducationStep'
import { EmploymentStep } from '../steps/EmploymentStep'
import { LanguagesInterestsStep } from '../steps/LanguagesInterestsStep'
import { OverviewStep } from '../steps/OverviewStep'
import { PersonalStep } from '../steps/PersonalStep'
import { ReviewStep } from '../steps/ReviewStep'
import { SkillsTrainingStep } from '../steps/SkillsTrainingStep'
import {
  createInitialBuilderState,
  fieldId,
  hasResumeContent,
  validateStep,
} from '../resumeBuilderUtils'
import {
  RESUME_STEPS,
  type BuilderStepProps,
  type ResumeBuilderState,
  type StepIndex,
} from '../types'

function addUniqueStep(steps: StepIndex[], step: StepIndex): StepIndex[] {
  return steps.includes(step) ? steps : [...steps, step]
}

export default function ResumeBuilderPage() {
  const [state, setState] = useState<ResumeBuilderState>(
    createInitialBuilderState,
  )
  const [showStartOver, setShowStartOver] = useState(false)
  const ai = useResumeAiAssistance()
  const photographUrl = state.resume.photograph?.url
  const formHeadingRef = useRef<HTMLHeadingElement>(null)

  const updateState: BuilderStepProps['updateState'] = useCallback((updater) => {
    setState((current) => {
      const next = updater(current)
      return {
        ...next,
        dirty: hasResumeContent(next.resume),
        completedSteps: next.completedSteps.filter(
          (step) => step !== current.currentStep,
        ),
        skippedSteps: next.skippedSteps.filter(
          (step) => step !== current.currentStep,
        ),
      }
    })
  }, [])

  useEffect(() => {
    if (!state.dirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [state.dirty])

  useEffect(
    () => () => {
      if (photographUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(photographUrl)
      }
    },
    [photographUrl],
  )

  const focusFirstError = (path: string) => {
    window.setTimeout(() => {
      const field = document.getElementById(fieldId(path))
      if (field instanceof HTMLElement) {
        field.focus()
      } else {
        document.getElementById('step-error-summary')?.focus()
      }
    }, 0)
  }

  const navigateTo = (step: StepIndex) => {
    if (step > state.highestUnlockedStep) return
    ai.clearStepState()
    setState((current) => ({ ...current, currentStep: step, errors: [] }))
    window.setTimeout(() => formHeadingRef.current?.focus(), 0)
  }

  const handleNext = () => {
    const errors = validateStep(state.resume, state.currentStep)
    if (errors.length > 0) {
      setState((current) => ({
        ...current,
        errors,
        touchedFields: Array.from(
          new Set([...current.touchedFields, ...errors.map((error) => error.path)]),
        ),
      }))
      focusFirstError(errors[0].path)
      return
    }
    if (state.currentStep === 6) return
    const nextStep = (state.currentStep + 1) as StepIndex
    ai.clearStepState()
    setState((current) => ({
      ...current,
      currentStep: nextStep,
      highestUnlockedStep: Math.max(
        current.highestUnlockedStep,
        nextStep,
      ) as StepIndex,
      completedSteps: addUniqueStep(
        current.completedSteps,
        current.currentStep,
      ),
      skippedSteps: current.skippedSteps.filter(
        (step) => step !== current.currentStep,
      ),
      errors: [],
    }))
    window.setTimeout(() => formHeadingRef.current?.focus(), 0)
  }

  const handleSkip = () => {
    if (!RESUME_STEPS[state.currentStep].optional || state.currentStep === 6) {
      return
    }
    const nextStep = (state.currentStep + 1) as StepIndex
    ai.clearStepState()
    setState((current) => ({
      ...current,
      currentStep: nextStep,
      highestUnlockedStep: Math.max(
        current.highestUnlockedStep,
        nextStep,
      ) as StepIndex,
      skippedSteps: addUniqueStep(current.skippedSteps, current.currentStep),
      completedSteps: current.completedSteps.filter(
        (step) => step !== current.currentStep,
      ),
      errors: [],
    }))
  }

  const confirmStartOver = () => {
    ai.resetSession()
    setState((current) => ({
      ...createInitialBuilderState(),
      sessionId: current.sessionId + 1,
    }))
    setShowStartOver(false)
    window.setTimeout(() => formHeadingRef.current?.focus(), 0)
  }

  const applyShortening = useCallback(
    (selection: ShortenSelection, value: string) => {
      setState((current) => {
        const { candidate, stableId } = selection
        if (candidate.kind === 'professionalOverview') {
          return {
            ...current,
            dirty: true,
            resume: { ...current.resume, professionalOverview: value },
          }
        }

        if (candidate.kind === 'educationAchievements') {
          const index = current.ids.education.indexOf(stableId)
          if (index < 0) return current
          return {
            ...current,
            dirty: true,
            resume: {
              ...current.resume,
              education: current.resume.education.map((entry, entryIndex) =>
                entryIndex === index
                  ? { ...entry, description: value }
                  : entry,
              ),
            },
          }
        }

        const index = current.ids.employment.indexOf(stableId)
        if (index < 0) return current
        return {
          ...current,
          dirty: true,
          resume: {
            ...current.resume,
            employmentHistory: current.resume.employmentHistory.map(
              (entry, entryIndex) => {
                if (entryIndex !== index) return entry
                return candidate.kind === 'employmentResponsibilities'
                  ? { ...entry, description: value }
                  : { ...entry, achievements: value }
              },
            ),
          },
        }
      })
    },
    [],
  )

  const hasOptionalContent =
    state.resume.languages.length > 0 || state.resume.interests.length > 0

  const stepProps: BuilderStepProps = { ai, state, updateState }
  const stepContent = (() => {
    switch (state.currentStep) {
      case 0:
        return <PersonalStep {...stepProps} />
      case 1:
        return <OverviewStep {...stepProps} />
      case 2:
        return <EmploymentStep {...stepProps} />
      case 3:
        return <EducationStep {...stepProps} />
      case 4:
        return <SkillsTrainingStep {...stepProps} />
      case 5:
        return <LanguagesInterestsStep {...stepProps} />
      case 6:
        return <ReviewStep {...stepProps} onNavigate={navigateTo} />
    }
  })()

  const activeStep = RESUME_STEPS[state.currentStep]

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-950"
      style={{
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex min-h-19 max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a
            className="text-sm font-extrabold tracking-wide text-purple-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            href="/"
          >
            PIXEL PALS <span aria-hidden="true">/</span> AI RESUME ASSISTANT
          </a>
          <button
            className="min-h-11 rounded-lg px-3 text-sm font-semibold text-slate-600 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setShowStartOver(true)}
            type="button"
          >
            Start Over
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-[100rem] px-4 py-8 sm:px-6 lg:px-8">
        <ProgressNav
          completedSteps={state.completedSteps}
          currentStep={state.currentStep}
          highestUnlockedStep={state.highestUnlockedStep}
          onNavigate={navigateTo}
          skippedSteps={state.skippedSteps}
        />
        <div className="mt-9">
          <p className="text-sm font-bold text-blue-700">
            Step {state.currentStep + 1} of {RESUME_STEPS.length} ·{' '}
            {activeStep.title}
          </p>
          <h1
            className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 outline-none sm:text-4xl"
            ref={formHeadingRef}
            tabIndex={-1}
          >
            {activeStep.heading}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            {activeStep.description}
          </p>
        </div>
        <div className="mt-9 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(34rem,48rem)]">
          <section
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
            key={`${state.sessionId}-${state.currentStep}`}
          >
            {stepContent}
          </section>
          <ResumePreview
            ai={ai}
            ids={state.ids}
            onApplyShortening={applyShortening}
            resume={state.resume}
          />
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            {state.currentStep > 0 && (
              <button
                className="min-h-11 rounded-lg border border-slate-300 bg-white px-5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() =>
                  navigateTo((state.currentStep - 1) as StepIndex)
                }
                type="button"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {activeStep.optional && !hasOptionalContent && (
              <button
                className="min-h-11 rounded-lg px-5 font-semibold text-slate-600 underline underline-offset-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={handleSkip}
                type="button"
              >
                Skip for now
              </button>
            )}
            {state.currentStep < 6 && (
              <button
                className="min-h-11 rounded-lg bg-blue-600 px-7 font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                onClick={handleNext}
                type="button"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </main>
      <ConfirmDialog
        confirmLabel="Start over"
        description="This clears all resume information and progress from this browser tab. This cannot be undone."
        destructive
        onCancel={() => setShowStartOver(false)}
        onConfirm={confirmStartOver}
        open={showStartOver}
        title="Start over from step one?"
      />
      <AiConsentDialog ai={ai} />
    </div>
  )
}
