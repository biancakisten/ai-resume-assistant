import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ResumeData } from '../../../shared/resume'
import type { PaginationResult } from '../../resume-template'
import type { GenerateResumePdfOptions } from '../../resume-template/pdf/generateResumePdf'
import { createResumePdfFilename } from '../../resume-template/pdf/resumePdfFilename'

type PdfGenerator = (options: GenerateResumePdfOptions) => Promise<Blob>

type PdfState =
  | {
      pages: PaginationResult['pages']
      resume: ResumeData
      revision: string
      status: 'loading'
    }
  | {
      message: string
      pages: PaginationResult['pages']
      resume: ResumeData
      revision: string
      status: 'error'
    }
  | {
      filename: string
      pages: PaginationResult['pages']
      resume: ResumeData
      revision: string
      status: 'ready'
      url: string
    }
  | { status: 'idle' }

async function loadAndGeneratePdf(options: GenerateResumePdfOptions): Promise<Blob> {
  const { generateResumePdf } = await import(
    '../../resume-template/pdf/generateResumePdf'
  )
  return generateResumePdf(options)
}

export function ResumePdfDownload({
  generatePdf = loadAndGeneratePdf,
  pagination,
  resume,
}: {
  generatePdf?: PdfGenerator
  pagination: PaginationResult
  resume: ResumeData
}) {
  const revision = useMemo(
    () => JSON.stringify({ pages: pagination.pages, resume }),
    [pagination.pages, resume],
  )
  const revisionRef = useRef(revision)
  const requestIdRef = useRef(0)
  const objectUrlRef = useRef<string | null>(null)
  const generationActiveRef = useRef(false)
  const mountedRef = useRef(false)
  const [generationActive, setGenerationActive] = useState(false)
  const [state, setState] = useState<PdfState>({ status: 'idle' })

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  useEffect(() => {
    revisionRef.current = revision
    requestIdRef.current += 1
    revokeObjectUrl()
  }, [revision, revokeObjectUrl])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      requestIdRef.current += 1
      revokeObjectUrl()
    }
  }, [revokeObjectUrl])

  const visibleState =
    'revision' in state &&
    (state.revision !== revision ||
      state.pages !== pagination.pages ||
      state.resume !== resume)
      ? ({ status: 'idle' } as const)
      : state

  const prepare = async () => {
    if (generationActiveRef.current) return
    generationActiveRef.current = true
    setGenerationActive(true)
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const requestedRevision = revision
    revokeObjectUrl()
    setState({
      pages: pagination.pages,
      resume,
      revision: requestedRevision,
      status: 'loading',
    })
    try {
      const blob = await generatePdf({ pagination, resume })
      if (
        requestIdRef.current !== requestId ||
        revisionRef.current !== requestedRevision
      ) {
        return
      }
      const url = URL.createObjectURL(blob)
      objectUrlRef.current = url
      setState({
        filename: createResumePdfFilename(resume.personalDetails),
        pages: pagination.pages,
        resume,
        revision: requestedRevision,
        status: 'ready',
        url,
      })
    } catch (error) {
      if (
        requestIdRef.current !== requestId ||
        revisionRef.current !== requestedRevision
      ) {
        return
      }
      setState({
        message:
          error instanceof Error
            ? error.message
            : 'The PDF could not be prepared. Please try again.',
        pages: pagination.pages,
        resume,
        revision: requestedRevision,
        status: 'error',
      })
    } finally {
      generationActiveRef.current = false
      if (mountedRef.current) setGenerationActive(false)
    }
  }

  const finishingOutdatedPdf =
    generationActive && visibleState.status !== 'loading'

  return (
    <section aria-labelledby="resume-pdf-title" className="resume-preview__pdf">
      <h2 id="resume-pdf-title">Download your resume</h2>
      <p>Prepare a private PDF in this browser, then review the download link.</p>
      {visibleState.status === 'ready' ? (
        <a
          className="resume-preview__pdf-download"
          download={visibleState.filename}
          href={visibleState.url}
        >
          Download PDF
        </a>
      ) : (
        <button
          className="resume-preview__pdf-button"
          disabled={generationActive}
          onClick={() => void prepare()}
          type="button"
        >
          {finishingOutdatedPdf
            ? 'Finishing previous PDF…'
            : visibleState.status === 'loading'
            ? 'Preparing PDF…'
            : visibleState.status === 'error'
              ? 'Retry PDF'
              : 'Prepare PDF'}
        </button>
      )}
      <div aria-live="polite" aria-atomic="true" className="resume-preview__pdf-status">
        {visibleState.status === 'loading' ? 'Preparing your PDF.' : null}
        {finishingOutdatedPdf
          ? 'Finishing an outdated PDF preparation. Prepare the updated PDF when it finishes.'
          : null}
        {visibleState.status === 'ready'
          ? 'Your PDF is ready. Use the Download PDF link.'
          : null}
        {visibleState.status === 'error' ? visibleState.message : null}
      </div>
    </section>
  )
}
