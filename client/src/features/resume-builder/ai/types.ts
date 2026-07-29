import type {
  AiFieldType,
  AiImprovementStyle,
  ImproveTextRequest,
} from '../../../shared/ai/contract'

export type AiFieldStatus =
  | 'loading'
  | 'suggestion'
  | 'accepted'
  | 'error'
  | 'cancelled'

export interface AiFieldSession {
  request: ImproveTextRequest
  status: AiFieldStatus
  original: string
  suggestion: string
  warnings: string[]
  error: string
  retryable: boolean
}

export interface AiImprovementTarget {
  fieldKey: string
  fieldType: AiFieldType
  style: AiImprovementStyle
  text: string
}

export interface ResumeAiController {
  consentGranted: boolean
  consentOpen: boolean
  fields: Record<string, AiFieldSession>
  request: (target: AiImprovementTarget) => void
  confirmConsent: () => void
  cancelConsent: () => void
  cancelRequest: (fieldKey: string) => void
  retry: (fieldKey: string) => void
  accept: (fieldKey: string) => void
  clear: (fieldKey: string) => void
  clearStepState: () => void
  resetSession: () => void
}
