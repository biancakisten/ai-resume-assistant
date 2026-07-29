export const EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Freelance',
  'Internship',
  'Temporary',
  'Volunteer',
] as const

export const LANGUAGE_PROFICIENCY_LEVELS = [
  'Basic',
  'Conversational',
  'Professional',
  'Fluent',
  'Native',
] as const

export const PHOTOGRAPH_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]
export type LanguageProficiency =
  (typeof LANGUAGE_PROFICIENCY_LEVELS)[number]
export type PhotographMimeType = (typeof PHOTOGRAPH_MIME_TYPES)[number]

export interface MonthYear {
  month: number
  year: number
}

export interface PersonalDetails {
  firstName: string
  lastName: string
  professionalTitle: string
  email: string
  phone: string
  city: string
  country: string
  linkedInUrl: string
  portfolioUrl: string
}

export interface PhotographData {
  url: string
  fileName: string
  mimeType: PhotographMimeType
  sizeBytes: number
  width: number
  height: number
  altText: string
}

export interface EmploymentEntry {
  jobTitle: string
  employer: string
  employmentType: EmploymentType
  city: string
  country: string
  startDate: MonthYear
  endDate: MonthYear | null
  currentlyWorkingHere: boolean
  description: string
  achievements: string
}

export interface EducationEntry {
  qualification: string
  institution: string
  city: string
  country: string
  startDate: MonthYear
  endDate: MonthYear | null
  currentlyStudying: boolean
  description: string
}

export interface TrainingCertificateEntry {
  name: string
  issuingOrganisation: string
  completionDate: MonthYear | null
  inProgress: boolean
  credentialId: string
  credentialUrl: string
}

export interface LanguageEntry {
  name: string
  proficiency: LanguageProficiency
}

export interface ResumeData {
  personalDetails: PersonalDetails
  photograph: PhotographData | null
  professionalOverview: string
  strengths: string[]
  employmentHistory: EmploymentEntry[]
  education: EducationEntry[]
  technicalSkills: string[]
  softSkills: string[]
  trainingAndCertificates: TrainingCertificateEntry[]
  languages: LanguageEntry[]
  interests: string[]
}

export type ValidationErrorCode =
  | 'required'
  | 'invalid_type'
  | 'invalid_email'
  | 'invalid_url'
  | 'invalid_month_year'
  | 'invalid_date_range'
  | 'invalid_current_date'
  | 'max_entries'
  | 'duplicate'
  | 'invalid_option'
  | 'invalid_photograph'

export interface ResumeValidationError {
  path: string
  code: ValidationErrorCode
  message: string
}

export interface ResumeValidationResult {
  valid: boolean
  errors: ResumeValidationError[]
}
