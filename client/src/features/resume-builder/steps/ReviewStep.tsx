import { RESUME_STEPS, type BuilderStepProps, type StepIndex } from '../types'
import { stepForErrorPath, validateForReview } from '../resumeBuilderUtils'

interface ReviewStepProps extends BuilderStepProps {
  onNavigate: (step: StepIndex) => void
}

export function ReviewStep({ state, onNavigate }: ReviewStepProps) {
  const errors = validateForReview(state.resume)
  const groupedSteps = Array.from(
    new Set(errors.map((error) => stepForErrorPath(error.path))),
  )

  return (
    <div className="space-y-7">
      {errors.length > 0 ? (
        <section
          className="rounded-xl border border-red-200 bg-red-50 p-5"
          role="alert"
        >
          <h3 className="font-bold text-red-900">
            Your resume still needs attention
          </h3>
          <p className="mt-1 text-sm text-red-800">
            {errors.length} validation {errors.length === 1 ? 'issue' : 'issues'} found.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {groupedSteps.map((step) => (
              <button
                className="min-h-11 rounded-lg bg-white px-3 text-sm font-semibold text-red-800 ring-1 ring-red-300"
                key={step}
                onClick={() => onNavigate(step)}
                type="button"
              >
                Fix {RESUME_STEPS[step].title}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="font-bold text-emerald-900">
            Your resume information is complete
          </h3>
          <p className="mt-1 text-sm text-emerald-800">
            All required information passes the shared ResumeData validation.
          </p>
        </section>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {RESUME_STEPS.slice(0, 6).map((step, index) => (
          <section
            className="rounded-xl border border-slate-200 bg-white p-4"
            key={step.title}
          >
            <h3 className="font-bold text-slate-900">{step.title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {index === 0 &&
                `${state.resume.personalDetails.firstName} ${state.resume.personalDetails.lastName}`.trim()}
              {index === 1 &&
                (state.resume.professionalOverview || 'No overview added')}
              {index === 2 &&
                `${state.resume.employmentHistory.length} employment entries`}
              {index === 3 && `${state.resume.education.length} education entries`}
              {index === 4 &&
                `${state.resume.technicalSkills.length} technical skills · ${state.resume.softSkills.length} soft skills`}
              {index === 5 &&
                `${state.resume.languages.length} languages · ${state.resume.interests.length} interests`}
            </p>
            <button
              className="mt-3 min-h-11 text-sm font-semibold text-blue-700 underline underline-offset-4"
              onClick={() => onNavigate(index as StepIndex)}
              type="button"
            >
              Edit {step.title.toLowerCase()}
            </button>
          </section>
        ))}
      </div>
    </div>
  )
}
