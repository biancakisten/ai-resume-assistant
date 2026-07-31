// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  completeSampleResume,
  createEmptyResumeData,
  RESUME_LIMITS,
} from '../../shared/resume'
import { ResumePreview } from '../resume-builder/components/ResumePreview'
import { CvTemplate } from './components/CvTemplate'

afterEach(cleanup)

describe('CvTemplate', () => {
  it('renders the approved two-column template structure', () => {
    render(<CvTemplate resume={completeSampleResume} />)

    const template = screen.getByTestId('cv-template')
    expect(template.classList.contains('cv-template-page')).toBe(true)
    expect(
      within(template)
        .getByRole('complementary')
        .classList.contains('cv-template-sidebar'),
    ).toBe(true)
    const mainContent = template.querySelector('.cv-template-main')
    expect(mainContent?.tagName).toBe('DIV')
    expect(within(template).queryByRole('main')).toBeNull()
    expect(
      within(template).getByRole('heading', {
        name: 'Professional overview',
      }),
    ).toBeTruthy()
    expect(
      within(template).getByRole('heading', {
        name: 'Employment history',
      }),
    ).toBeTruthy()
  })

  it('populates every ResumeData section with the correct values', () => {
    render(<CvTemplate resume={completeSampleResume} />)

    const cv = screen.getByRole('article', { name: 'Thandi Ndlovu CV' })
    expect(within(cv).getByText('Thandi Ndlovu')).toBeTruthy()
    expect(within(cv).getAllByText('Frontend Engineer')).toHaveLength(2)
    expect(within(cv).getByText('+27 82 555 0198')).toBeTruthy()
    expect(
      within(cv).getByText('thandi.ndlovu@example.com'),
    ).toBeTruthy()
    expect(within(cv).getByText('Cape Town, South Africa')).toBeTruthy()
    expect(
      within(cv).getByText('www.linkedin.com/in/thandi-ndlovu-example'),
    ).toBeTruthy()
    expect(
      within(cv).getByText('thandi-ndlovu.example.com'),
    ).toBeTruthy()

    expect(within(cv).getByText('Analytical thinking')).toBeTruthy()
    expect(within(cv).getByText('TypeScript')).toBeTruthy()
    expect(within(cv).getByText('Mentoring')).toBeTruthy()
    expect(within(cv).getByText('isiXhosa: Conversational')).toBeTruthy()
    expect(within(cv).getByText('Local history')).toBeTruthy()

    expect(
      within(cv).getByText(completeSampleResume.professionalOverview),
    ).toBeTruthy()
    expect(
      within(cv).getByText('Ubuntu Digital Studio — Cape Town, South Africa'),
    ).toBeTruthy()
    expect(within(cv).getByText('Mar 2023 – Present')).toBeTruthy()
    expect(
      within(cv).getByText(
        'Builds accessible React applications and mentors junior developers.',
      ),
    ).toBeTruthy()
    expect(
      within(cv).getByText(
        'Reduced accessibility defects by introducing keyboard testing to the release checklist.',
      ),
    ).toBeTruthy()

    expect(
      within(cv).getByText('BSc Information Technology'),
    ).toBeTruthy()
    expect(
      within(cv).getByText(
        'Example Metropolitan University — Gqeberha, South Africa',
      ),
    ).toBeTruthy()
    expect(within(cv).getByText('Feb 2017 – Nov 2020')).toBeTruthy()
    expect(
      within(cv).getByText(
        'Focused on software engineering and information systems.',
      ),
    ).toBeTruthy()

    expect(
      within(cv).getByText('Cloud Practitioner Foundations'),
    ).toBeTruthy()
    expect(
      within(cv).getByText('Example Cloud Academy — Credential ECA-2408-137'),
    ).toBeTruthy()
    expect(within(cv).getByText('Aug 2024')).toBeTruthy()
    expect(
      within(cv).getByText('Accessible Web Development'),
    ).toBeTruthy()
    expect(within(cv).getByText('In progress')).toBeTruthy()

    const photograph = within(cv).getByRole('img', {
      name: 'Professional portrait of Thandi Ndlovu',
    })
    expect(photograph.getAttribute('src')).toBe(
      completeSampleResume.photograph?.url,
    )
    expect(
      within(cv).getByRole('link', {
        name: 'Email: thandi.ndlovu@example.com',
      }).getAttribute('href'),
    ).toBe('mailto:thandi.ndlovu@example.com')
    expect(
      within(cv).getByRole('link', {
        name: 'LinkedIn: https://www.linkedin.com/in/thandi-ndlovu-example',
      }).getAttribute('href'),
    ).toBe('https://www.linkedin.com/in/thandi-ndlovu-example')
  })

  it('uses clear placeholders and omits empty sections for a new resume', () => {
    render(<CvTemplate resume={createEmptyResumeData()} />)

    const cv = screen.getByRole('article', { name: 'Resume CV' })
    expect(within(cv).getByText('Your name')).toBeTruthy()
    expect(within(cv).getByText('Professional title')).toBeTruthy()
    expect(
      within(cv).getByLabelText('Photograph placeholder').textContent,
    ).toBe('CV')
    expect(
      within(cv).queryByRole('heading', { name: 'Employment history' }),
    ).toBeNull()
    expect(
      within(cv).queryByRole('heading', { name: 'Contact information' }),
    ).toBeNull()
  })

  it('creates robust initials for one, multiple, whitespace-only and empty names', () => {
    const resume = createEmptyResumeData()
    const view = render(<CvTemplate resume={resume} />)

    resume.personalDetails.firstName = 'Lerato'
    view.rerender(<CvTemplate resume={{ ...resume }} />)
    expect(screen.getByLabelText('Photograph placeholder').textContent).toBe(
      'LE',
    )

    resume.personalDetails.firstName = 'Mary Jane'
    resume.personalDetails.lastName = 'Watson Parker'
    view.rerender(<CvTemplate resume={{ ...resume }} />)
    expect(screen.getByLabelText('Photograph placeholder').textContent).toBe(
      'MP',
    )

    resume.personalDetails.firstName = '   '
    resume.personalDetails.lastName = '\t'
    view.rerender(<CvTemplate resume={{ ...resume }} />)
    expect(screen.getByLabelText('Photograph placeholder').textContent).toBe(
      'CV',
    )

    resume.personalDetails.firstName = ''
    resume.personalDetails.lastName = ''
    view.rerender(<CvTemplate resume={{ ...resume }} />)
    expect(screen.getByLabelText('Photograph placeholder').textContent).toBe(
      'CV',
    )
  })

  it('falls back safely for invalid and failed photograph sources', () => {
    const resume = {
      ...completeSampleResume,
      photograph: {
        ...completeSampleResume.photograph!,
        url: 'javascript:alert(1)',
      },
    }
    const view = render(<CvTemplate resume={resume} />)

    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByLabelText('Photograph placeholder').textContent).toBe(
      'TN',
    )

    view.rerender(<CvTemplate resume={completeSampleResume} />)
    fireEvent.error(
      screen.getByRole('img', {
        name: 'Professional portrait of Thandi Ndlovu',
      }),
    )
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByLabelText('Photograph placeholder').textContent).toBe(
      'TN',
    )
  })

  it('renders repeatable entries in order and omits malformed partial content', () => {
    const empty = createEmptyResumeData()
    const firstEmployment = completeSampleResume.employmentHistory[0]
    const secondEmployment = completeSampleResume.employmentHistory[1]
    const firstEducation = completeSampleResume.education[0]
    const secondEducation = {
      ...firstEducation,
      qualification: 'Postgraduate Diploma in Interaction Design',
      institution: 'Cape Design Institute',
      startDate: { month: 1, year: 2021 },
      endDate: null,
      currentlyStudying: false,
      description: '   ',
    }
    const partialEmployment = {
      ...firstEmployment,
      jobTitle: ' ',
      employer: '',
      description: '',
      achievements: '',
    }
    const partialEducation = {
      ...firstEducation,
      qualification: '',
      institution: ' ',
      description: '',
    }
    const resume = {
      ...empty,
      employmentHistory: [
        firstEmployment,
        secondEmployment,
        partialEmployment,
      ],
      education: [firstEducation, secondEducation, partialEducation],
    }
    const { container } = render(<CvTemplate resume={resume} />)
    const headings = Array.from(
      container.querySelectorAll('.cv-entry h3'),
      (heading) => heading.textContent,
    )

    expect(headings.slice(0, 2)).toEqual([
      'Frontend Engineer',
      'Junior Web Developer',
    ])
    expect(headings.slice(2)).toEqual([
      'BSc Information Technology',
      'Postgraduate Diploma in Interaction Design',
    ])
    expect(screen.getByText('Jan 2021')).toBeTruthy()
    expect(screen.queryByText('Job title')).toBeNull()
    expect(screen.queryByText('Employer')).toBeNull()
    expect(screen.queryByText('Qualification')).toBeNull()
    expect(screen.queryByText('Institution')).toBeNull()
  })

  it('omits training entries that contain only a non-displayed credential URL', () => {
    const resume = {
      ...createEmptyResumeData(),
      trainingAndCertificates: [
        {
          name: '',
          issuingOrganisation: '',
          completionDate: null,
          inProgress: false,
          credentialId: '',
          credentialUrl: 'https://credentials.example.com/hidden-only',
        },
      ],
    }
    const { container } = render(<CvTemplate resume={resume} />)

    expect(
      screen.queryByRole('heading', { name: 'Additional training' }),
    ).toBeNull()
    expect(container.querySelector('.cv-entry h3:empty')).toBeNull()
  })

  it('renders user-provided markup as text and filters empty list items', () => {
    const unsafeText = '<img src=x onerror="window.hacked=true">'
    const resume = {
      ...createEmptyResumeData(),
      professionalOverview: unsafeText,
      strengths: ['  ', unsafeText],
      technicalSkills: Array.from(
        { length: RESUME_LIMITS.technicalSkills },
        (_, index) => `Skill ${index + 1}`,
      ),
    }
    const { container } = render(<CvTemplate resume={resume} />)

    expect(screen.getAllByText(unsafeText)).toHaveLength(2)
    expect(container.querySelector('.cv-template-main img')).toBeNull()
    expect(container.querySelectorAll('.cv-sidebar-list li:empty')).toHaveLength(
      0,
    )
    expect(screen.getByText(`Skill ${RESUME_LIMITS.technicalSkills}`)).toBeTruthy()
  })

  it('updates the integrated live preview from current ResumeData', () => {
    const empty = createEmptyResumeData()
    const view = render(<ResumePreview resume={empty} />)

    const preview = screen.getByRole('complementary', {
      name: 'Live resume preview',
    })
    expect(within(preview).getByText('Your name')).toBeTruthy()
    expect(
      within(preview).getByRole('region', {
        name: 'Scrollable A4 resume preview',
      }),
    ).toBeTruthy()

    view.rerender(<ResumePreview resume={completeSampleResume} />)
    expect(within(preview).getByText('Thandi Ndlovu')).toBeTruthy()
    expect(
      within(preview).getByText(
        'Reduced accessibility defects by introducing keyboard testing to the release checklist.',
      ),
    ).toBeTruthy()
  })
})
