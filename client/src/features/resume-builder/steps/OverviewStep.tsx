import type { BuilderStepProps } from '../types'
import { ErrorSummary, TextArea } from '../components/FormControls'
import { TagInput } from '../components/TagInput'
import { createUiId } from '../resumeBuilderUtils'

export function OverviewStep({ state, updateState }: BuilderStepProps) {
  return (
    <div className="space-y-7">
      <ErrorSummary errors={state.errors} />
      <TextArea
        errors={state.errors}
        hint={`${state.resume.professionalOverview.length}/600 characters. Aim for 2–4 concise sentences.`}
        label="Professional overview"
        maxLength={600}
        onChange={(event) =>
          updateState((current) => ({
            ...current,
            dirty: true,
            resume: {
              ...current.resume,
              professionalOverview: event.target.value,
            },
          }))
        }
        path="professionalOverview"
        value={state.resume.professionalOverview}
      />
      <TagInput
        createId={() => createUiId('strength')}
        errors={state.errors}
        ids={state.ids.strengths}
        label="Strengths"
        onChange={(values, ids) =>
          updateState((current) => ({
            ...current,
            dirty: true,
            resume: { ...current.resume, strengths: values },
            ids: { ...current.ids, strengths: ids },
          }))
        }
        path="strengths"
        placeholder="e.g. Analytical thinking"
        preventDuplicates
        values={state.resume.strengths}
      />
      <div className="rounded-xl border border-dashed border-purple-200 bg-purple-50 p-4 text-sm text-purple-900">
        AI writing assistance is coming in a later phase. Your overview remains entirely manual for now.
      </div>
    </div>
  )
}
