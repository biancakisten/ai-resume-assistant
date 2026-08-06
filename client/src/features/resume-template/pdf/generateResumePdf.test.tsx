import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  completeSampleResume,
  createEmptyResumeData,
  RESUME_LIMITS,
  type ResumeData,
} from '../../../shared/resume'
import { paginateResume, type CvPageModel } from '../pagination'
import { nalediMkhizeResume } from '../nalediResume.fixture'
import {
  CvPdfDocument,
  type PdfLayoutDocument,
} from './CvPdfDocument'
import { generateResumePdf } from './generateResumePdf'
import { registerPdfFonts } from './pdfFonts'
import {
  PDF_A4_HEIGHT,
  PDF_A4_WIDTH,
  PDF_MAIN_PADDING_BOTTOM,
  PDF_MAIN_PADDING_TOP,
  PDF_MAIN_WIDTH,
  PDF_SIDEBAR_PADDING_HORIZONTAL,
  PDF_SIDEBAR_PADDING_TOP,
  PDF_SIDEBAR_WIDTH,
} from './pdfGeometry'

const JPEG_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAEf/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABAf/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k='
const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

const fontSources = {
  bold: decodeURIComponent(new URL('../assets/roboto-bold.ttf', import.meta.url).pathname),
  medium: decodeURIComponent(new URL('../assets/roboto-medium.ttf', import.meta.url).pathname),
  regular: decodeURIComponent(new URL('../assets/roboto-regular.ttf', import.meta.url).pathname),
}

interface PdfInspection {
  links: string[]
  pageSizes: number[][]
  pageTexts: string[]
  textRuns: Array<{ height: number; text: string }>
}

