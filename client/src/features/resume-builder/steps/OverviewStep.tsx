import type { BuilderStepProps } from '../types'
import { AiImproveControl } from '../ai/AiImproveControl'
import { ErrorSummary, TextArea } from '../components/FormControls'
import { TagInput } from '../components/TagInput'
import { createUiId } from '../resumeBuilderUtils'

export function OverviewStep({ ai, state, updateState }: BuilderStepProps) {
  const updateOverview = (value: string) =>
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        professionalOverview: value,
      },
    }))

  return (
    <div className="space-y-7">
      <ErrorSummary errors={state.errors} />
      <TextArea
        errors={state.errors}
        hint={`${state.resume.professionalOverview.length}/600 characters. Aim for 2–4 concise sentences.`}
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
    </div>
  )
}
