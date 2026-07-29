import { useCallback, useEffect, useRef, useState } from 'react'
import { AI_TEXT_LIMITS } from '../../../shared/ai/contract'
import type {
  ImproveTextErrorResponse,
  ImproveTextResponse,
} from '../../../shared/ai/contract'
import type {
  AiFieldSession,
  AiImprovementTarget,
  ResumeAiController,
} from './types'

const NETWORK_ERROR =
  'The AI request could not be completed. Check your connection and try again.'
const CANCELLED_MESSAGE = 'AI improvement cancelled. Your text was not changed.'

function isSuccessfulResponse(
  value: unknown,
  maxLength: number,
): value is ImproveTextResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const body = value as Record<string, unknown>
  return (
    typeof body.suggestion === 'string' &&
    body.suggestion.trim() !== '' &&
    body.suggestion.length <= maxLength &&
    Array.isArray(body.warnings) &&
    body.warnings.length <= 10 &&
    body.warnings.every(
      (warning) => typeof warning === 'string' && warning.length <= 500,
    )
  )
}

function readErrorResponse(value: unknown): ImproveTextErrorResponse['error'] | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  const error = (value as Record<string, unknown>).error
  if (typeof error !== 'object' || error === null || Array.isArray(error)) {
    return null
  }
  const record = error as Record<string, unknown>
  if (
    typeof record.message !== 'string' ||
    typeof record.retryable !== 'boolean' ||
    typeof record.code !== 'string'
  ) {
    return null
  }
  return record as ImproveTextErrorResponse['error']
}

function createSession(
  target: AiImprovementTarget,
  status: AiFieldSession['status'],
): AiFieldSession {
  return {
    request: {
      fieldType: target.fieldType,
      style: target.style,
      text: target.text,
    },
    status,
    original: target.text,
    suggestion: '',
    warnings: [],
    error: '',
    retryable: true,
  }
}

export function useResumeAiAssistance(): ResumeAiController {
  const [consentGranted, setConsentGranted] = useState(false)
  const [pendingTarget, setPendingTarget] =
    useState<AiImprovementTarget | null>(null)
  const [fields, setFields] = useState<Record<string, AiFieldSession>>({})
  const controllersRef = useRef(new Map<string, AbortController>())

  const abortAll = useCallback(() => {
    controllersRef.current.forEach((controller) => controller.abort())
    controllersRef.current.clear()
  }, [])

  const execute = useCallback(async (target: AiImprovementTarget) => {
    controllersRef.current.get(target.fieldKey)?.abort()
    const controller = new AbortController()
    controllersRef.current.set(target.fieldKey, controller)
    setFields((current) => ({
      ...current,
      [target.fieldKey]: createSession(target, 'loading'),
    }))

    try {
      const response = await fetch('/api/improve-resume-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fieldType: target.fieldType,
          style: target.style,
          text: target.text,
        }),
        signal: controller.signal,
      })

      let body: unknown
      try {
        body = await response.json()
      } catch {
        body = null
      }

      if (!response.ok) {
        const error = readErrorResponse(body)
        throw {
          safe: true,
          message: error?.message ?? NETWORK_ERROR,
          retryable: error?.retryable ?? true,
        }
      }
      if (!isSuccessfulResponse(body, AI_TEXT_LIMITS[target.fieldType])) {
        throw {
          safe: true,
          message:
            'The AI service returned an unusable suggestion. Please try again.',
          retryable: true,
        }
      }
      if (controllersRef.current.get(target.fieldKey) !== controller) return
      setFields((current) => ({
        ...current,
        [target.fieldKey]: {
          ...createSession(target, 'suggestion'),
          suggestion: body.suggestion,
          warnings: body.warnings,
        },
      }))
    } catch (error) {
      if (controllersRef.current.get(target.fieldKey) !== controller) return
      if (controller.signal.aborted) {
        setFields((current) => ({
          ...current,
          [target.fieldKey]: {
            ...createSession(target, 'cancelled'),
            error: CANCELLED_MESSAGE,
          },
        }))
        return
      }
      const details =
        typeof error === 'object' && error !== null
          ? (error as {
              safe?: unknown
              message?: unknown
              retryable?: unknown
            })
          : {}
      setFields((current) => ({
        ...current,
        [target.fieldKey]: {
          ...createSession(target, 'error'),
          error:
            details.safe === true && typeof details.message === 'string'
              ? details.message
              : NETWORK_ERROR,
          retryable:
            details.safe === true && typeof details.retryable === 'boolean'
              ? details.retryable
              : true,
        },
      }))
    } finally {
      if (controllersRef.current.get(target.fieldKey) === controller) {
        controllersRef.current.delete(target.fieldKey)
      }
    }
  }, [])

  useEffect(() => abortAll, [abortAll])

  const request = useCallback(
    (target: AiImprovementTarget) => {
      if (!consentGranted) {
        setPendingTarget(target)
        return
      }
      void execute(target)
    },
    [consentGranted, execute],
  )

  const confirmConsent = useCallback(() => {
    if (pendingTarget === null) return
    const target = pendingTarget
    setConsentGranted(true)
    setPendingTarget(null)
    void execute(target)
  }, [execute, pendingTarget])

  const cancelConsent = useCallback(() => {
    setPendingTarget(null)
  }, [])

  const cancelRequest = useCallback((fieldKey: string) => {
    controllersRef.current.get(fieldKey)?.abort()
  }, [])

  const retry = useCallback(
    (fieldKey: string) => {
      const session = fields[fieldKey]
      if (!session) return
      void execute({
        fieldKey,
        fieldType: session.request.fieldType,
        style: session.request.style,
        text: session.request.text,
      })
    },
    [execute, fields],
  )

  const accept = useCallback((fieldKey: string) => {
    setFields((current) => {
      const session = current[fieldKey]
      if (!session || session.status !== 'suggestion') return current
      return {
        ...current,
        [fieldKey]: { ...session, status: 'accepted' },
      }
    })
  }, [])

  const clear = useCallback((fieldKey: string) => {
    controllersRef.current.get(fieldKey)?.abort()
    controllersRef.current.delete(fieldKey)
    setFields((current) => {
      const remaining = { ...current }
      delete remaining[fieldKey]
      return remaining
    })
  }, [])

  const resetSession = useCallback(() => {
    abortAll()
    setConsentGranted(false)
    setPendingTarget(null)
    setFields({})
  }, [abortAll])

  const clearStepState = useCallback(() => {
    abortAll()
    setPendingTarget(null)
    setFields({})
  }, [abortAll])

  return {
    consentGranted,
    consentOpen: pendingTarget !== null,
    fields,
    request,
    confirmConsent,
    cancelConsent,
    cancelRequest,
    retry,
    accept,
    clear,
    clearStepState,
    resetSession,
  }
}
