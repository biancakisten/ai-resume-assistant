import { AiImproveControl } from '../ai/AiImproveControl'
import { TextArea } from '../components/FormControls'
import { RESUME_STEPS, type BuilderStepProps, type StepIndex } from '../types'
import { stepForErrorPath, validateForReview } from '../resumeBuilderUtils'

interface ReviewStepProps extends BuilderStepProps {
  onNavigate: (step: StepIndex) => void
}

export function ReviewStep({ ai, state, updateState, onNavigate }: ReviewStepProps) {
  const errors = validateForReview(state.resume)
  const groupedSteps = Array.from(
    new Set(errors.map((error) => stepForErrorPath(error.path))),
  )

  const updateOverview = (value: string) =>
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: { ...current.resume, professionalOverview: value },
    }))

  const updateEmploymentField = (
    entryId: string,
    field: 'description' | 'achievements',
    value: string,
  ) =>
    updateState((current) => {
      const entryIndex = current.ids.employment.indexOf(entryId)
      if (entryIndex < 0) return current
      return {
        ...current,
        dirty: true,
        resume: {
          ...current.resume,
          employmentHistory: current.resume.employmentHistory.map(
            (entry, index) =>
              index === entryIndex ? { ...entry, [field]: value } : entry,
          ),
        },
      }
    })

  const updateEducationAchievements = (entryId: string, value: string) =>
    updateState((current) => {
      const entryIndex = current.ids.education.indexOf(entryId)
      if (entryIndex < 0) return current
      return {
        ...current,
        dirty: true,
        resume: {
          ...current.resume,
          education: current.resume.education.map((entry, index) =>
            index === entryIndex ? { ...entry, description: value } : entry,
          ),
        },
      }
    })

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
      <section
        aria-labelledby="final-ai-polish-heading"
        className="space-y-5 rounded-xl border border-purple-200 bg-purple-50/30 p-5"
      >
        <div>
          <h2
            className="text-xl font-bold text-purple-950"
            id="final-ai-polish-heading"
          >
            Final AI-assisted polish
          </h2>
          <p className="mt-1 text-sm leading-6 text-purple-900">
            AI improvement is available only on this final review step. Choose
            one field at a time and approve every suggestion before it changes
            your resume.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <TextArea
            errors={state.errors}
            label="Professional overview"
            maxLength={600}
            onChange={(event) => updateOverview(event.target.value)}
            path="professionalOverview"
            value={state.resume.professionalOverview}
          />
          <AiImproveControl
            ai={ai}
            fieldKey="professionalOverview"
            fieldType="professionalOverview"
            label="professional overview"
            onChange={updateOverview}
            text={state.resume.professionalOverview}
          />
        </div>

        {state.resume.employmentHistory.map((entry, index) => {
          const entryId = state.ids.employment[index]
          if (!entryId) return null
          const roleLabel = `Role ${index + 1}`
          return (
            <fieldset
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
              key={entryId}
            >
              <legend className="px-1 font-bold text-slate-900">
                {roleLabel}: {entry.jobTitle || entry.employer || 'Employment entry'}
              </legend>
              <TextArea
                errors={state.errors}
                label={`${roleLabel} responsibilities`}
                maxLength={2000}
                onChange={(event) =>
                  updateEmploymentField(
                    entryId,
                    'description',
                    event.target.value,
                  )
                }
                optional
                path={`employmentHistory.${index}.description`}
                value={entry.description}
              />
              <AiImproveControl
                ai={ai}
                fieldKey={`employment:${entryId}:responsibilities`}
                fieldType="employmentResponsibilities"
                label={`role ${index + 1} responsibilities`}
                onChange={(value) =>
                  updateEmploymentField(entryId, 'description', value)
                }
                text={entry.description}
              />
              <TextArea
                errors={state.errors}
                label={`${roleLabel} achievements`}
                maxLength={2000}
                onChange={(event) =>
                  updateEmploymentField(
                    entryId,
                    'achievements',
                    event.target.value,
                  )
                }
                optional
                path={`employmentHistory.${index}.achievements`}
                value={entry.achievements}
              />
              <AiImproveControl
                ai={ai}
                fieldKey={`employment:${entryId}:achievements`}
                fieldType="employmentAchievements"
                label={`role ${index + 1} achievements`}
                onChange={(value) =>
                  updateEmploymentField(entryId, 'achievements', value)
                }
                text={entry.achievements}
              />
            </fieldset>
          )
        })}

        {state.resume.education.map((entry, index) => {
          const entryId = state.ids.education[index]
          if (!entryId) return null
          return (
            <fieldset
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
              key={entryId}
            >
              <legend className="px-1 font-bold text-slate-900">
                Education {index + 1}:{' '}
                {entry.qualification || entry.institution || 'Education entry'}
              </legend>
              <TextArea
                errors={state.errors}
                label={`Education ${index + 1} achievements`}
                maxLength={2000}
                onChange={(event) =>
                  updateEducationAchievements(entryId, event.target.value)
                }
                optional
                path={`education.${index}.description`}
                value={entry.description}
              />
              <AiImproveControl
                ai={ai}
                fieldKey={`education:${entryId}:achievements`}
                fieldType="educationAchievements"
                label={`education ${index + 1} achievements`}
                onChange={(value) =>
                  updateEducationAchievements(entryId, value)
                }
                text={entry.description}
              />
            </fieldset>
          )
        })}
      </section>
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
