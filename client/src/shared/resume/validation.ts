import { RESUME_LIMITS } from './defaults'
import {
  EMPLOYMENT_TYPES,
  LANGUAGE_PROFICIENCY_LEVELS,
  PHOTOGRAPH_MIME_TYPES,
  type MonthYear,
  type ResumeValidationError,
  type ResumeValidationResult,
  type ValidationErrorCode,
} from './types'

type UnknownRecord = Record<string, unknown>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHOTOGRAPH_DATA_URL_PATTERN =
  /^data:image\/(?:jpeg|png|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/i

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function addError(
  errors: ResumeValidationError[],
  path: string,
  code: ValidationErrorCode,
  message: string,
): void {
  errors.push({ path, code, message })
}

function requireRecord(
  value: unknown,
  path: string,
  errors: ResumeValidationError[],
): UnknownRecord | null {
  if (!isRecord(value)) {
    addError(errors, path, 'invalid_type', `${path} must be an object.`)
    return null
  }
  return value
}

function requireArray(
  value: unknown,
  path: string,
  errors: ResumeValidationError[],
): unknown[] {
  if (!Array.isArray(value)) {
    addError(errors, path, 'invalid_type', `${path} must be an array.`)
    return []
  }
  return value
}

function requireString(
  value: unknown,
  path: string,
  errors: ResumeValidationError[],
): string | null {
  if (typeof value !== 'string') {
    addError(errors, path, 'invalid_type', `${path} must be a string.`)
    return null
  }
  if (value.trim() === '') {
    addError(errors, path, 'required', `${path} is required.`)
    return null
  }
  return value
}

function optionalString(
  value: unknown,
  path: string,
  errors: ResumeValidationError[],
): string | null {
  if (typeof value !== 'string') {
    addError(errors, path, 'invalid_type', `${path} must be a string.`)
    return null
  }
  return value
}

function requireBoolean(
  value: unknown,
  path: string,
  errors: ResumeValidationError[],
): boolean | null {
  if (typeof value !== 'boolean') {
    addError(errors, path, 'invalid_type', `${path} must be a boolean.`)
    return null
  }
  return value
}

function validateUrl(
  value: unknown,
  path: string,
  errors: ResumeValidationError[],
  required = false,
): void {
  const stringValue = required
    ? requireString(value, path, errors)
    : optionalString(value, path, errors)
  if (stringValue === null || (!required && stringValue.trim() === '')) return

  try {
    const url = new URL(stringValue)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
  } catch {
    addError(errors, path, 'invalid_url', `${path} must be a valid HTTP(S) URL.`)
  }
}

function validatePhotographUrl(
  value: unknown,
  path: string,
  errors: ResumeValidationError[],
): void {
  const stringValue = requireString(value, path, errors)
  if (stringValue === null) return

  if (PHOTOGRAPH_DATA_URL_PATTERN.test(stringValue)) {
    const payload = stringValue.slice(stringValue.indexOf(',') + 1)
    if (payload.length > 0) return
  } else {
    try {
      const url = new URL(stringValue)
      if (url.protocol === 'http:' || url.protocol === 'https:') return
      if (url.protocol === 'blob:') {
        const blobSource = stringValue.slice('blob:'.length)
        if (/^null\/[^\s]+$/i.test(blobSource)) return
        try {
          const sourceUrl = new URL(blobSource)
          if (
            (sourceUrl.protocol === 'http:' ||
              sourceUrl.protocol === 'https:') &&
            sourceUrl.pathname.length > 1
          ) {
            return
          }
        } catch {
          // The photograph URL error below covers an invalid blob source.
        }
      }
    } catch {
      // A field-specific error is returned below.
    }
  }

  addError(
    errors,
    path,
    'invalid_url',
    `${path} must be a valid HTTP(S), blob, or supported image data URL.`,
  )
}

function readMonthYear(
  value: unknown,
  path: string,
  errors: ResumeValidationError[],
): MonthYear | null {
  if (!isRecord(value)) {
    addError(errors, path, 'required', `${path} is required.`)
    return null
  }
  const { month, year } = value
  if (
    typeof month !== 'number' ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    typeof year !== 'number' ||
    !Number.isInteger(year) ||
    year < 1900 ||
    year > 2200
  ) {
    addError(
      errors,
      path,
      'invalid_month_year',
      `${path} must contain a month from 1 to 12 and a four-digit year.`,
    )
    return null
  }
  return { month, year }
}

function isAfter(start: MonthYear, end: MonthYear): boolean {
  return start.year * 12 + start.month > end.year * 12 + end.month
}

function validateStringArray(
  value: unknown,
  path: string,
  errors: ResumeValidationError[],
  options: { maximum?: number; detectDuplicates?: boolean } = {},
): void {
  const entries = requireArray(value, path, errors)
  if (options.maximum !== undefined && entries.length > options.maximum) {
    addError(
      errors,
      path,
      'max_entries',
      `${path} cannot contain more than ${options.maximum} entries.`,
    )
  }

  const seen = new Map<string, number>()
  entries.forEach((entry, index) => {
    const entryPath = `${path}.${index}`
    const stringValue = requireString(entry, entryPath, errors)
    if (stringValue === null || !options.detectDuplicates) return
    const normalized = stringValue.trim().toLocaleLowerCase()
    if (seen.has(normalized)) {
      addError(
        errors,
        entryPath,
        'duplicate',
        `${entryPath} duplicates another entry.`,
      )
    } else {
      seen.set(normalized, index)
    }
  })
}

function validatePersonalDetails(
  value: unknown,
  errors: ResumeValidationError[],
): void {
  const path = 'personalDetails'
  const details = requireRecord(value, path, errors)
  if (details === null) return
  requireString(details.firstName, `${path}.firstName`, errors)
  requireString(details.lastName, `${path}.lastName`, errors)
  const email = requireString(details.email, `${path}.email`, errors)
  if (email !== null && !EMAIL_PATTERN.test(email.trim())) {
    addError(
      errors,
      `${path}.email`,
      'invalid_email',
      'personalDetails.email must be a valid email address.',
    )
  }
  requireString(details.phone, `${path}.phone`, errors)
  requireString(details.city, `${path}.city`, errors)
  requireString(details.country, `${path}.country`, errors)
  validateUrl(details.linkedInUrl, `${path}.linkedInUrl`, errors)
  validateUrl(details.portfolioUrl, `${path}.portfolioUrl`, errors)
}

function validatePhotograph(
  value: unknown,
  errors: ResumeValidationError[],
): void {
  if (value === null) return
  const path = 'photograph'
  const photograph = requireRecord(value, path, errors)
  if (photograph === null) return

  validatePhotographUrl(photograph.url, `${path}.url`, errors)
  requireString(photograph.fileName, `${path}.fileName`, errors)
  if (
    typeof photograph.mimeType !== 'string' ||
    !PHOTOGRAPH_MIME_TYPES.includes(
      photograph.mimeType as (typeof PHOTOGRAPH_MIME_TYPES)[number],
    )
  ) {
    addError(
      errors,
      `${path}.mimeType`,
      'invalid_photograph',
      'Photograph type must be JPEG, PNG, or WebP.',
    )
  }
  for (const field of ['sizeBytes', 'width', 'height'] as const) {
    const fieldValue = photograph[field]
    if (
      typeof fieldValue !== 'number' ||
      !Number.isInteger(fieldValue) ||
      fieldValue <= 0
    ) {
      addError(
        errors,
        `${path}.${field}`,
        'invalid_photograph',
        `${path}.${field} must be a positive integer.`,
      )
    }
  }
  optionalString(photograph.altText, `${path}.altText`, errors)
}

function validateEmployment(
  value: unknown,
  errors: ResumeValidationError[],
): void {
  const path = 'employmentHistory'
  const entries = requireArray(value, path, errors)
  if (entries.length > RESUME_LIMITS.employmentHistory) {
    addError(
      errors,
      path,
      'max_entries',
      `${path} cannot contain more than ${RESUME_LIMITS.employmentHistory} entries.`,
    )
  }
  entries.forEach((entry, index) => {
    const entryPath = `${path}.${index}`
    const record = requireRecord(entry, entryPath, errors)
    if (record === null) return
    requireString(record.jobTitle, `${entryPath}.jobTitle`, errors)
    requireString(record.employer, `${entryPath}.employer`, errors)
    if (
      typeof record.employmentType !== 'string' ||
      !EMPLOYMENT_TYPES.includes(
        record.employmentType as (typeof EMPLOYMENT_TYPES)[number],
      )
    ) {
      addError(
        errors,
        `${entryPath}.employmentType`,
        'invalid_option',
        'Employment type is not supported.',
      )
    }
    requireString(record.city, `${entryPath}.city`, errors)
    requireString(record.country, `${entryPath}.country`, errors)
    optionalString(record.description, `${entryPath}.description`, errors)
    const start = readMonthYear(record.startDate, `${entryPath}.startDate`, errors)
    const current = requireBoolean(
      record.currentlyWorkingHere,
      `${entryPath}.currentlyWorkingHere`,
      errors,
    )
    const end =
      record.endDate === null
        ? null
        : readMonthYear(record.endDate, `${entryPath}.endDate`, errors)
    if (current === true && record.endDate !== null) {
      addError(
        errors,
        `${entryPath}.endDate`,
        'invalid_current_date',
        'A current role cannot have an end date.',
      )
    }
    if (current === false && record.endDate === null) {
      addError(
        errors,
        `${entryPath}.endDate`,
        'required',
        'An end date is required when the role is not current.',
      )
    }
    if (start !== null && end !== null && isAfter(start, end)) {
      addError(
        errors,
        `${entryPath}.endDate`,
        'invalid_date_range',
        'Employment end date cannot be before its start date.',
      )
    }
  })
}

function validateEducation(
  value: unknown,
  errors: ResumeValidationError[],
): void {
  const path = 'education'
  const entries = requireArray(value, path, errors)
  if (entries.length > RESUME_LIMITS.education) {
    addError(
      errors,
      path,
      'max_entries',
      `${path} cannot contain more than ${RESUME_LIMITS.education} entries.`,
    )
  }
  entries.forEach((entry, index) => {
    const entryPath = `${path}.${index}`
    const record = requireRecord(entry, entryPath, errors)
    if (record === null) return
    requireString(record.qualification, `${entryPath}.qualification`, errors)
    requireString(record.institution, `${entryPath}.institution`, errors)
    requireString(record.city, `${entryPath}.city`, errors)
    requireString(record.country, `${entryPath}.country`, errors)
    optionalString(record.description, `${entryPath}.description`, errors)
    const start = readMonthYear(record.startDate, `${entryPath}.startDate`, errors)
    const current = requireBoolean(
      record.currentlyStudying,
      `${entryPath}.currentlyStudying`,
      errors,
    )
    const end =
      record.endDate === null
        ? null
        : readMonthYear(record.endDate, `${entryPath}.endDate`, errors)
    if (current === true && record.endDate !== null) {
      addError(
        errors,
        `${entryPath}.endDate`,
        'invalid_current_date',
        'Current study cannot have an end date.',
      )
    }
    if (current === false && record.endDate === null) {
      addError(
        errors,
        `${entryPath}.endDate`,
        'required',
        'An end date is required when study is not current.',
      )
    }
    if (start !== null && end !== null && isAfter(start, end)) {
      addError(
        errors,
        `${entryPath}.endDate`,
        'invalid_date_range',
        'Education end date cannot be before its start date.',
      )
    }
  })
}

function validateTraining(
  value: unknown,
  errors: ResumeValidationError[],
): void {
  const path = 'trainingAndCertificates'
  const entries = requireArray(value, path, errors)
  if (entries.length > RESUME_LIMITS.trainingAndCertificates) {
    addError(
      errors,
      path,
      'max_entries',
      `${path} cannot contain more than ${RESUME_LIMITS.trainingAndCertificates} entries.`,
    )
  }
  entries.forEach((entry, index) => {
    const entryPath = `${path}.${index}`
    const record = requireRecord(entry, entryPath, errors)
    if (record === null) return
    requireString(record.name, `${entryPath}.name`, errors)
    requireString(
      record.issuingOrganisation,
      `${entryPath}.issuingOrganisation`,
      errors,
    )
    const inProgress = requireBoolean(
      record.inProgress,
      `${entryPath}.inProgress`,
      errors,
    )
    optionalString(record.credentialId, `${entryPath}.credentialId`, errors)
    validateUrl(record.credentialUrl, `${entryPath}.credentialUrl`, errors)
    if (inProgress === true && record.completionDate !== null) {
      addError(
        errors,
        `${entryPath}.completionDate`,
        'invalid_current_date',
        'In-progress training cannot have a completion date.',
      )
    } else if (inProgress === false && record.completionDate === null) {
      addError(
        errors,
        `${entryPath}.completionDate`,
        'required',
        'A completion date is required for completed training.',
      )
    } else if (record.completionDate !== null) {
      readMonthYear(
        record.completionDate,
        `${entryPath}.completionDate`,
        errors,
      )
    }
  })
}

function validateLanguages(
  value: unknown,
  errors: ResumeValidationError[],
): void {
  const path = 'languages'
  const entries = requireArray(value, path, errors)
  const seen = new Set<string>()
  entries.forEach((entry, index) => {
    const entryPath = `${path}.${index}`
    const record = requireRecord(entry, entryPath, errors)
    if (record === null) return
    const name = requireString(record.name, `${entryPath}.name`, errors)
    if (name !== null) {
      const normalized = name.trim().toLocaleLowerCase()
      if (seen.has(normalized)) {
        addError(
          errors,
          `${entryPath}.name`,
          'duplicate',
          'Language names must be unique.',
        )
      }
      seen.add(normalized)
    }
    if (
      typeof record.proficiency !== 'string' ||
      !LANGUAGE_PROFICIENCY_LEVELS.includes(
        record.proficiency as (typeof LANGUAGE_PROFICIENCY_LEVELS)[number],
      )
    ) {
      addError(
        errors,
        `${entryPath}.proficiency`,
        'invalid_option',
        'Language proficiency level is not supported.',
      )
    }
  })
}

export function validateResumeData(data: unknown): ResumeValidationResult {
  const errors: ResumeValidationError[] = []
  const resume = requireRecord(data, 'resume', errors)
  if (resume === null) return { valid: false, errors }

  validatePersonalDetails(resume.personalDetails, errors)
  validatePhotograph(resume.photograph, errors)
  optionalString(
    resume.professionalOverview,
    'professionalOverview',
    errors,
  )
  validateStringArray(resume.strengths, 'strengths', errors)
  validateEmployment(resume.employmentHistory, errors)
  validateEducation(resume.education, errors)
  validateStringArray(resume.technicalSkills, 'technicalSkills', errors, {
    maximum: RESUME_LIMITS.technicalSkills,
    detectDuplicates: true,
  })
  validateStringArray(resume.softSkills, 'softSkills', errors, {
    maximum: RESUME_LIMITS.softSkills,
    detectDuplicates: true,
  })
  validateTraining(resume.trainingAndCertificates, errors)
  validateLanguages(resume.languages, errors)
  validateStringArray(resume.interests, 'interests', errors)

  return { valid: errors.length === 0, errors }
}
