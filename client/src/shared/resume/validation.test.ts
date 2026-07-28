import { describe, expect, it } from 'vitest'
import {
  completeSampleResume,
  createEmptyResumeData,
  invalidResumeFixtures,
  minimalValidResume,
  RESUME_LIMITS,
  validateResumeData,
} from '.'

function expectError(
  value: unknown,
  path: string,
  code?: string,
): void {
  const result = validateResumeData(value)
  expect(result.valid).toBe(false)
  expect(result.errors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        path,
        ...(code === undefined ? {} : { code }),
      }),
    ]),
  )
}

describe('resume defaults and valid fixtures', () => {
  it('accepts a valid complete resume', () => {
    expect(validateResumeData(completeSampleResume)).toEqual({
      valid: true,
      errors: [],
    })
  })

  it('accepts a minimal valid resume', () => {
    expect(validateResumeData(minimalValidResume).valid).toBe(true)
  })

  it('creates independent empty optional arrays', () => {
    const first = createEmptyResumeData()
    const second = createEmptyResumeData()
    first.strengths.push('Curiosity')

    expect(second).toMatchObject({
      photograph: null,
      professionalOverview: '',
      strengths: [],
      employmentHistory: [],
      education: [],
      technicalSkills: [],
      softSkills: [],
      trainingAndCertificates: [],
      languages: [],
      interests: [],
    })
  })
})

describe('required and formatted fields', () => {
  it('returns field-specific errors for missing required information', () => {
    expectError(
      invalidResumeFixtures.missingRequiredFields,
      'personalDetails.firstName',
      'required',
    )
    expectError(
      invalidResumeFixtures.missingRequiredFields,
      'personalDetails.email',
      'required',
    )
  })

  it('rejects invalid email addresses', () => {
    expectError(
      invalidResumeFixtures.invalidEmail,
      'personalDetails.email',
      'invalid_email',
    )
  })

  it('rejects invalid personal, credential, and photograph URLs', () => {
    expectError(
      invalidResumeFixtures.invalidUrls,
      'personalDetails.portfolioUrl',
      'invalid_url',
    )
    expectError(
      {
        ...completeSampleResume,
        trainingAndCertificates: [
          {
            ...completeSampleResume.trainingAndCertificates[0],
            credentialUrl: 'ftp://example.com/id',
          },
        ],
      },
      'trainingAndCertificates.0.credentialUrl',
      'invalid_url',
    )
    expectError(
      {
        ...completeSampleResume,
        photograph: { ...completeSampleResume.photograph, url: 'bad-url' },
      },
      'photograph.url',
      'invalid_url',
    )
  })

  it.each([
    'http://images.example.com/portrait.jpg',
    'https://images.example.com/portrait.webp',
    'blob:https://resume.example.com/7d92d3d8-37c8-4ca2-92b9-404431c9b342',
    'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    'data:image/png;base64,iVBORw0KGgo=',
    'data:image/webp;base64,UklGRg==',
  ])('accepts the supported photograph URL format: %s', (url) => {
    expect(
      validateResumeData({
        ...completeSampleResume,
        photograph: { ...completeSampleResume.photograph, url },
      }),
    ).toEqual({ valid: true, errors: [] })
  })

  it.each([
    ['malformed URL', 'not-a-url', 'invalid_url'],
    ['malformed blob URL', 'blob:not-a-browser-object-url', 'invalid_url'],
    ['blob URL without an object identifier', 'blob:https://example.com', 'invalid_url'],
    ['non-image data URL', 'data:text/plain;base64,SGVsbG8=', 'invalid_url'],
    ['unsupported image data URL', 'data:image/gif;base64,R0lGODlh', 'invalid_url'],
    ['empty image data payload', 'data:image/png;base64,', 'invalid_url'],
    ['malformed base64 payload', 'data:image/png;base64,not valid!', 'invalid_url'],
    ['empty photograph URL', '', 'required'],
  ])('rejects a %s', (_label, url, code) => {
    expectError(
      {
        ...completeSampleResume,
        photograph: { ...completeSampleResume.photograph, url },
      },
      'photograph.url',
      code,
    )
  })

  it('validates photograph metadata', () => {
    expectError(
      {
        ...completeSampleResume,
        photograph: {
          ...completeSampleResume.photograph,
          mimeType: 'image/gif',
          sizeBytes: 0,
        },
      },
      'photograph.mimeType',
      'invalid_photograph',
    )
    expectError(
      {
        ...completeSampleResume,
        photograph: {
          ...completeSampleResume.photograph,
          mimeType: 'image/gif',
          sizeBytes: 0,
        },
      },
      'photograph.sizeBytes',
      'invalid_photograph',
    )
  })
})

