import type { ResumeData } from '../../../shared/resume'

function filenamePart(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function createResumePdfFilename(
  personalDetails: ResumeData['personalDetails'],
): string {
  const name = [personalDetails.firstName, personalDetails.lastName]
    .map(filenamePart)
    .filter(Boolean)
    .join('-')
  return name ? `${name}-resume.pdf` : 'resume.pdf'
}
