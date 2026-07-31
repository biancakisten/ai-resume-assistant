// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  completeSampleResume,
  createEmptyResumeData,
  RESUME_LIMITS,
  type ResumeData,
} from '../../shared/resume'
import type { ResumeAiController } from '../resume-builder/ai/types'
import { AiConsentDialog } from '../resume-builder/ai/AiConsentDialog'
import { useResumeAiAssistance } from '../resume-builder/ai/useResumeAiAssistance'
import { ResumePreview } from '../resume-builder/components/ResumePreview'
import { CvTemplate } from './components/CvTemplate'
import { paginateResume } from './pagination'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function longText(label: string, length = 1_800): string {
  const sentence = `${label} preserves factual resume information. `
  return sentence.repeat(Math.ceil(length / sentence.length)).slice(0, length)
}

function createLongResume(): ResumeData {
  const resume = structuredClone(completeSampleResume)
  resume.employmentHistory = Array.from(
    { length: RESUME_LIMITS.employmentHistory },
    (_, index) => ({
      ...structuredClone(completeSampleResume.employmentHistory[0]),
      jobTitle: `Role ${index + 1}`,
      description: longText(`Responsibilities ${index + 1}`),
      achievements: longText(`Achievements ${index + 1}`),
    }),
  )
  return resume
}

function createMaximumResume(): ResumeData {
  const resume = createLongResume()
  resume.education = Array.from(
    { length: RESUME_LIMITS.education },
    (_, index) => ({
      ...structuredClone(completeSampleResume.education[0]),
      qualification: `Qualification ${index + 1}`,
      description: longText(`Education ${index + 1}`, 900),
    }),
  )
  resume.trainingAndCertificates = Array.from(
    { length: RESUME_LIMITS.trainingAndCertificates },
    (_, index) => ({
      ...structuredClone(completeSampleResume.trainingAndCertificates[0]),
      name: `Certificate ${index + 1}`,
    }),
  )
  resume.technicalSkills = Array.from(
    { length: RESUME_LIMITS.technicalSkills },
    (_, index) => `Technical skill ${index + 1}`,
  )
  resume.softSkills = Array.from(
    { length: RESUME_LIMITS.softSkills },
    (_, index) => `Soft skill ${index + 1}`,
  )
  return resume
}

function ConsentHarness({ resume }: { resume: ResumeData }) {
  const ai = useResumeAiAssistance()
  return (
    <>
      <ResumePreview
        ai={ai}
        ids={{ education: [], employment: ['employment-0'] }}
        onApplyShortening={() => undefined}
        resume={resume}
      />
      <AiConsentDialog ai={ai} />
    </>
  )
}

