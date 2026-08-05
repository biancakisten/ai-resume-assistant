// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { completeSampleResume, type ResumeData } from '../../../shared/resume'
import { paginateResume } from '../../resume-template'
import { ResumePdfDownload } from './ResumePdfDownload'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:http://localhost/resume-pdf'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, reject, resolve }
}

function renderDownload(
  resume: ResumeData,
  generatePdf: () => Promise<Blob>,
) {
  return render(
    <ResumePdfDownload
      generatePdf={generatePdf}
      pagination={paginateResume(resume)}
      resume={resume}
    />,
  )
}

describe('ResumePdfDownload', () => {
  it('prepares without automatically downloading and blocks duplicate clicks', async () => {
    const pending = deferred<Blob>()
    const generatePdf = vi.fn(() => pending.promise)
    renderDownload(completeSampleResume, generatePdf)
    const button = screen.getByRole('button', { name: 'Prepare PDF' })
    act(() => {
      button.click()
      button.click()
    })
    expect(generatePdf).toHaveBeenCalledOnce()
    expect((button as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Preparing your PDF.')).toBeTruthy()

    pending.resolve(new Blob(['pdf'], { type: 'application/pdf' }))
    const link = await screen.findByRole('link', { name: 'Download PDF' })
    expect(link.getAttribute('href')).toBe('blob:http://localhost/resume-pdf')
    expect(link.getAttribute('download')).toBe('thandi-ndlovu-resume.pdf')
    expect(screen.getByText(/Your PDF is ready/)).toBeTruthy()
  })

  it('offers retry after a useful error', async () => {
    const generatePdf = vi
      .fn<() => Promise<Blob>>()
      .mockRejectedValueOnce(new Error('Photograph could not be read.'))
      .mockResolvedValueOnce(new Blob(['pdf'], { type: 'application/pdf' }))
    renderDownload(completeSampleResume, generatePdf)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare PDF' }))
    expect(await screen.findByText('Photograph could not be read.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Retry PDF' }))
    expect(await screen.findByRole('link', { name: 'Download PDF' })).toBeTruthy()
    expect(generatePdf).toHaveBeenCalledTimes(2)
  })

  it('discards a stale result after resume data changes', async () => {
    const pending = deferred<Blob>()
    const generatePdf = vi.fn(() => pending.promise)
    const view = renderDownload(completeSampleResume, generatePdf)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare PDF' }))
    const changed = structuredClone(completeSampleResume)
    changed.personalDetails.firstName = 'Changed'
    view.rerender(
      <ResumePdfDownload
        generatePdf={generatePdf}
        pagination={paginateResume(changed)}
        resume={changed}
      />,
    )
    const finishingButton = screen.getByRole('button', {
      name: 'Finishing previous PDF…',
    })
    expect((finishingButton as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(finishingButton)
    expect(generatePdf).toHaveBeenCalledOnce()
    pending.resolve(new Blob(['stale'], { type: 'application/pdf' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Prepare PDF' })).toBeTruthy()
    })
    expect(screen.queryByRole('link', { name: 'Download PDF' })).toBeNull()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Prepare PDF' })).toBeTruthy()
  })

  it('does not publish a result or update state after unmounting', async () => {
    const pending = deferred<Blob>()
    const generatePdf = vi.fn(() => pending.promise)
    const view = renderDownload(completeSampleResume, generatePdf)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare PDF' }))
    view.unmount()
    await act(async () => {
      pending.resolve(new Blob(['unmounted'], { type: 'application/pdf' }))
      await pending.promise
    })

    expect(generatePdf).toHaveBeenCalledOnce()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('revokes ready URLs when data changes and when unmounted', async () => {
    const generatePdf = vi.fn().mockResolvedValue(
      new Blob(['pdf'], { type: 'application/pdf' }),
    )
    const view = renderDownload(completeSampleResume, generatePdf)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare PDF' }))
    await screen.findByRole('link', { name: 'Download PDF' })
    const changed = structuredClone(completeSampleResume)
    changed.personalDetails.lastName = 'Changed'
    view.rerender(
      <ResumePdfDownload
        generatePdf={generatePdf}
        pagination={paginateResume(changed)}
        resume={changed}
      />,
    )
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Prepare PDF' }))
    await screen.findByRole('link', { name: 'Download PDF' })
    view.unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it('does not resurrect a revoked PDF when edited data is restored', async () => {
    const generatePdf = vi.fn().mockResolvedValue(
      new Blob(['pdf'], { type: 'application/pdf' }),
    )
    const view = renderDownload(completeSampleResume, generatePdf)
    fireEvent.click(screen.getByRole('button', { name: 'Prepare PDF' }))
    await screen.findByRole('link', { name: 'Download PDF' })

    const changed = structuredClone(completeSampleResume)
    changed.personalDetails.firstName = 'Changed'
    view.rerender(
      <ResumePdfDownload
        generatePdf={generatePdf}
        pagination={paginateResume(changed)}
        resume={changed}
      />,
    )
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledOnce())
    view.rerender(
      <ResumePdfDownload
        generatePdf={generatePdf}
        pagination={paginateResume(completeSampleResume)}
        resume={completeSampleResume}
      />,
    )

    expect(screen.queryByRole('link', { name: 'Download PDF' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Prepare PDF' })).toBeTruthy()
  })
})
