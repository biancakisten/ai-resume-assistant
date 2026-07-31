import { useEffect, useRef, useState } from 'react'
import {
  AI_IMPROVEMENT_STYLES,
  type AiFieldType,
  type AiImprovementStyle,
} from '../../../shared/ai/contract'
import type { ResumeAiController } from './types'

const STYLE_LABELS: Record<AiImprovementStyle, string> = {
  professional: 'Professional',
  concise: 'Concise',
  'achievement-focused': 'Achievement-focused',
}

function isImprovementStyle(value: string): value is AiImprovementStyle {
  return AI_IMPROVEMENT_STYLES.some((style) => style === value)
}

interface AiImproveControlProps {
  actionLabel?: string
  ai: ResumeAiController
  fieldKey: string
  fieldType: AiFieldType
  fixedStyle?: AiImprovementStyle
  label: string
  text: string
  onChange: (value: string) => void
}

export function AiImproveControl({
  actionLabel,
  ai,
  fieldKey,
  fieldType,
  fixedStyle,
  label,
  text,
  onChange,
}: AiImproveControlProps) {
  const [style, setStyle] = useState<AiImprovementStyle>(
    fixedStyle ?? 'professional',
  )
  const session = ai.fields[fieldKey]
  const loading = session?.status === 'loading'
  const suggestionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (session?.status === 'suggestion') {
      suggestionRef.current?.focus()
    }
  }, [session?.status])

  const requestImprovement = () => {
    ai.request({
      fieldKey,
      fieldType,
      style: fixedStyle ?? style,
      text,
    })
  }

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4">
      <div className="flex flex-wrap items-end gap-3">
        {fixedStyle ? (
          <p className="min-w-48 flex-1 text-sm font-semibold text-purple-950">
            Request a {STYLE_LABELS[fixedStyle].toLowerCase()} version of{' '}
            {label}. You will review it before anything changes.
          </p>
        ) : (
          <label className="min-w-48 flex-1 text-sm font-semibold text-purple-950">
            Improvement style for {label}
            <select
              className="mt-1.5 min-h-11 w-full rounded-lg border border-purple-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
              disabled={loading}
              onChange={(event) => {
                if (isImprovementStyle(event.target.value)) {
                  setStyle(event.target.value)
                }
              }}
              value={style}
            >
              {AI_IMPROVEMENT_STYLES.map((option) => (
                <option key={option} value={option}>
                  {STYLE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        )}
        {loading ? (
          <button
            className="min-h-11 rounded-lg border border-purple-300 bg-white px-4 text-sm font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
            onClick={() => ai.cancelRequest(fieldKey)}
            type="button"
          >
            Cancel AI request
          </button>
        ) : (
          <button
            aria-label={actionLabel ?? `Improve ${label} with AI`}
            className="min-h-11 rounded-lg bg-purple-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
            disabled={text.trim() === ''}
            onClick={requestImprovement}
            type="button"
          >
            {actionLabel ?? 'Improve with AI'}
          </button>
        )}
      </div>

      {loading && (
        <p className="mt-3 text-sm text-purple-900" role="status">
          Improving only this field…
        </p>
      )}

      {(session?.status === 'error' || session?.status === 'cancelled') && (
        <div className="mt-3" role="alert">
          <p className="text-sm font-semibold text-red-800">{session.error}</p>
          {session.retryable && (
            <button
              className="mt-2 min-h-11 rounded-lg border border-purple-300 bg-white px-4 text-sm font-bold text-purple-900"
              onClick={() => ai.retry(fieldKey)}
              type="button"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {session?.status === 'suggestion' && (
        <div
          className="mt-4 space-y-3 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
          ref={suggestionRef}
          tabIndex={-1}
        >
          <p className="text-sm font-semibold text-purple-950" role="status">
            AI suggestion ready for review.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <section className="rounded-lg border border-slate-200 bg-white p-3">
              <h3 className="text-sm font-bold text-slate-900">Original</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {session.original}
              </p>
            </section>
            <section className="rounded-lg border border-purple-200 bg-white p-3">
              <h3 className="text-sm font-bold text-purple-950">AI suggestion</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {session.suggestion}
              </p>
            </section>
          </div>
          {session.warnings.length > 0 && (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
              role="alert"
            >
              <p className="font-bold">Review note</p>
              <ul className="mt-1 list-disc pl-5">
                {session.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              className="min-h-11 rounded-lg bg-purple-700 px-4 text-sm font-bold text-white"
              onClick={() => {
                onChange(session.suggestion)
                ai.accept(fieldKey)
              }}
              type="button"
            >
              Accept suggestion
            </button>
            <button
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700"
              onClick={() => ai.clear(fieldKey)}
              type="button"
            >
              Reject suggestion
            </button>
            <button
              className="min-h-11 rounded-lg border border-purple-300 bg-white px-4 text-sm font-bold text-purple-900"
              onClick={() => ai.retry(fieldKey)}
              type="button"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {session?.status === 'accepted' && (
        <div className="mt-3 flex flex-wrap items-center gap-3" role="status">
          <p className="text-sm font-semibold text-emerald-800">
            AI suggestion accepted. You can edit it or undo it while on this
            step.
          </p>
          <button
            className="min-h-11 rounded-lg border border-purple-300 bg-white px-4 text-sm font-bold text-purple-900"
            onClick={() => {
              onChange(session.original)
              ai.clear(fieldKey)
            }}
            type="button"
          >
            Undo AI suggestion
          </button>
        </div>
      )}
    </div>
  )
}
