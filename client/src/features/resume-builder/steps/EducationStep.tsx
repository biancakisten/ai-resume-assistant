import { useState } from 'react'
import { RESUME_LIMITS, type EducationEntry } from '../../../shared/resume'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  Checkbox,
  ErrorSummary,
  TextArea,
  TextInput,
} from '../components/FormControls'
import { MonthYearFields } from '../components/MonthYearFields'
import {
  createEducationEntry,
  createUiId,
  moveItem,
} from '../resumeBuilderUtils'
import type { BuilderStepProps } from '../types'
import { AiImproveControl } from '../ai/AiImproveControl'

export function EducationStep({ ai, state, updateState }: BuilderStepProps) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const entries = state.resume.education
  const atMaximum = entries.length >= RESUME_LIMITS.education

  const updateEntry = (
    index: number,
    updater: (entry: EducationEntry) => EducationEntry,
  ) =>
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        education: current.resume.education.map((entry, itemIndex) =>
          itemIndex === index ? updater(entry) : entry,
        ),
      },
    }))

  const move = (index: number, direction: -1 | 1) =>
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        education: moveItem(current.resume.education, index, index + direction),
      },
      ids: {
        ...current.ids,
        education: moveItem(current.ids.education, index, index + direction),
      },
    }))

  const remove = () => {
    if (deleteIndex === null) return
    const entryId = state.ids.education[deleteIndex]
    if (entryId) {
      ai.clear(`education:${entryId}:achievements`)
    }
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        education: current.resume.education.filter(
          (_, index) => index !== deleteIndex,
        ),
      },
      ids: {
        ...current.ids,
        education: current.ids.education.filter(
          (_, index) => index !== deleteIndex,
        ),
      },
    }))
    setDeleteIndex(null)
  }

  return (
    <div className="space-y-6">
      <ErrorSummary errors={state.errors} />
      {entries.map((entry, index) => {
        const prefix = `education.${index}`
        const entryId = state.ids.education[index] ?? `education-${index}`
        return (
          <fieldset
            className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
            key={entryId}
          >
            <legend className="px-2 text-lg font-bold">
              Education {index + 1}: {entry.qualification || entry.institution || 'New entry'}
            </legend>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                aria-label={`Move education ${index + 1} up`}
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-40"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                type="button"
              >
                Move up
              </button>
              <button
                aria-label={`Move education ${index + 1} down`}
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-40"
                disabled={index === entries.length - 1}
                onClick={() => move(index, 1)}
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
                label="Qualification"
                onChange={(event) =>
                  updateEntry(index, (current) => ({
                    ...current,
                    qualification: event.target.value,
                  }))
                }
                path={`${prefix}.qualification`}
                value={entry.qualification}
              />
              <TextInput
                errors={state.errors}
                label="Institution"
                onChange={(event) =>
                  updateEntry(index, (current) => ({
                    ...current,
                    institution: event.target.value,
                  }))
                }
                path={`${prefix}.institution`}
                value={entry.institution}
              />
              <TextInput
                errors={state.errors}
                label="City"
                onChange={(event) =>
                  updateEntry(index, (current) => ({
                    ...current,
                    city: event.target.value,
                  }))
                }
                path={`${prefix}.city`}
                value={entry.city}
              />
              <TextInput
                errors={state.errors}
                label="Country"
                onChange={(event) =>
                  updateEntry(index, (current) => ({
                    ...current,
                    country: event.target.value,
                  }))
                }
                path={`${prefix}.country`}
                value={entry.country}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <MonthYearFields
                errors={state.errors}
                label="Start date"
                onChange={(value) =>
                  updateEntry(index, (current) => ({
                    ...current,
                    startDate: value,
                  }))
                }
                path={`${prefix}.startDate`}
                value={entry.startDate}
              />
              {!entry.currentlyStudying && entry.endDate && (
                <MonthYearFields
                  errors={state.errors}
                  label="End date"
                  onChange={(value) =>
                    updateEntry(index, (current) => ({
                      ...current,
                      endDate: value,
                    }))
                  }
                  path={`${prefix}.endDate`}
                  value={entry.endDate}
                />
              )}
            </div>
            <Checkbox
              checked={entry.currentlyStudying}
              id={`${prefix}-current`}
              label="I am currently studying here"
              onChange={(event) =>
                updateEntry(index, (current) => ({
                  ...current,
                  currentlyStudying: event.target.checked,
                  endDate: event.target.checked
                    ? null
                    : { month: 12, year: new Date().getFullYear() },
                }))
              }
            />
            <TextArea
              errors={state.errors}
              label="Achievements"
              maxLength={2000}
              onChange={(event) =>
                updateEntry(index, (current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              optional
              path={`${prefix}.description`}
              value={entry.description}
            />
            <AiImproveControl
              ai={ai}
              fieldKey={`education:${entryId}:achievements`}
              fieldType="educationAchievements"
              label={`education ${index + 1} achievements`}
              onChange={(value) =>
                updateEntry(index, (current) => ({
                  ...current,
                  description: value,
                }))
              }
              text={entry.description}
            />
          </fieldset>
        )
      })}
      <button
        className="min-h-11 rounded-lg bg-blue-600 px-4 font-semibold text-white disabled:bg-slate-300"
        disabled={atMaximum}
        onClick={() =>
          updateState((current) => ({
            ...current,
            dirty: true,
            resume: {
              ...current.resume,
              education: [...current.resume.education, createEducationEntry()],
            },
            ids: {
              ...current.ids,
              education: [...current.ids.education, createUiId('education')],
            },
          }))
        }
        type="button"
      >
        Add education
      </button>
      <p className="text-sm text-slate-500" role={atMaximum ? 'status' : undefined}>
        {entries.length} of {RESUME_LIMITS.education} entries added.
        {atMaximum && ' Maximum reached.'}
      </p>
      <ConfirmDialog
        confirmLabel="Remove education"
        description={
          deleteIndex === null
            ? ''
            : `Remove ${
                entries[deleteIndex]?.qualification ||
                entries[deleteIndex]?.institution ||
                `education entry ${deleteIndex + 1}`
              }? Other entries will not be changed.`
        }
        destructive
        onCancel={() => setDeleteIndex(null)}
        onConfirm={remove}
        open={deleteIndex !== null}
        title="Remove education entry?"
      />
    </div>
  )
}