describe('deterministic A4 pagination', () => {
  it('keeps short and complete sample resumes on one page', () => {
    const empty = paginateResume(createEmptyResumeData())
    const complete = paginateResume(completeSampleResume)

    expect(empty.pages).toHaveLength(1)
    expect(empty.fitStatus).toBe('empty')
    expect(empty.warnings).toEqual([
      'Add resume content to see its A4 page fit.',
    ])
    expect(complete.pages).toHaveLength(1)
    expect(complete.fitStatus).toBe('single')
    expect(complete.shortenCandidate).toBeNull()
    expect(complete.warnings).toEqual(['Your resume fits on one A4 page.'])
  })

  it('announces neutral, fit, and exact multi-page status messages', () => {
    const view = render(
      <ResumePreview resume={createEmptyResumeData()} />,
    )
    expect(
      screen.getByRole('status').classList.contains(
        'resume-preview__warning--empty',
      ),
    ).toBe(true)
    expect(
      screen.getByText('Add resume content to see its A4 page fit.'),
    ).toBeTruthy()

    view.rerender(<ResumePreview resume={completeSampleResume} />)
    expect(
      screen.getByText('Your resume fits on one A4 page.'),
    ).toBeTruthy()

    const longResume = createLongResume()
    const pageCount = paginateResume(longResume).pages.length
    view.rerender(<ResumePreview resume={longResume} />)
    expect(
      screen.getByText(
        `Your resume currently uses ${pageCount} A4 pages. Review each continuation page before printing.`,
      ),
    ).toBeTruthy()
  })

  it('creates predictable continuation pages without empty fragments', () => {
    const resume = createLongResume()
    const first = paginateResume(resume)
    const second = paginateResume(structuredClone(resume))

    expect(first.pages.length).toBeGreaterThan(1)
    expect(second).toEqual(first)
    expect(first.shortenCandidate?.text.length).toBe(1_800)
    expect(
      first.pages.every((page) =>
        page.mainSections.every((section) => section.fragments.length > 0),
      ),
    ).toBe(true)
    expect(
      first.pages.some((page) =>
        page.mainSections.some((section) => section.continued),
      ),
    ).toBe(true)
  })

  it('crosses an exact page boundary without a blank page or stranded heading', () => {
    let priorPageCount = 1
    let boundaryResult: ReturnType<typeof paginateResume> | null = null
    let boundaryBullets: string[] = []

    for (let count = 1; count <= 150; count += 1) {
      const resume = createEmptyResumeData()
      boundaryBullets = Array.from(
        { length: count },
        (_, index) => `Boundary bullet ${index + 1}`,
      )
      resume.employmentHistory = [{
        ...structuredClone(completeSampleResume.employmentHistory[0]),
        description: boundaryBullets.join('\n'),
        achievements: '',
      }]
      const result = paginateResume(resume)
      if (result.pages.length > 1) {
        boundaryResult = result
        break
      }
      priorPageCount = result.pages.length
    }

    expect(priorPageCount).toBe(1)
    expect(boundaryResult).not.toBeNull()
    if (boundaryResult === null) {
      throw new Error('Expected the generated content to cross a page boundary.')
    }
    expect(boundaryResult.pages.length).toBe(2)
    expect(
      boundaryResult.pages.every(
        (page) =>
          page.mainSections.length > 0 &&
          page.mainSections.every(
            (section) => section.fragments.length > 0,
          ),
      ),
    ).toBe(true)
    const renderedBullets = boundaryResult.pages.flatMap((page) =>
      page.mainSections.flatMap((section) =>
        section.fragments.flatMap((fragment) =>
          fragment.kind === 'employment' ? fragment.details : [],
        ),
      ),
    )
    expect(renderedBullets).toEqual(boundaryBullets)
  })

  it('preserves every maximum-limit entry across the page model', () => {
    const resume = createMaximumResume()
    const result = paginateResume(resume)
    const employmentIndexes = new Set<number>()
    const educationIndexes = new Set<number>()
    const trainingIndexes = new Set<number>()

    for (const page of result.pages) {
      for (const section of page.mainSections) {
        for (const fragment of section.fragments) {
          if (fragment.kind === 'employment') {
            employmentIndexes.add(fragment.entryIndex)
          } else if (fragment.kind === 'education') {
            educationIndexes.add(fragment.entryIndex)
          } else if (fragment.kind === 'training') {
            trainingIndexes.add(fragment.entryIndex)
          }
        }
      }
    }

    expect(result.pages.length).toBeGreaterThan(2)
    expect(employmentIndexes.size).toBe(RESUME_LIMITS.employmentHistory)
    expect(educationIndexes.size).toBe(RESUME_LIMITS.education)
    expect(trainingIndexes.size).toBe(
      RESUME_LIMITS.trainingAndCertificates,
    )
    expect(
      result.pages.every((page) =>
        page.sidebarSections.every((section) => section.items.length > 0),
      ),
    ).toBe(true)
  })

  it('splits a pathological long entry only into reviewable text fragments', () => {
    const resume = createEmptyResumeData()
    const unbrokenResponsibility = 'accessible '.repeat(600).trim()
    resume.employmentHistory = [
      {
        ...structuredClone(completeSampleResume.employmentHistory[0]),
        description: unbrokenResponsibility,
        achievements: longText('Measured achievement'),
      },
    ]

    const result = paginateResume(resume)
    const details = result.pages.flatMap((page) =>
      page.mainSections.flatMap((section) =>
        section.fragments.flatMap((fragment) =>
          fragment.kind === 'employment' ? fragment.details : [],
        ),
      ),
    )

    expect(result.pages.length).toBeGreaterThan(1)
    expect(details.length).toBeGreaterThan(2)
    expect(details.join(' ')).toContain(unbrokenResponsibility)
    expect(details.every((detail) => detail.trim().length > 0)).toBe(true)
  })

  it('preserves bullet order, abbreviations, decimals, Unicode, and punctuation', () => {
    const resume = createEmptyResumeData()
    const sentence =
      'Built v2.5 tools, e.g. résumé analysers, for multilingual teams! 🚀'
    const description = Array.from({ length: 180 }, () => sentence).join(' ')
    resume.employmentHistory = [{
      ...structuredClone(completeSampleResume.employmentHistory[0]),
      description: `First complete bullet\n${description}\nFinal complete bullet`,
      achievements: '',
    }]

    const details = paginateResume(resume).pages.flatMap((page) =>
      page.mainSections.flatMap((section) =>
        section.fragments.flatMap((fragment) =>
          fragment.kind === 'employment' ? fragment.details : [],
        ),
      ),
    )

    expect(details[0]).toBe('First complete bullet')
    expect(details.at(-1)).toBe('Final complete bullet')
    expect(details.slice(1, -1).join(' ')).toBe(description)
    expect(details.some((detail) => detail.includes('v2.5'))).toBe(true)
    expect(details.some((detail) => detail.includes('e.g.'))).toBe(true)
  })

  it('terminates and preserves a single extremely long Unicode token', () => {
    const resume = createEmptyResumeData()
    const token = '🚀'.repeat(8_000)
    resume.employmentHistory = [{
      ...structuredClone(completeSampleResume.employmentHistory[0]),
      description: token,
      achievements: '',
    }]

    const details = paginateResume(resume).pages.flatMap((page) =>
      page.mainSections.flatMap((section) =>
        section.fragments.flatMap((fragment) =>
          fragment.kind === 'employment' ? fragment.details : [],
        ),
      ),
    )

    expect(details.length).toBeGreaterThan(1)
    expect(details.join('')).toBe(token)
    expect(details.every(Boolean)).toBe(true)
  })

  it('continues and preserves an exceptionally long contact value', () => {
    const resume = createEmptyResumeData()
    const email = `${'person'.repeat(400)}@example.co.za`
    resume.personalDetails.email = email
    const result = paginateResume(resume)
    const emailItems = result.pages.flatMap((page) =>
      page.sidebarSections.flatMap((section) =>
        section.kind === 'contact'
          ? section.items.filter((item) => item.label === 'Email')
          : [],
      ),
    )

    expect(result.pages.length).toBeGreaterThan(1)
    expect(emailItems.length).toBeGreaterThan(1)
    expect(emailItems.map((item) => item.text).join('')).toBe(email)
    expect(emailItems.slice(1).every((item) => item.continued)).toBe(true)
  })

  it('emits deterministic, unique page, section, and fragment keys', () => {
    const result = paginateResume(createMaximumResume())
    const pageKeys = result.pages.map((page) => page.key)
    const sectionKeys = result.pages.flatMap((page) => [
      ...page.mainSections.map((section) => `main:${section.key}`),
      ...page.sidebarSections.map((section) => `sidebar:${section.key}`),
    ])
    const fragmentKeys = result.pages.flatMap((page) =>
      page.mainSections.flatMap((section) =>
        section.fragments.map((fragment) => fragment.key),
      ),
    )

    expect(new Set(pageKeys).size).toBe(pageKeys.length)
    expect(new Set(sectionKeys).size).toBe(sectionKeys.length)
    expect(new Set(fragmentKeys).size).toBe(fragmentKeys.length)
  })

  it('renders the exact deterministic page count for preview and print', () => {
    const resume = createLongResume()
    const pagination = paginateResume(resume)
    render(<CvTemplate pagination={pagination} resume={resume} />)

    expect(screen.getAllByTestId('cv-template-page')).toHaveLength(
      pagination.pages.length,
    )
    expect(
      screen.getByRole('region', {
        name: `Page ${pagination.pages.length} of ${pagination.pages.length}`,
      }),
    ).toBeTruthy()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getAllByText('CV continued')).toHaveLength(
      pagination.pages.length - 1,
    )
  })

  it('offers a concise, reviewable AI request for the longest supported field', () => {
    const resume = createLongResume()
    const request = vi.fn()
    const accept = vi.fn()
    const onApplyShortening = vi.fn()
    const pagination = paginateResume(resume)
    const candidate = pagination.shortenCandidate!
    const fieldKey = 'fit:employmentResponsibilities:employment-0'
    const ai: ResumeAiController = {
      accept,
      cancelConsent: vi.fn(),
      cancelRequest: vi.fn(),
      clear: vi.fn(),
      clearStepState: vi.fn(),
      confirmConsent: vi.fn(),
      consentGranted: true,
      consentOpen: false,
      fields: {},
      request,
      resetSession: vi.fn(),
      retry: vi.fn(),
    }
    const view = render(
      <ResumePreview
        ai={ai}
        ids={{ education: [], employment: ['employment-0'] }}
        onApplyShortening={onApplyShortening}
        resume={resume}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Shorten to fit with AI' }),
    )
    expect(request).toHaveBeenCalledWith({
      fieldKey,
      fieldType: 'employmentResponsibilities',
      style: 'concise',
      text: candidate.text,
    })

    const suggestion = 'A shorter factual responsibilities summary.'
    ai.fields = {
      [fieldKey]: {
        error: '',
        original: candidate.text,
        request: {
          fieldType: candidate.fieldType,
          style: 'concise',
          text: candidate.text,
        },
        retryable: true,
        status: 'suggestion',
        suggestion,
        warnings: [],
      },
    }
    view.rerender(
      <ResumePreview
        ai={ai}
        ids={{ education: [], employment: ['employment-0'] }}
        onApplyShortening={onApplyShortening}
        resume={resume}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Accept suggestion' }))

    expect(onApplyShortening).toHaveBeenCalledWith(
      {
        candidate,
        stableId: 'employment-0',
      },
      suggestion,
    )
    expect(accept).toHaveBeenCalledWith(fieldKey)
  })

  it('requires Phase 6 consent and sends nothing when consent is cancelled', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<ConsentHarness resume={createLongResume()} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Shorten to fit with AI' }),
    )
    expect(
      screen.getByRole('dialog', {
        name: 'Share selected text with the AI service?',
      }),
    ).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
