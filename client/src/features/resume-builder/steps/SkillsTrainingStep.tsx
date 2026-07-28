import { useState } from 'react'
import {
  RESUME_LIMITS,
  type TrainingCertificateEntry,
} from '../../../shared/resume'
import { Checkbox, ErrorSummary, TextInput } from '../components/FormControls'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { MonthYearFields } from '../components/MonthYearFields'
import { TagInput } from '../components/TagInput'
import {
  createTrainingEntry,
  createUiId,
  moveItem,
} from '../resumeBuilderUtils'
import type { BuilderStepProps } from '../types'

export function SkillsTrainingStep({
  state,
  updateState,
}: BuilderStepProps) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const training = state.resume.trainingAndCertificates

  const updateTraining = (
    index: number,
    updater: (
      entry: TrainingCertificateEntry,
    ) => TrainingCertificateEntry,
  ) =>
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        trainingAndCertificates:
          current.resume.trainingAndCertificates.map((entry, itemIndex) =>
            itemIndex === index ? updater(entry) : entry,
          ),
      },
    }))

  const moveTraining = (index: number, direction: -1 | 1) =>
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        trainingAndCertificates: moveItem(
          current.resume.trainingAndCertificates,
          index,
          index + direction,
        ),
      },
      ids: {
        ...current.ids,
        training: moveItem(current.ids.training, index, index + direction),
      },
    }))

  const removeTraining = () => {
    if (deleteIndex === null) return
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        trainingAndCertificates:
          current.resume.trainingAndCertificates.filter(
            (_, index) => index !== deleteIndex,
          ),
      },
      ids: {
        ...current.ids,
        training: current.ids.training.filter(
          (_, index) => index !== deleteIndex,
        ),
      },
    }))
    setDeleteIndex(null)
  }

  return (
    <div className="space-y-8">
      <ErrorSummary errors={state.errors} />
      <TagInput
        createId={() => createUiId('technical-skill')}
        errors={state.errors}
        ids={state.ids.technicalSkills}
        label="Technical skills"
        maximum={RESUME_LIMITS.technicalSkills}
        onChange={(values, ids) =>
          updateState((current) => ({
            ...current,
            dirty: true,
            resume: { ...current.resume, technicalSkills: values },
            ids: { ...current.ids, technicalSkills: ids },
          }))
        }
        path="technicalSkills"
        placeholder="e.g. TypeScript"
        preventDuplicates
        required
        values={state.resume.technicalSkills}
      />
      <TagInput
        createId={() => createUiId('soft-skill')}
        errors={state.errors}
        ids={state.ids.softSkills}
        label="Soft skills"
        maximum={RESUME_LIMITS.softSkills}
        onChange={(values, ids) =>
          updateState((current) => ({
            ...current,
            dirty: true,
            resume: { ...current.resume, softSkills: values },
            ids: { ...current.ids, softSkills: ids },
          }))
        }
        path="softSkills"
        placeholder="e.g. Communication"
        preventDuplicates
        required
        values={state.resume.softSkills}
      />
      <section className="space-y-5 border-t border-slate-200 pt-7">
        <div>
          <h3 className="text-lg font-bold text-slate-950">
            Training and certificates
            <span className="ml-2 text-sm font-normal text-slate-500">
              (optional)
            </span>
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Add up to {RESUME_LIMITS.trainingAndCertificates}.
          </p>
        </div>
        {training.map((entry, index) => {
          const prefix = `trainingAndCertificates.${index}`
          return (
            <fieldset
              className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
              key={state.ids.training[index] ?? `training-${index}`}
            >
              <legend className="px-2 font-bold">
                Certificate {index + 1}: {entry.name || 'New certificate'}
              </legend>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  aria-label={`Move certificate ${index + 1} up`}
                  className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-40"
                  disabled={index === 0}
                  onClick={() => moveTraining(index, -1)}
                  type="button"
                >
                  Move up
                </button>
                <button
                  aria-label={`Move certificate ${index + 1} down`}
                  className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-40"
                  disabled={index === training.length - 1}
                  onClick={() => moveTraining(index, 1)}
                  type="button"
                >
                  Move down
                </button>
                <button
                  className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700"
                  onClick={() => setDeleteIndex(index)}
                  type="button"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput
                  errors={state.errors}
                  label="Name"
                  onChange={(event) =>
                    updateTraining(index, (current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  path={`${prefix}.name`}
                  value={entry.name}
                />
                <TextInput
                  errors={state.errors}
                  label="Issuing organisation"
                  onChange={(event) =>
                    updateTraining(index, (current) => ({
                      ...current,
                      issuingOrganisation: event.target.value,
                    }))
                  }
                  path={`${prefix}.issuingOrganisation`}
                  value={entry.issuingOrganisation}
                />
              </div>
              {!entry.inProgress && entry.completionDate && (
                <MonthYearFields
                  errors={state.errors}
                  label="Completion date"
                  onChange={(value) =>
                    updateTraining(index, (current) => ({
                      ...current,
                      completionDate: value,
                    }))
                  }
                  path={`${prefix}.completionDate`}
                  value={entry.completionDate}
                />
              )}
              <Checkbox
                checked={entry.inProgress}
                id={`${prefix}-in-progress`}
                label="This training is in progress"
                onChange={(event) =>
                  updateTraining(index, (current) => ({
                    ...current,
                    inProgress: event.target.checked,
                    completionDate: event.target.checked
                      ? null
                      : { month: 1, year: new Date().getFullYear() },
                  }))
                }
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput
                  errors={state.errors}
                  label="Credential ID"
                  onChange={(event) =>
                    updateTraining(index, (current) => ({
                      ...current,
                      credentialId: event.target.value,
                    }))
                  }
                  optional
                  path={`${prefix}.credentialId`}
                  value={entry.credentialId}
                />
                <TextInput
                  errors={state.errors}
                  label="Credential URL"
                  onChange={(event) =>
                    updateTraining(index, (current) => ({
                      ...current,
                      credentialUrl: event.target.value,
                    }))
                  }
                  optional
                  path={`${prefix}.credentialUrl`}
                  type="url"
                  value={entry.credentialUrl}
                />
              </div>
            </fieldset>
          )
        })}
        <button
          className="min-h-11 rounded-lg border border-blue-600 px-4 font-semibold text-blue-700 disabled:opacity-40"
          disabled={training.length >= RESUME_LIMITS.trainingAndCertificates}
          onClick={() =>
            updateState((current) => ({
              ...current,
              dirty: true,
              resume: {
                ...current.resume,
                trainingAndCertificates: [
                  ...current.resume.trainingAndCertificates,
                  createTrainingEntry(),
                ],
              },
              ids: {
                ...current.ids,
                training: [...current.ids.training, createUiId('training')],
              },
            }))
          }
          type="button"
        >
          Add training or certificate
        </button>
        <p className="text-sm text-slate-500">
          {training.length} of {RESUME_LIMITS.trainingAndCertificates} added.
          {training.length >= RESUME_LIMITS.trainingAndCertificates &&
            ' Maximum reached.'}
        </p>
      </section>
      <ConfirmDialog
        confirmLabel="Remove certificate"
        description={
          deleteIndex === null
            ? ''
            : `Remove ${
                training[deleteIndex]?.name ||
                training[deleteIndex]?.issuingOrganisation ||
                `certificate ${deleteIndex + 1}`
              }?`
        }
        destructive
        onCancel={() => setDeleteIndex(null)}
        onConfirm={removeTraining}
        open={deleteIndex !== null}
        title="Remove training or certificate?"
      />
    </div>
  )
}
