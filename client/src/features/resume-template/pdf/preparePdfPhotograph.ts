import type { PhotographData } from '../../../shared/resume'

const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_PHOTOGRAPH_BYTES = 5 * 1024 * 1024

interface DecodedImage {
  cleanup: () => void
  height: number
  source: CanvasImageSource
  width: number
}

async function decodeWithImageElement(blob: Blob): Promise<DecodedImage> {
  const url = URL.createObjectURL(blob)
  const image = new Image()
  try {
    if (typeof image.decode === 'function') {
      image.src = url
      await image.decode()
    } else {
      await new Promise<void>((resolve, reject) => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener(
          'error',
          () => reject(new Error('The photograph could not be decoded.')),
          { once: true },
        )
        image.src = url
      })
    }
    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error('The photograph has invalid dimensions.')
    }
    return {
      cleanup: () => URL.revokeObjectURL(url),
      height: image.naturalHeight,
      source: image,
      width: image.naturalWidth,
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob)
      if (!bitmap.width || !bitmap.height) {
        bitmap.close()
        throw new Error('The photograph has invalid dimensions.')
      }
      return {
        cleanup: () => bitmap.close(),
        height: bitmap.height,
        source: bitmap,
        width: bitmap.width,
      }
    } catch {
      return decodeWithImageElement(blob)
    }
  }
  return decodeWithImageElement(blob)
}

async function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The photograph could not be converted to PNG.'))
    }, 'image/png')
  })
}

async function convertWebpToPng(blob: Blob): Promise<Blob> {
  const decoded = await decodeImage(blob)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = decoded.width
    canvas.height = decoded.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas image conversion is unavailable.')
    context.drawImage(decoded.source, 0, 0)
    return await canvasToPng(canvas)
  } finally {
    decoded.cleanup()
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return `data:${blob.type};base64,${btoa(binary)}`
}

async function photographBlob(photograph: PhotographData): Promise<Blob> {
  if (!photograph.url.trim()) {
    throw new Error('The selected photograph has no readable URL.')
  }
  let response: Response
  try {
    response = await fetch(photograph.url)
  } catch {
    throw new Error(
      'The selected photograph could not be loaded. Re-upload it and try again.',
    )
  }
  if (!response.ok) {
    throw new Error(
      'The selected photograph could not be loaded. Re-upload it and try again.',
    )
  }
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_PHOTOGRAPH_BYTES) {
    throw new Error('The selected photograph is larger than 5 MB.')
  }
  const received = await response.blob()
  if (received.size > MAX_PHOTOGRAPH_BYTES) {
    throw new Error('The selected photograph is larger than 5 MB.')
  }
  if (received.type && !SUPPORTED_TYPES.has(received.type)) {
    throw new Error('The selected photograph is not a supported image type.')
  }
  const type = received.type || photograph.mimeType
  if (!SUPPORTED_TYPES.has(type)) {
    throw new Error('The selected photograph is not a supported image type.')
  }
  return received.type === type
    ? received
    : new Blob([received], { type })
}

export async function preparePdfPhotograph(
  photograph: PhotographData | null,
): Promise<string | undefined> {
  if (!photograph) return undefined
  try {
    const source = await photographBlob(photograph)
    let prepared = source
    if (source.type === 'image/webp') {
      prepared = await convertWebpToPng(source)
    } else {
      const decoded = await decodeImage(source)
      decoded.cleanup()
    }
    return blobToDataUrl(prepared)
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith('The selected photograph') ||
        error.message === 'Canvas image conversion is unavailable.')
    ) {
      throw error
    }
    throw new Error(
      'The selected photograph is corrupt or unreadable. Re-upload it and try again.',
      { cause: error },
    )
  }
}
