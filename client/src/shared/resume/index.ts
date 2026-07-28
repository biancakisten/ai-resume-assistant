export { createEmptyResumeData, RESUME_LIMITS } from './defaults'
export {
  completeSampleResume,
  invalidResumeFixtures,
  minimalValidResume,
} from './fixtures'
export {
  EMPLOYMENT_TYPES,
  LANGUAGE_PROFICIENCY_LEVELS,
  PHOTOGRAPH_MIME_TYPES,
} from './types'
export type {
  EducationEntry,
  EmploymentEntry,
  EmploymentType,
  LanguageEntry,
  LanguageProficiency,
  MonthYear,
  PersonalDetails,
  PhotographData,
  PhotographMimeType,
  ResumeData,
  ResumeValidationError,
  ResumeValidationResult,
  TrainingCertificateEntry,
  ValidationErrorCode,
} from './types'
export { validateResumeData } from './validation'
