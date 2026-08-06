import type { ResumeData } from '../../../shared/resume'
import {
  PAGINATION_MODEL,
  type MainFragment,
  type PaginationResult,
} from '../pagination'
import type { PdfLayoutDocument, PdfLayoutNode } from './CvPdfDocument'
import type { PdfFontSources } from './pdfFonts'
import {
  PDF_A4_HEIGHT,
  PDF_A4_WIDTH,
  PDF_MAIN_PADDING_BOTTOM,
  PDF_MAIN_WIDTH,
  PDF_SIDEBAR_PADDING_BOTTOM,
  PDF_SIDEBAR_WIDTH,
} from './pdfGeometry'
import { preparePdfPhotograph } from './preparePdfPhotograph'

export interface GenerateResumePdfOptions {
  fontSources?: PdfFontSources
  pagination: PaginationResult
  resume: ResumeData
}

interface BufferProbe {
  isBuffer: (value: unknown) => boolean
}

let bufferProbeUsers = 0
let installedBufferProbe = false

function installBrowserBufferProbe(): () => void {
  const scope = globalThis as unknown as Record<string, unknown>
  if (!scope.Buffer) {
    scope.Buffer = { isBuffer: () => false } satisfies BufferProbe
    installedBufferProbe = true
  }
  bufferProbeUsers += 1
  return () => {
    bufferProbeUsers -= 1
    if (bufferProbeUsers === 0 && installedBufferProbe) {
      Reflect.deleteProperty(scope, 'Buffer')
      installedBufferProbe = false
    }
  }
}

function assertWithinParent(
  node: PdfLayoutNode,
  parentHeight: number,
  path: string,
): void {
  const box = node.box
  if (box) {
    const bottom = (box.top ?? 0) + box.height
    if (bottom > parentHeight + 0.5) {
      throw new Error(
        `PDF content does not fit safely on ${path}. Shorten the resume and try again.`,
      )
    }
  }
  const childHeight = box?.height ?? parentHeight
  node.children?.forEach((child, index) => {
    assertWithinParent(child, childHeight, `${path}, item ${index + 1}`)
  })
}

function assertSafeLayout(
  layout: PdfLayoutDocument | undefined,
  expectedPages: number,
): void {
  if (!layout || layout.children.length !== expectedPages) {
    throw new Error('The PDF layout could not be verified safely.')
  }
  layout.children.forEach((page, index) => {
    const box = page.box
    if (
      !box ||
      Math.abs(box.width - PDF_A4_WIDTH) > 0.5 ||
      Math.abs(box.height - PDF_A4_HEIGHT) > 0.5
    ) {
      throw new Error(`PDF page ${index + 1} is not a valid A4 page.`)
    }
    page.children?.forEach((child, childIndex) => {
      assertWithinParent(child, PDF_A4_HEIGHT, `page ${index + 1}, column ${childIndex + 1}`)
    })
    const content = page.children?.[0]
    const sidebar = content?.children?.[0]
    const main = content?.children?.[1]
    if (
      !content?.box ||
      Math.abs((content.box.left ?? 0)) > 0.5 ||
      Math.abs((content.box.top ?? 0)) > 0.5 ||
      Math.abs(content.box.width - PDF_A4_WIDTH) > 0.5 ||
      Math.abs(content.box.height - PDF_A4_HEIGHT) > 0.5 ||
      !sidebar?.box ||
      Math.abs((sidebar.box.left ?? 0)) > 0.5 ||
      Math.abs((sidebar.box.top ?? 0)) > 0.5 ||
      Math.abs(sidebar.box.width - PDF_SIDEBAR_WIDTH) > 0.5 ||
      Math.abs(sidebar.box.height - PDF_A4_HEIGHT) > 0.5 ||
      !main?.box ||
      Math.abs((main.box.left ?? 0) - PDF_SIDEBAR_WIDTH) > 0.5 ||
      Math.abs((main.box.top ?? 0)) > 0.5 ||
      Math.abs(main.box.width - PDF_MAIN_WIDTH) > 0.5 ||
      Math.abs(main.box.height - PDF_A4_HEIGHT) > 0.5
    ) {
      throw new Error(`PDF page ${index + 1} does not match the resume preview geometry.`)
    }
    const assertContentBoundary = (
      node: PdfLayoutNode,
      maximumBottom: number,
      label: string,
    ) => {
      node.children?.forEach((child) => {
        if (!child.box) return
        const bottom = (child.box.top ?? 0) + child.box.height
        if (bottom > maximumBottom + 0.5) {
          throw new Error(
            `PDF content does not fit safely inside the ${label} on page ${index + 1}. Shorten the resume and try again.`,
          )
        }
      })
    }
    assertContentBoundary(
      sidebar,
      PDF_A4_HEIGHT - PDF_SIDEBAR_PADDING_BOTTOM,
      'sidebar boundary',
    )
    assertContentBoundary(
      main,
      PDF_A4_HEIGHT - PDF_MAIN_PADDING_BOTTOM,
      'main-column boundary',
    )
  })
}

