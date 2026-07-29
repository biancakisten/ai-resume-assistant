import { useState } from 'react'
import {
  LANGUAGE_PROFICIENCY_LEVELS,
  type LanguageEntry,
} from '../../../shared/resume'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorSummary, SelectInput, TextInput } from '../components/FormControls'
import { TagInput } from '../components/TagInput'
import {
  createUiId,
  moveItem,
  normalizeEntry,
} from '../resumeBuilderUtils'
import type { BuilderStepProps } from '../types'

export function LanguagesInterestsStep({
  state,
  updateState,
}: BuilderStepProps) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)
  const [languageError, setLanguageError] = useState('')
  const languages = state.resume.languages

  const updateLanguage = (
    index: number,
    updater: (entry: LanguageEntry) => LanguageEntry,
  ) => {
    const nextEntry = updater(languages[index])
    if (
      nextEntry.name.trim() !== '' &&
      languages.some(
        (entry, itemIndex) =>
          itemIndex !== index &&
          normalizeEntry(entry.name) === normalizeEntry(nextEntry.name),
      )
    ) {
      setLanguageError(`${nextEntry.name.trim()} has already been added.`)
      return
    }
    setLanguageError('')
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        languages: current.resume.languages.map((entry, itemIndex) =>
          itemIndex === index ? updater(entry) : entry,
        ),
      },
    }))
  }

  const moveLanguage = (index: number, direction: -1 | 1) =>
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        languages: moveItem(current.resume.languages, index, index + direction),
      },
      ids: {
        ...current.ids,
        languages: moveItem(current.ids.languages, index, index + direction),
      },
    }))

  const removeLanguage = () => {
    if (deleteIndex === null) return
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        languages: current.resume.languages.filter(
          (_, index) => index !== deleteIndex,
        ),
      },
      ids: {
        ...current.ids,
        languages: current.ids.languages.filter(
          (_, index) => index !== deleteIndex,
        ),
      },
    }))
    setDeleteIndex(null)
  }

  return (
    <div className="space-y-8">
      <ErrorSummary errors={state.errors} />
      <section className="space-y-5">
        <div>
          <h3 className="text-lg font-bold">Languages</h3>
          <p className="text-sm text-slate-500">
            Optional. There is no fixed maximum.
          </p>
        </div>
        {languageError && (
          <p className="text-sm text-red-700" role="alert">
            {languageError}
          </p>
        )}
        {languages.map((language, index) => {
          const prefix = `languages.${index}`
          return (
            <fieldset
              className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
              key={state.ids.languages[index] ?? `language-${index}`}
            >
              <legend className="px-2 font-semibold">
                Language {index + 1}
              </legend>
              <TextInput
                errors={state.errors}
                label="Language"
                onChange={(event) =>
                  updateLanguage(index, (current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                path={`${prefix}.name`}
                value={language.name}
              />
              <SelectInput
                errors={state.errors}
                label="Proficiency"
                onChange={(event) =>
                  updateLanguage(index, (current) => ({
                    ...current,
                    proficiency: event.target.value as LanguageEntry['proficiency'],
                  }))
                }
                path={`${prefix}.proficiency`}
                value={language.proficiency}
              >
                {LANGUAGE_PROFICIENCY_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </SelectInput>
              <div className="col-span-full flex flex-wrap justify-end gap-2">
                <button
                  aria-label={`Move ${language.name || `language ${index + 1}`} up`}
                  className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-40"
                  disabled={index === 0}
                  onClick={() => moveLanguage(index, -1)}
                  type="button"
                >
                  Move up
                </button>
                <button
                  aria-label={`Move ${language.name || `language ${index + 1}`} down`}
                  className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold disabled:opacity-40"
                  disabled={index === languages.length - 1}
                  onClick={() => moveLanguage(index, 1)}
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
            </fieldset>
          )
        })}
        <button
          className="min-h-11 rounded-lg border border-blue-600 px-4 font-semibold text-blue-700"
          onClick={() =>
            updateState((current) => ({
              ...current,
              dirty: true,
              resume: {
                ...current.resume,
                languages: [
                  ...current.resume.languages,
                  { name: '', proficiency: 'Professional' },
                ],
              },
              ids: {
                ...current.ids,
                languages: [...current.ids.languages, createUiId('language')],
              },
            }))
          }
          type="button"
        >
          Add language
        </button>
      </section>
      <section className="border-t border-slate-200 pt-7">
        <TagInput
          createId={() => createUiId('interest')}
          errors={state.errors}
          ids={state.ids.interests}
          label="Interests"
          onChange={(values, ids) =>
            updateState((current) => ({
              ...current,
              dirty: true,
              resume: { ...current.resume, interests: values },
              ids: { ...current.ids, interests: ids },
            }))
          }
          path="interests"
          placeholder="e.g. Community coding"
          values={state.resume.interests}
        />
      </section>
      <ConfirmDialog
        confirmLabel="Remove language"
        description={
          deleteIndex === null
            ? ''
            : `Remove ${languages[deleteIndex]?.name || `language ${deleteIndex + 1}`}?`
        }
        destructive
        onCancel={() => setDeleteIndex(null)}
        onConfirm={removeLanguage}
        open={deleteIndex !== null}
        title="Remove language?"
      />
    </div>
  )
}