async function inspectPdf(blob: Blob): Promise<PdfInspection> {
  const task = getDocument({
    data: new Uint8Array(await blob.arrayBuffer()),
    verbosity: 0,
  })
  const document = await task.promise
  const pageSizes: number[][] = []
  const pageTexts: string[] = []
  const links: string[] = []
  const textRuns: Array<{ height: number; text: string }> = []
  for (let index = 1; index <= document.numPages; index += 1) {
    const page = await document.getPage(index)
    pageSizes.push(page.view)
    const content = await page.getTextContent()
    content.items.forEach((item) => {
      if ('str' in item && item.str.trim()) {
        textRuns.push({ height: item.height, text: item.str })
      }
    })
    pageTexts.push(
      content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    const annotations = await page.getAnnotations()
    for (const annotation of annotations) {
      if (annotation.subtype === 'Link') {
        const target = annotation.url || annotation.unsafeUrl
        if (target) links.push(target)
      }
    }
  }
  await task.destroy()
  return { links, pageSizes, pageTexts, textRuns }
}

function withoutPhotograph(resume: ResumeData): ResumeData {
  const copy = structuredClone(resume)
  copy.photograph = null
  return copy
}

function uniquePageTokens(page: CvPageModel): string[] {
  return [
    ...page.sidebarSections.flatMap((section) => section.items.map((item) => item.text)),
    ...page.mainSections.flatMap((section) =>
      section.fragments.flatMap((fragment) => {
        if (fragment.kind === 'overview') return [fragment.text]
        if (fragment.kind === 'employment') {
          return [
            fragment.entry.jobTitle,
            fragment.entry.employer,
            fragment.entry.city,
            fragment.entry.country,
            ...fragment.details,
          ]
        }
        if (fragment.kind === 'education') {
          return [
            fragment.entry.qualification,
            fragment.entry.institution,
            fragment.entry.city,
            fragment.entry.country,
            fragment.description,
          ]
        }
        return [
          fragment.entry.name,
          fragment.entry.issuingOrganisation,
          fragment.entry.credentialId,
        ]
      }),
    ),
  ].map((value) => value.trim()).filter(Boolean)
}

function countMarkers(values: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  const pattern = /(?:Responsibilities|Achievements) marker \d+|Unique PDF role \d+|Maximum qualification \d+|Education evidence \d+|Maximum certificate \d+/g
  values.forEach((value) => {
    value.match(pattern)?.forEach((marker) => {
      counts.set(marker, (counts.get(marker) ?? 0) + 1)
    })
  })
  return counts
}

function multiPageResume(): ResumeData {
  const resume = withoutPhotograph(completeSampleResume)
  resume.employmentHistory = Array.from(
    { length: RESUME_LIMITS.employmentHistory },
    (_, index) => ({
      ...structuredClone(completeSampleResume.employmentHistory[0]),
      jobTitle: `Unique PDF role ${index + 1}`,
      description: `Responsibilities marker ${index + 1}. `.repeat(45),
      achievements: `Achievements marker ${index + 1}. `.repeat(45),
    }),
  )
  return resume
}

function maximumResume(): ResumeData {
  const resume = multiPageResume()
  resume.education = Array.from({ length: RESUME_LIMITS.education }, (_, index) => ({
    ...structuredClone(completeSampleResume.education[0]),
    qualification: `Maximum qualification ${index + 1}`,
    description: `Education evidence ${index + 1}. `.repeat(35),
  }))
  resume.trainingAndCertificates = Array.from(
    { length: RESUME_LIMITS.trainingAndCertificates },
    (_, index) => ({
      ...structuredClone(completeSampleResume.trainingAndCertificates[0]),
      name: `Maximum certificate ${index + 1}`,
      credentialId: `MAX-${index + 1}`,
      credentialUrl: `https://credentials.example.com/max-${index + 1}`,
    }),
  )
  resume.technicalSkills = Array.from(
    { length: RESUME_LIMITS.technicalSkills },
    (_, index) => `Maximum technical skill ${index + 1}`,
  )
  resume.softSkills = Array.from(
    { length: RESUME_LIMITS.softSkills },
    (_, index) => `Maximum soft skill ${index + 1}`,
  )
  return resume
}

describe('production resume PDF', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders A4 pages, selectable complete content, fonts, links, and no app UI', async () => {
    const resume = withoutPhotograph(completeSampleResume)
    const pagination = paginateResume(resume)
    const originalResume = structuredClone(resume)
    const originalPagination = structuredClone(pagination)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const blob = await generateResumePdf({ fontSources, pagination, resume })
    expect(fetchSpy.mock.calls.every(([input]) => String(input).startsWith('data:'))).toBe(true)
    fetchSpy.mockRestore()
    const inspection = await inspectPdf(blob)
    const source = Buffer.from(await blob.arrayBuffer()).toString('latin1')

    expect(source.startsWith('%PDF-')).toBe(true)
    expect(inspection.pageTexts).toHaveLength(pagination.pages.length)
    inspection.pageSizes.forEach((size) => {
      expect(size[0]).toBe(0)
      expect(size[1]).toBe(0)
      expect(size[2]).toBeCloseTo(595.28, 2)
      expect(size[3]).toBeCloseTo(841.89, 2)
    })
    expect(inspection.pageTexts.join(' ')).toContain('Thandi Ndlovu')
    expect(inspection.pageTexts.join(' ')).toContain('PROFESSIONAL OVERVIEW')
    expect(
      inspection.textRuns.find((run) =>
        run.text.includes('Product-minded software engineer'),
      )?.height,
    ).toBeGreaterThanOrEqual(8.5)
    expect(inspection.pageTexts.join(' ')).not.toMatch(
      /LIVE RESUME PREVIEW|Prepare PDF|Shorten to fit|Download PDF/,
    )
    expect(source).toMatch(/Roboto-Regular/)
    expect(source).toMatch(/Roboto-Medium/)
    expect(source).toMatch(/Roboto-Bold/)
    expect(inspection.links).toEqual(expect.arrayContaining([
      'mailto:thandi.ndlovu@example.com',
      'tel:+27825550198',
      'https://www.linkedin.com/in/thandi-ndlovu-example',
      'https://thandi-ndlovu.example.com/',
      'https://credentials.example.com/ECA-2408-137',
    ]))
    expect(resume).toEqual(originalResume)
    expect(pagination).toEqual(originalPagination)
  }, 30_000)

  it.each([
    ['short', withoutPhotograph(completeSampleResume)],
    ['multi-page', multiPageResume()],
    ['maximum', maximumResume()],
  ])('preserves page order and content for %s content', async (_label, resume) => {
    const pagination = paginateResume(resume)
    const blob = await generateResumePdf({ fontSources, pagination, resume })
    const inspection = await inspectPdf(blob)
    expect(inspection.pageTexts).toHaveLength(pagination.pages.length)
    pagination.pages.forEach((page, index) => {
      const pageText = inspection.pageTexts[index].replace(/\s+/g, '')
      let cursor = 0
      uniquePageTokens(page).forEach((token) => {
        const comparable = token.replace(/\s+/g, '').replace(/-/g, '')
        const position = pageText.replace(/-/g, '').indexOf(comparable, cursor)
        expect(position).toBeGreaterThanOrEqual(cursor)
        cursor = position + comparable.length
      })
    })
    const expectedMarkers = countMarkers(
      pagination.pages.flatMap(uniquePageTokens),
    )
    expect(countMarkers(inspection.pageTexts)).toEqual(expectedMarkers)
  }, 60_000)

  it('uses full-bleed sidebars and preserves the full Naledi page model', async () => {
    const resume = structuredClone(nalediMkhizeResume)
    const pagination = paginateResume(resume)
    const originalResume = structuredClone(resume)
    const originalPagination = structuredClone(pagination)
    const blob = await generateResumePdf({ fontSources, pagination, resume })
    const inspection = await inspectPdf(blob)

    expect(pagination.pages).toHaveLength(3)
    expect(inspection.pageTexts).toHaveLength(pagination.pages.length)
    pagination.pages.forEach((page, index) => {
      const pageText = inspection.pageTexts[index].replace(/\s+/g, '')
      let cursor = 0
      uniquePageTokens(page).forEach((token) => {
        const comparable = token.replace(/\s+/g, '').replace(/-/g, '')
        const position = pageText.replace(/-/g, '').indexOf(comparable, cursor)
        expect(position).toBeGreaterThanOrEqual(cursor)
        cursor = position + comparable.length
      })
    })
    expect(inspection.pageTexts.at(-1)).toContain('Responsive Web Design')
    expect(inspection.pageTexts.at(-1)).toContain('UX Design Foundations')
    expect((inspection.pageTexts.at(-1)?.split(/\s+/).length ?? 0)).toBeGreaterThan(50)
    expect(resume).toEqual(originalResume)
    expect(pagination).toEqual(originalPagination)

    registerPdfFonts(fontSources)
    let layout: PdfLayoutDocument | undefined
    const renderer = await import('@react-pdf/renderer')
    await renderer.pdf(
      <CvPdfDocument
        onLayout={(value) => {
          layout = value
        }}
        pagination={pagination}
        resume={resume}
      />,
    ).toBlob()

    expect(layout?.children).toHaveLength(3)
    layout?.children.forEach((page) => {
      expect(page.box?.width).toBeCloseTo(PDF_A4_WIDTH, 2)
      expect(page.box?.height).toBeCloseTo(PDF_A4_HEIGHT, 2)
      const content = page.children?.[0]
      expect(content?.box?.left).toBeCloseTo(0, 2)
      expect(content?.box?.top).toBeCloseTo(0, 2)
      expect(content?.box?.width).toBeCloseTo(PDF_A4_WIDTH, 2)
      expect(content?.box?.height).toBeCloseTo(PDF_A4_HEIGHT, 2)
      const sidebar = content?.children?.[0]
      const main = content?.children?.[1]
      expect(sidebar?.box?.left).toBeCloseTo(0, 2)
      expect(sidebar?.box?.top).toBeCloseTo(0, 2)
      expect(sidebar?.box?.width).toBeCloseTo(PDF_SIDEBAR_WIDTH, 2)
      expect(sidebar?.box?.height).toBeCloseTo(PDF_A4_HEIGHT, 2)
      expect(sidebar?.children?.[0]?.box?.left).toBeCloseTo(
        PDF_SIDEBAR_PADDING_HORIZONTAL,
        2,
      )
      expect(sidebar?.children?.[0]?.box?.top).toBeCloseTo(
        PDF_SIDEBAR_PADDING_TOP,
        2,
      )
      expect(main?.box?.left).toBeCloseTo(PDF_SIDEBAR_WIDTH, 2)
      expect(main?.box?.top).toBeCloseTo(0, 2)
      expect(main?.box?.width).toBeCloseTo(PDF_MAIN_WIDTH, 2)
      expect(main?.box?.height).toBeCloseTo(PDF_A4_HEIGHT, 2)
      expect(main?.children?.[0]?.box?.top).toBeCloseTo(
        PDF_MAIN_PADDING_TOP,
        2,
      )
    })

    const firstTwoPages = layout?.children.slice(0, -1) ?? []
    firstTwoPages.forEach((page) => {
      const main = page.children?.[0]?.children?.[1]
      const lastSection = main?.children?.at(-1)
      const lastContentBottom =
        (lastSection?.box?.top ?? 0) + (lastSection?.box?.height ?? 0)
      expect(lastContentBottom).toBeLessThanOrEqual(
        PDF_A4_HEIGHT - PDF_MAIN_PADDING_BOTTOM + 0.5,
      )
      expect(
        PDF_A4_HEIGHT - PDF_MAIN_PADDING_BOTTOM - lastContentBottom,
      ).toBeLessThan(150)
    })
  }, 60_000)

  it('fails clearly when pathological content cannot be rendered without clipping', async () => {
    const resume = createEmptyResumeData()
    resume.personalDetails.firstName = 'Pathological'
    resume.professionalOverview = `Long token ${'Z'.repeat(9_000)}`

    await expect(generateResumePdf({
      fontSources,
      pagination: paginateResume(resume),
      resume,
    })).rejects.toThrow(/cannot be rendered safely without clipping/i)
  })

  it('preserves a safely renderable unbroken Unicode token', async () => {
    const resume = createEmptyResumeData()
    const token = 'Ž'.repeat(240)
    resume.personalDetails.firstName = 'Unicode'
    resume.professionalOverview = token
    const blob = await generateResumePdf({
      fontSources,
      pagination: paginateResume(resume),
      resume,
    })
    const inspection = await inspectPdf(blob)
    expect(inspection.pageTexts.join('').match(/Ž/g)).toHaveLength(240)
  })

  it.each([
    ['JPEG', JPEG_DATA_URL, 'image/jpeg'],
    ['PNG', PNG_DATA_URL, 'image/png'],
  ])('embeds a selected %s photograph', async (_label, url, mimeType) => {
    const resume = withoutPhotograph(completeSampleResume)
    resume.photograph = {
      altText: 'Portrait',
      fileName: 'portrait',
      height: 1,
      mimeType: mimeType as 'image/jpeg' | 'image/png',
      sizeBytes: 100,
      url,
      width: 1,
    }
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
      close: vi.fn(),
      height: 1,
      width: 1,
    }))
    const blob = await generateResumePdf({
      fontSources,
      pagination: paginateResume(resume),
      resume,
    })
    expect(Buffer.from(await blob.arrayBuffer()).toString('latin1')).toMatch(
      /\/Subtype\s*\/Image\b/,
    )
  }, 30_000)
})
