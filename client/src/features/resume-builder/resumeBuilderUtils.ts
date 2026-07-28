import {
  createEmptyResumeData,
  validateResumeData,
  type EducationEntry,
  type EmploymentEntry,
  type ResumeData,
  type ResumeValidationError,
  type TrainingCertificateEntry,
} from '../../shared/resume'
import type {
  RepeatableUiIds,
  ResumeBuilderState,
  StepIndex,
} from './types'

let nextId = 0

export function createUiId(prefix: string): string {
  nextId += 1
  return `${prefix}-${nextId}`
}

export function createEmptyIds(): RepeatableUiIds {
  return {
    employment: [],
    education: [],
    training: [],
    languages: [],
    interests: [],
    strengths: [],
    technicalSkills: [],
    softSkills: [],
  }
}

export function createInitialBuilderState(): ResumeBuilderState {
  return {
    resume: createEmptyResumeData(),
    currentStep: 0,
    highestUnlockedStep: 0,
    completedSteps: [],
    skippedSteps: [],
    touchedFields: [],
    errors: [],
    ids: createEmptyIds(),
    dirty: false,
    sessionId: 0,
  }
}

export function createEmploymentEntry(): EmploymentEntry {
  const year = new Date().getFullYear()
  return {
    jobTitle: '',
    employer: '',
    employmentType: 'Full-time',
    city: '',
    country: 'South Africa',
    startDate: { month: 1, year },
    endDate: { month: 12, year },
    currentlyWorkingHere: false,
    description: '',
  }
}

export function createEducationEntry(): EducationEntry {
  const year = new Date().getFullYear()
  return {
    qualification: '',
    institution: '',
    city: '',
    country: 'South Africa',
    startDate: { month: 1, year },
    endDate: { month: 12, year },
    currentlyStudying: false,
    description: '',
  }
}

export function createTrainingEntry(): TrainingCertificateEntry {
  const year = new Date().getFullYear()
  return {
    name: '',
    issuingOrganisation: '',
    completionDate: { month: 1, year },
    inProgress: false,
    credentialId: '',
    credentialUrl: '',
  }
}

function customError(path: string, message: string): ResumeValidationError {
  return { path, code: 'required', message }
}

function errorsForPrefix(
  resume: ResumeData,
  prefixes: string[],
): ResumeValidationError[] {
  return validateResumeData(resume).errors.filter((error) =>
    prefixes.some(
      (prefix) => error.path === prefix || error.path.startsWith(`${prefix}.`),
    ),
  )
}

export function validateStep(
  resume: ResumeData,
  step: StepIndex,
): ResumeValidationError[] {
  switch (step) {
    case 0:
      return errorsForPrefix(resume, ['personalDetails', 'photograph'])
    case 1:
      return resume.professionalOverview.trim() === ''
        ? [
            customError(
              'professionalOverview',
              'Add a professional overview before continuing.',
            ),
          ]
        : errorsForPrefix(resume, ['professionalOverview', 'strengths'])
    case 2:
      return [
        ...(resume.employmentHistory.length === 0
          ? [
              customError(
                'employmentHistory',
                'Add at least one employment entry.',
              ),
            ]
          : []),
        ...errorsForPrefix(resume, ['employmentHistory']),
      ]
    case 3:
      return [
        ...(resume.education.length === 0
          ? [customError('education', 'Add at least one education entry.')]
          : []),
        ...errorsForPrefix(resume, ['education']),
      ]
    case 4:
      return [
        ...(resume.technicalSkills.length === 0
          ? [
              customError(
                'technicalSkills',
                'Add at least one technical skill.',
              ),
            ]
          : []),
        ...(resume.softSkills.length === 0
          ? [customError('softSkills', 'Add at least one soft skill.')]
          : []),
        ...errorsForPrefix(resume, [
          'technicalSkills',
          'softSkills',
          'trainingAndCertificates',
        ]),
      ]
    case 5:
      return errorsForPrefix(resume, ['languages', 'interests'])
    case 6:
      return validateForReview(resume)
  }
}

export function validateForReview(
  resume: ResumeData,
): ResumeValidationError[] {
  return [
    ...validateResumeData(resume).errors,
    ...(resume.professionalOverview.trim() === ''
      ? [customError('professionalOverview', 'Professional overview is required.')]
      : []),
    ...(resume.employmentHistory.length === 0
      ? [customError('employmentHistory', 'At least one employment entry is required.')]
      : []),
    ...(resume.education.length === 0
      ? [customError('education', 'At least one education entry is required.')]
      : []),
    ...(resume.technicalSkills.length === 0
      ? [customError('technicalSkills', 'At least one technical skill is required.')]
      : []),
    ...(resume.softSkills.length === 0
      ? [customError('softSkills', 'At least one soft skill is required.')]
      : []),
  ]
}

export function stepForErrorPath(path: string): StepIndex {
  if (path.startsWith('personalDetails') || path.startsWith('photograph')) return 0
  if (path.startsWith('professionalOverview') || path.startsWith('strengths')) return 1
  if (path.startsWith('employmentHistory')) return 2
  if (path.startsWith('education')) return 3
  if (
    path.startsWith('technicalSkills') ||
    path.startsWith('softSkills') ||
    path.startsWith('trainingAndCertificates')
  ) {
    return 4
  }
  return 5
}

export function fieldId(path: string): string {
  return `field-${path.replaceAll('.', '-')}`
}

export function moveItem<T>(
  values: T[],
  fromIndex: number,
  toIndex: number,
): T[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= values.length ||
    toIndex >= values.length
  ) {
    return values
  }
  const next = [...values]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

export function normalizeEntry(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function hasResumeContent(resume: ResumeData): boolean {
  const details = resume.personalDetails
  return (
    Object.values(details).some((value) => value.trim() !== '') ||
    resume.photograph !== null ||
    resume.professionalOverview.trim() !== '' ||
    resume.strengths.length > 0 ||
    resume.employmentHistory.length > 0 ||
    resume.education.length > 0 ||
    resume.technicalSkills.length > 0 ||
    resume.softSkills.length > 0 ||
    resume.trainingAndCertificates.length > 0 ||
    resume.languages.length > 0 ||
    resume.interests.length > 0
  )
}
