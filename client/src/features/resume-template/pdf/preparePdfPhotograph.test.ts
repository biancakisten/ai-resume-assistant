// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PhotographData } from '../../../shared/resume'
import { preparePdfPhotograph } from './preparePdfPhotograph'

const photograph: PhotographData = {
  altText: 'Portrait',
  fileName: 'portrait.jpg',
  height: 40,
  mimeType: 'image/jpeg',
  sizeBytes: 100,
  url: 'blob:http://localhost/portrait',
  width: 40,
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:http://localhost/decoded-photo'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
})

function mockFetch(blob: Blob) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    {
      blob: () => Promise.resolve(blob),
      headers: new Headers(),
      ok: true,
    } as Response,
  ))
}

function mockBitmap() {
  const close = vi.fn()
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({
    close,
    height: 40,
    width: 40,
  }))
  return close
}

it.each(['image/jpeg', 'image/png'])(
  'prepares a valid %s photograph',
  async (type) => {
    mockFetch(new Blob(['image'], { type }))
    const close = mockBitmap()
    const result = await preparePdfPhotograph({
      ...photograph,
      mimeType: type as PhotographData['mimeType'],
    })
    expect(result).toMatch(new RegExp(`^data:${type};base64,`))
    expect(close).toHaveBeenCalledOnce()
  },
)

describe('WebP preparation', () => {
  it('converts WebP to PNG locally', async () => {
    mockFetch(new Blob(['webp'], { type: 'image/webp' }))
    const close = mockBitmap()
    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (callback) => callback(new Blob(['png'], { type: 'image/png' })),
    )
    const result = await preparePdfPhotograph({
      ...photograph,
      fileName: 'portrait.webp',
      mimeType: 'image/webp',
    })
    expect(result).toMatch(/^data:image\/png;base64,/)
    expect(drawImage).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
  })

  it('falls back to an image element without createImageBitmap', async () => {
    mockFetch(new Blob(['webp'], { type: 'image/webp' }))
    vi.stubGlobal('createImageBitmap', undefined)
    Object.defineProperties(Image.prototype, {
      decode: { configurable: true, value: vi.fn().mockResolvedValue(undefined) },
      naturalHeight: { configurable: true, get: () => 40 },
      naturalWidth: { configurable: true, get: () => 40 },
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (callback) => callback(new Blob(['png'], { type: 'image/png' })),
    )
    const result = await preparePdfPhotograph({
      ...photograph,
      mimeType: 'image/webp',
    })
    expect(result).toMatch(/^data:image\/png;base64,/)
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('attaches legacy image listeners before assigning the source', async () => {
    mockFetch(new Blob(['webp'], { type: 'image/webp' }))
    vi.stubGlobal('createImageBitmap', undefined)
    let listenersAttached = false
    class LegacyImage extends EventTarget {
      naturalHeight = 40
      naturalWidth = 40

      override addEventListener(...args: Parameters<EventTarget['addEventListener']>) {
        listenersAttached = true
        super.addEventListener(...args)
      }

      set src(_value: string) {
        expect(listenersAttached).toBe(true)
        this.dispatchEvent(new Event('load'))
      }
    }
    vi.stubGlobal('Image', LegacyImage)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      (callback) => callback(new Blob(['png'], { type: 'image/png' })),
    )

    await expect(preparePdfPhotograph({
      ...photograph,
      mimeType: 'image/webp',
    })).resolves.toMatch(/^data:image\/png;base64,/)
  })
})

describe('photograph failures', () => {
  it('rejects an unreadable photograph with a useful error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('CORS')))
    await expect(preparePdfPhotograph(photograph)).rejects.toThrow(
      'The selected photograph could not be loaded. Re-upload it and try again.',
    )
  })

  it('rejects corrupt image data', async () => {
    mockFetch(new Blob(['broken'], { type: 'image/jpeg' }))
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad')))
    Object.defineProperties(Image.prototype, {
      decode: { configurable: true, value: vi.fn().mockRejectedValue(new Error('bad')) },
    })
    await expect(preparePdfPhotograph(photograph)).rejects.toThrow(
      'The selected photograph is corrupt or unreadable. Re-upload it and try again.',
    )
  })

  it('rejects unsupported response types before decoding', async () => {
    mockFetch(new Blob(['not an image'], { type: 'text/plain' }))
    await expect(preparePdfPhotograph(photograph)).rejects.toThrow(
      'The selected photograph is not a supported image type.',
    )
  })

  it('rejects photographs larger than the form limit', async () => {
    mockFetch(new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], {
      type: 'image/jpeg',
    }))
    await expect(preparePdfPhotograph(photograph)).rejects.toThrow(
      'The selected photograph is larger than 5 MB.',
    )
  })
})
