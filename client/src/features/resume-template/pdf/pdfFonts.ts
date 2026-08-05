import { Font } from '@react-pdf/renderer'
import robotoBoldUrl from '../assets/roboto-bold.ttf?url'
import robotoMediumUrl from '../assets/roboto-medium.ttf?url'
import robotoRegularUrl from '../assets/roboto-regular.ttf?url'

export const PDF_FONT_FAMILY = 'RobotoResumePdf'

export interface PdfFontSources {
  bold: string
  medium: string
  regular: string
}

export const browserPdfFontSources: PdfFontSources = {
  bold: robotoBoldUrl,
  medium: robotoMediumUrl,
  regular: robotoRegularUrl,
}

export function registerPdfFonts(
  sources: PdfFontSources = browserPdfFontSources,
): void {
  if (Font.getRegisteredFontFamilies().includes(PDF_FONT_FAMILY)) return
  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: sources.regular, fontWeight: 400 },
      { src: sources.medium, fontWeight: 500 },
      { src: sources.bold, fontWeight: 700 },
    ],
  })
  Font.registerHyphenationCallback((word) => {
    const characters = Array.from(word)
    if (characters.length <= 48) return [word]
    const chunks: string[] = []
    for (let index = 0; index < characters.length; index += 24) {
      chunks.push(characters.slice(index, index + 24).join(''))
    }
    return chunks
  })
}
