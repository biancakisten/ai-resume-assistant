import { describe, expect, it } from 'vitest'
import { createEmptyResumeData } from '../../../shared/resume'
import { createResumePdfFilename } from './resumePdfFilename'

describe('createResumePdfFilename', () => {
  it('normalises a complete name', () => {
    const details = createEmptyResumeData().personalDetails
    details.firstName = '  Thándi  '
    details.lastName = 'Ndlovu-Smith'
    expect(createResumePdfFilename(details)).toBe(
      'thandi-ndlovu-smith-resume.pdf',
    )
  })

  it('removes unsupported filename characters', () => {
    const details = createEmptyResumeData().personalDetails
    details.firstName = '../Lerato'
    details.lastName = 'Mokoena:*?'
    expect(createResumePdfFilename(details)).toBe(
      'lerato-mokoena-resume.pdf',
    )
  })

  it('uses the safe fallback without a usable name', () => {
    expect(
      createResumePdfFilename(createEmptyResumeData().personalDetails),
    ).toBe('resume.pdf')
  })
})