function estimatedLines(value: string): number {
  return value.split(/\r?\n/u).reduce(
    (total, line) => total + Math.max(
      1,
      Math.ceil(Array.from(line.trim()).length / PAGINATION_MODEL.mainCharactersPerLine),
    ),
    0,
  )
}

function estimatedFragmentCost(fragment: MainFragment): number {
  if (fragment.kind === 'overview') return estimatedLines(fragment.text) + 2
  if (fragment.kind === 'employment') {
    return 5 + estimatedLines(fragment.entry.jobTitle) +
      estimatedLines(`${fragment.entry.employer} ${fragment.entry.city} ${fragment.entry.country}`) +
      fragment.details.reduce((total, detail) => total + estimatedLines(detail) + 1, 0)
  }
  if (fragment.kind === 'education') {
    return 5 + estimatedLines(fragment.entry.qualification) +
      estimatedLines(`${fragment.entry.institution} ${fragment.entry.city} ${fragment.entry.country}`) +
      (fragment.description ? estimatedLines(fragment.description) + 1 : 0)
  }
  return 5 + estimatedLines(fragment.entry.name) +
    estimatedLines(fragment.entry.issuingOrganisation) +
    estimatedLines(fragment.entry.credentialId)
}

function assertRenderablePageModel(pagination: PaginationResult): void {
  pagination.pages.forEach((page) => {
    page.mainSections.forEach((section) => {
      section.fragments.forEach((fragment) => {
        if (estimatedFragmentCost(fragment) > PAGINATION_MODEL.mainPageCapacity) {
          throw new Error(
            `PDF content on page ${page.pageNumber} cannot be rendered safely without clipping. Shorten the resume and try again.`,
          )
        }
      })
    })
  })
}

async function assertPdfStructure(blob: Blob, expectedPages: number): Promise<void> {
  const source = new TextDecoder('windows-1252').decode(await blob.arrayBuffer())
  if (!source.startsWith('%PDF-')) {
    throw new Error('The generated file is not a valid PDF.')
  }
  const pageCount = source.match(/\/Type\s*\/Page\b/g)?.length ?? 0
  const mediaBoxes =
    source.match(/\/MediaBox\s*\[\s*0\s+0\s+595\.28\d*\s+841\.89\d*\s*\]/g) ?? []
  if (pageCount !== expectedPages || mediaBoxes.length !== expectedPages) {
    throw new Error('The generated PDF did not match the resume preview pages.')
  }
}

export async function generateResumePdf({
  fontSources,
  pagination,
  resume,
}: GenerateResumePdfOptions): Promise<Blob> {
  assertRenderablePageModel(pagination)
  const removeBufferProbe = installBrowserBufferProbe()
  try {
    const [photograph, renderer, documentModule, fontModule] = await Promise.all([
      preparePdfPhotograph(resume.photograph),
      import('@react-pdf/renderer'),
      import('./CvPdfDocument'),
      import('./pdfFonts'),
    ])
    fontModule.registerPdfFonts(fontSources)
    let layout: PdfLayoutDocument | undefined
    const blob = await renderer.pdf(
      <documentModule.CvPdfDocument
        onLayout={(value) => {
          layout = value
        }}
        pagination={pagination}
        photograph={photograph}
        resume={resume}
      />,
    ).toBlob()
    assertSafeLayout(layout, pagination.pages.length)
    await assertPdfStructure(blob, pagination.pages.length)
    return blob
  } finally {
    removeBufferProbe()
  }
}