describe('dates and current-state rules', () => {
  it('rejects invalid month-and-year values and reversed ranges', () => {
    expectError(
      invalidResumeFixtures.invalidDates,
      'employmentHistory.0.endDate',
      'invalid_date_range',
    )
    expectError(
      {
        ...minimalValidResume,
        education: [
          {
            ...completeSampleResume.education[0],
            startDate: { month: 13, year: 2020 },
          },
        ],
      },
      'education.0.startDate',
      'invalid_month_year',
    )
  })

  it('requires null end dates for current roles and current study', () => {
    expectError(
      {
        ...minimalValidResume,
        employmentHistory: [
          {
            ...completeSampleResume.employmentHistory[0],
            endDate: { month: 1, year: 2026 },
          },
        ],
      },
      'employmentHistory.0.endDate',
      'invalid_current_date',
    )
    expectError(
      {
        ...minimalValidResume,
        education: [
          {
            ...completeSampleResume.education[0],
            currentlyStudying: true,
          },
        ],
      },
      'education.0.endDate',
      'invalid_current_date',
    )
  })

  it('requires end dates for non-current roles and study', () => {
    expectError(
      {
        ...minimalValidResume,
        employmentHistory: [
          {
            ...completeSampleResume.employmentHistory[0],
            currentlyWorkingHere: false,
          },
        ],
      },
      'employmentHistory.0.endDate',
      'required',
    )
    expectError(
      {
        ...minimalValidResume,
        education: [
          {
            ...completeSampleResume.education[0],
            endDate: null,
          },
        ],
      },
      'education.0.endDate',
      'required',
    )
  })

  it('enforces completion dates for training status', () => {
    expectError(
      {
        ...completeSampleResume,
        trainingAndCertificates: [
          {
            ...completeSampleResume.trainingAndCertificates[0],
            inProgress: true,
          },
        ],
      },
      'trainingAndCertificates.0.completionDate',
      'invalid_current_date',
    )
  })
})

describe('limits and duplicates', () => {
  it.each([
    ['employmentHistory', RESUME_LIMITS.employmentHistory],
    ['education', RESUME_LIMITS.education],
    ['technicalSkills', RESUME_LIMITS.technicalSkills],
    ['softSkills', RESUME_LIMITS.softSkills],
    [
      'trainingAndCertificates',
      RESUME_LIMITS.trainingAndCertificates,
    ],
  ] as const)('enforces the %s maximum of %s', (path, maximum) => {
    expect(maximum).toBe(RESUME_LIMITS[path])
    expectError(invalidResumeFixtures.overAllLimits, path, 'max_entries')
  })

  it('does not impose a language maximum', () => {
    const languages = Array.from({ length: 30 }, (_, index) => ({
      name: `Language ${index}`,
      proficiency: 'Basic',
    }))
    expect(validateResumeData({ ...minimalValidResume, languages }).valid).toBe(
      true,
    )
  })

  it.each([
    ['technicalSkills.1', 'duplicate'],
    ['softSkills.1', 'duplicate'],
    ['languages.1.name', 'duplicate'],
  ])('detects case-insensitive, whitespace-trimmed duplicate at %s', (path, code) => {
    expectError(invalidResumeFixtures.duplicateSkillsAndLanguages, path, code)
  })
})

describe('allowed options and entry requirements', () => {
  it('rejects unsupported employment types', () => {
    expectError(
      {
        ...completeSampleResume,
        employmentHistory: [
          {
            ...completeSampleResume.employmentHistory[0],
            employmentType: 'Permanent',
          },
        ],
      },
      'employmentHistory.0.employmentType',
      'invalid_option',
    )
  })

  it('rejects unsupported language proficiency levels', () => {
    expectError(
      {
        ...minimalValidResume,
        languages: [{ name: 'English', proficiency: 'Expert' }],
      },
      'languages.0.proficiency',
      'invalid_option',
    )
  })

  it('validates required fields inside repeatable entries', () => {
    expectError(
      {
        ...completeSampleResume,
        employmentHistory: [
          { ...completeSampleResume.employmentHistory[0], jobTitle: ' ' },
        ],
      },
      'employmentHistory.0.jobTitle',
      'required',
    )
  })
})
