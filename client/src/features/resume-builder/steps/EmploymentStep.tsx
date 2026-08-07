import { useState } from 'react'
import {
  EMPLOYMENT_TYPES,
  RESUME_LIMITS,
  type EmploymentEntry,
} from '../../../shared/resume'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  Checkbox,
  ErrorSummary,
  SelectInput,
  TextArea,
  TextInput,
} from '../components/FormControls'
import { MonthYearFields } from '../components/MonthYearFields'
import {
  createEmploymentEntry,
  createUiId,
  moveItem,
} from '../resumeBuilderUtils'
import type { BuilderStepProps } from '../types'

export function EmploymentStep({ ai, state, updateState }: BuilderStepProps) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const entries = state.resume.employmentHistory
  const atMaximum = entries.length >= RESUME_LIMITS.employmentHistory

  const updateEntry = (
    index: number,
    updater: (entry: EmploymentEntry) => EmploymentEntry,
  ) => {
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        employmentHistory: current.resume.employmentHistory.map((entry, itemIndex) =>
          itemIndex === index ? updater(entry) : entry,
        ),
      },
    }))
  }

  const move = (index: number, direction: -1 | 1) => {
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        employmentHistory: moveItem(
          current.resume.employmentHistory,
          index,
          index + direction,
        ),
      },
      ids: {
        ...current.ids,
        employment: moveItem(
          current.ids.employment,
          index,
          index + direction,
        ),
      },
    }))
  }

  const remove = () => {
    if (deleteIndex === null) return
    const entryId = state.ids.employment[deleteIndex]
    if (entryId) {
      ai.clear(`employment:${entryId}:responsibilities`)
      ai.clear(`employment:${entryId}:achievements`)
    }
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        employmentHistory: current.resume.employmentHistory.filter(
          (_, index) => index !== deleteIndex,
        ),
      },
      ids: {
        ...current.ids,
        employment: current.ids.employment.filter(
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
        const prefix = `employmentHistory.${index}`
        const entryId = state.ids.employment[index] ?? `employment-${index}`
        return (
          <fieldset
            className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
            key={entryId}
          >
            <legend className="px-2 text-lg font-bold text-slate-900">
              Role {index + 1}: {entry.jobTitle || entry.employer || 'New role'}
            </legend>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                aria-label={`Move role ${index + 1} up`}
                className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-40"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                type="button"
              >
                Move up
              </button>
              <button
                aria-label={`Move role ${index + 1} down`}
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
                label="Job title"
                onChange={(event) =>
                  updateEntry(index, (current) => ({
                    ...current,
                    jobTitle: event.target.value,
                  }))
                }
                path={`${prefix}.jobTitle`}
                value={entry.jobTitle}
              />
              <TextInput
                errors={state.errors}
                label="Employer"
                onChange={(event) =>
                  updateEntry(index, (current) => ({
                    ...current,
                    employer: event.target.value,
                  }))
                }
                path={`${prefix}.employer`}
                value={entry.employer}
              />
              <SelectInput
                errors={state.errors}
                label="Employment type"
                onChange={(event) =>
                  updateEntry(index, (current) => ({
                    ...current,
                    employmentType: event.target.value as EmploymentEntry['employmentType'],
                  }))
                }
                path={`${prefix}.employmentType`}
                value={entry.employmentType}
              >
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </SelectInput>
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
              {!entry.currentlyWorkingHere && entry.endDate && (
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
              checked={entry.currentlyWorkingHere}
              id={`${prefix}-current`}
              label="I currently work here"
              onChange={(event) =>
                updateEntry(index, (current) => ({
                  ...current,
                  currentlyWorkingHere: event.target.checked,
                  endDate: event.target.checked
                    ? null
                    : { month: 12, year: new Date().getFullYear() },
                }))
              }
            />
            <TextArea
              errors={state.errors}
              label="Responsibilities"
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
            <TextArea
              errors={state.errors}
              label="Achievements"
              maxLength={2000}
              onChange={(event) =>
                updateEntry(index, (current) => ({
                  ...current,
                  achievements: event.target.value,
                }))
              }
              optional
              path={`${prefix}.achievements`}
              value={entry.achievements}
            />
          </fieldset>
        )
      })}
      <button
        className="min-h-11 rounded-lg bg-blue-600 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={atMaximum}
        onClick={() =>
          updateState((current) => ({
            ...current,
            dirty: true,
            resume: {
              ...current.resume,
              employmentHistory: [
                ...current.resume.employmentHistory,
                createEmploymentEntry(),
              ],
            },
            ids: {
              ...current.ids,
              employment: [
                ...current.ids.employment,
                createUiId('employment'),
              ],
            },
          }))
        }
        type="button"
      >
        Add employment
      </button>
      <p className="text-sm text-slate-500" role={atMaximum ? 'status' : undefined}>
        {entries.length} of {RESUME_LIMITS.employmentHistory} roles added.
        {atMaximum && ' Maximum reached.'}
      </p>
      <ConfirmDialog
        confirmLabel="Remove role"
        description={
          deleteIndex === null
            ? ''
            : `Remove ${
                entries[deleteIndex]?.jobTitle ||
                entries[deleteIndex]?.employer ||
                `role ${deleteIndex + 1}`
              }? Other roles will not be changed.`
        }
        destructive
        onCancel={() => setDeleteIndex(null)}
        onConfirm={remove}
        open={deleteIndex !== null}
        title="Remove employment entry?"
      />
    </div>
  )
}
