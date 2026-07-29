import { useState, type KeyboardEvent } from 'react'
import type { ResumeValidationError } from '../../../shared/resume'
import { fieldId, moveItem, normalizeEntry } from '../resumeBuilderUtils'

interface TagInputProps {
  label: string
  path: string
  values: string[]
  ids: string[]
  errors: ResumeValidationError[]
  onChange: (values: string[], ids: string[]) => void
  createId: () => string
  maximum?: number
  required?: boolean
  preventDuplicates?: boolean
  placeholder?: string
}

export function TagInput({
  label,
  path,
  values,
  ids,
  errors,
  onChange,
  createId,
  maximum,
  required = false,
  preventDuplicates = false,
  placeholder = 'Type and press Enter',
}: TagInputProps) {
  const [draft, setDraft] = useState('')
  const [localError, setLocalError] = useState('')
  const atMaximum = maximum !== undefined && values.length >= maximum
  const schemaError = errors.find(
    (error) => error.path === path || error.path.startsWith(`${path}.`),
  )

  const addTag = () => {
    const trimmed = draft.trim()
    if (trimmed === '') return
    if (
      preventDuplicates &&
      values.some((value) => normalizeEntry(value) === normalizeEntry(trimmed))
    ) {
      setLocalError(`${trimmed} has already been added.`)
      return
    }
    if (atMaximum) {
      setLocalError(`You can add up to ${maximum} ${label.toLowerCase()}.`)
      return
    }
    onChange([...values, trimmed], [...ids, createId()])
    setDraft('')
    setLocalError('')
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      addTag()
    }
  }

  const move = (index: number, direction: -1 | 1) => {
    onChange(
      moveItem(values, index, index + direction),
      moveItem(ids, index, index + direction),
    )
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-bold text-slate-900">
        {label}
        {!required && <span className="ml-1 font-normal text-slate-500">(optional)</span>}
      </legend>
      <div className="flex gap-2">
        <input
          aria-label={`Add ${label.toLowerCase()}`}
          aria-describedby={`${fieldId(path)}-guidance`}
          className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100"
          disabled={atMaximum}
          id={fieldId(path)}
          onChange={(event) => {
            setDraft(event.target.value)
            setLocalError('')
          }}
          onKeyDown={handleKeyDown}
          placeholder={atMaximum ? `Maximum of ${maximum} reached` : placeholder}
          type="text"
          value={draft}
        />
        <button
          className="min-h-11 rounded-lg border border-blue-600 px-4 font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={atMaximum || draft.trim() === ''}
          onClick={addTag}
          type="button"
        >
          Add
        </button>
      </div>
      <p className="text-xs text-slate-500" id={`${fieldId(path)}-guidance`}>
        Press Enter to add. {maximum ? `Maximum ${maximum}.` : 'No fixed maximum.'}
      </p>
      {(localError || schemaError) && (
        <p className="text-sm text-red-700" role="alert">
          {localError || schemaError?.message}
        </p>
      )}
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${label} list`}>
          {values.map((value, index) => (
            <li
              className="flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1.5 text-sm text-purple-900"
              key={ids[index] ?? `${value}-${index}`}
            >
              <span>{value}</span>
              <button
                aria-label={`Move ${value} up`}
                className="rounded px-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                type="button"
              >
                ↑
              </button>
              <button
                aria-label={`Move ${value} down`}
                className="rounded px-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={index === values.length - 1}
                onClick={() => move(index, 1)}
                type="button"
              >
                ↓
              </button>
              <button
                aria-label={`Remove ${value}`}
                className="rounded px-1 font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                onClick={() =>
                  onChange(
                    values.filter((_, itemIndex) => itemIndex !== index),
                    ids.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
                type="button"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  )
}
