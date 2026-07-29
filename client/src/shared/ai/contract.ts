export const AI_FIELD_TYPES = [
  'professionalOverview',
  'employmentResponsibilities',
  'employmentAchievements',
  'educationAchievements',
] as const

export const AI_IMPROVEMENT_STYLES = [
  'professional',
  'concise',
  'achievement-focused',
] as const

export type AiFieldType = (typeof AI_FIELD_TYPES)[number]
export type AiImprovementStyle = (typeof AI_IMPROVEMENT_STYLES)[number]

export interface ImproveTextRequest {
  fieldType: AiFieldType
  style: AiImprovementStyle
  text: string
}

export interface ImproveTextResponse {
  suggestion: string
  warnings: string[]
}

export interface ImproveTextErrorResponse {
  error: {
    code:
      | 'invalid_request'
      | 'configuration_error'
      | 'timeout'
      | 'rate_limited'
      | 'service_error'
      | 'invalid_response'
    message: string
    retryable: boolean
  }
}

export const AI_TEXT_LIMITS: Record<AiFieldType, number> = {
  professionalOverview: 600,
  employmentResponsibilities: 2_000,
  employmentAchievements: 2_000,
  educationAchievements: 2_000,
}

export function isAiFieldType(value: unknown): value is AiFieldType {
  return (
    typeof value === 'string' &&
    AI_FIELD_TYPES.includes(value as AiFieldType)
  )
}

export function isAiImprovementStyle(
  value: unknown,
): value is AiImprovementStyle {
  return (
    typeof value === 'string' &&
    AI_IMPROVEMENT_STYLES.includes(value as AiImprovementStyle)
  )
}
