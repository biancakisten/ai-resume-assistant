import type {
  AiFieldType,
} from '../../shared/ai/contract'
import type {
  EducationEntry,
  EmploymentEntry,
  ResumeData,
  TrainingCertificateEntry,
} from '../../shared/resume'

/**
 * Deterministic estimate calibrated to the Phase 7 A4 CSS. Changes to column
 * widths, type sizes, line heights, gaps, or page padding must be reflected
 * here and verified against dense browser and print previews.
 */
export const PAGINATION_MODEL = Object.freeze({
  mainCharactersPerLine: 62,
  mainPageCapacity: 76,
  sidebarCharactersPerLine: 19,
  sidebarPageCapacity: 70,
})

const MAIN_SECTION_HEADING_COST = 4

type SidebarTextKind =
  | 'strengths'
  | 'technicalSkills'
  | 'softSkills'
  | 'languages'
  | 'interests'

export interface SidebarTextItem {
  continued: boolean
  key: string
  text: string
}

export interface ContactItem {
  accessibleText: string
  continued: boolean
  href: string
  icon: string
  key: string
  label: string
  text: string
}

interface SidebarSectionCommon {
  continued: boolean
  key: string
  title: string
}

export type SidebarSectionSlice =
  | (SidebarSectionCommon & {
      items: ContactItem[]
      kind: 'contact'
    })
  | (SidebarSectionCommon & {
      items: SidebarTextItem[]
      kind: SidebarTextKind
    })

export type MainFragment =
  | {
      key: string
      kind: 'overview'
      text: string
      continued: boolean
    }
  | {
      key: string
      kind: 'employment'
      entry: EmploymentEntry
      entryIndex: number
      details: string[]
      continued: boolean
    }
  | {
      key: string
      kind: 'education'
      entry: EducationEntry
      entryIndex: number
      description: string
      continued: boolean
    }
  | {
      key: string
      kind: 'training'
      entry: TrainingCertificateEntry
      entryIndex: number
    }

export interface MainSectionSlice {
  continued: boolean
  fragments: MainFragment[]
  key: string
  kind: 'overview' | 'employment' | 'education' | 'training'
  title: string
}

export interface CvPageModel {
  key: string
  mainSections: MainSectionSlice[]
  pageNumber: number
  sidebarContinued: boolean
  sidebarSections: SidebarSectionSlice[]
}

export interface ShortenCandidate {
  fieldType: AiFieldType
  index: number | null
  kind:
    | 'professionalOverview'
    | 'employmentResponsibilities'
    | 'employmentAchievements'
    | 'educationAchievements'
  label: string
  text: string
}

export interface PaginationResult {
  fitStatus: 'empty' | 'single' | 'multiple'
  pages: CvPageModel[]
  shortenCandidate: ShortenCandidate | null
  warnings: string[]
}

interface CostedMainFragment {
  cost: number
  fragment: MainFragment
  sectionKind: MainSectionSlice['kind']
  sectionTitle: string
}

type SidebarSource =
  | {
      items: ContactItem[]
      kind: 'contact'
      title: string
    }
  | {
      items: SidebarTextItem[]
      kind: SidebarTextKind
      title: string
    }

function cleanList(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean)
}

function formatLocation(...parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(', ')
}

function safeHttpUrl(value: string): string {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : ''
  } catch {
    return ''
  }
}

function displayHttpUrl(value: string): string {
  return value.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function textItems(...values: string[]): string[] {
  return values.flatMap((value) =>
    value
      .split(/\r?\n/)
      .map((item) => item.replace(/^[•*-]\s*/, '').trim())
      .filter(Boolean),
  )
}

function wrappedLines(text: string, charactersPerLine: number): number {
  const lines = text.split(/\r?\n/)
  return lines.reduce(
    (total, line) =>
      total + Math.max(1, Math.ceil(line.trim().length / charactersPerLine)),
    0,
  )
}

function mainTextCost(text: string): number {
  return wrappedLines(text, PAGINATION_MODEL.mainCharactersPerLine)
}

function sidebarItemCost(item: ContactItem | SidebarTextItem): number {
  return wrappedLines(item.text, PAGINATION_MODEL.sidebarCharactersPerLine)
}

const NON_TERMINAL_ABBREVIATIONS = new Set([
  'e.g.',
  'i.e.',
  'mr.',
  'mrs.',
  'ms.',
  'dr.',
  'prof.',
  'sr.',
  'jr.',
  'vs.',
])

function sentencePieces(text: string): string[] {
  const normalized = text.trim().replace(/\s+/gu, ' ')
  if (!normalized) return []
  const pieces: string[] = []
  let start = 0

  for (let index = 0; index < normalized.length; index += 1) {
    if (!'.!?'.includes(normalized[index])) continue
    let punctuationEnd = index + 1
    while (
      punctuationEnd < normalized.length &&
      '.!?'.includes(normalized[punctuationEnd])
    ) {
      punctuationEnd += 1
    }
    const followedByBoundary =
      punctuationEnd === normalized.length ||
      /\s/u.test(normalized[punctuationEnd])
    if (!followedByBoundary) {
      index = punctuationEnd - 1
      continue
    }

    const candidate = normalized.slice(start, punctuationEnd).trim()
    const lastToken = candidate.split(/\s+/u).at(-1)?.toLowerCase() ?? ''
    const isInitial = /^[\p{L}]\.$/u.test(lastToken)
    if (
      normalized[index] === '.' &&
      (isInitial || NON_TERMINAL_ABBREVIATIONS.has(lastToken))
    ) {
      index = punctuationEnd - 1
      continue
    }

    if (candidate) pieces.push(candidate)
    start = punctuationEnd
    while (start < normalized.length && /\s/u.test(normalized[start])) {
      start += 1
    }
    index = start - 1
  }

  const remainder = normalized.slice(start).trim()
  if (remainder) pieces.push(remainder)
  return pieces.length > 0 ? pieces : [normalized]
}

function splitLongToken(token: string, maximumCost: number): string[] {
  const maximumCharacters = Math.max(
    1,
    maximumCost * PAGINATION_MODEL.mainCharactersPerLine,
  )
  const characters = Array.from(token)
  const chunks: string[] = []
  for (let index = 0; index < characters.length; index += maximumCharacters) {
    chunks.push(characters.slice(index, index + maximumCharacters).join(''))
  }
  return chunks
}

function splitAtSafeBoundaries(text: string, maximumCost: number): string[] {
  const normalized = text.trim().replace(/\s+/gu, ' ')
  if (!normalized) return []
  if (mainTextCost(normalized) <= maximumCost) return [normalized]

  const sentences = sentencePieces(normalized)
  const chunks: string[] = []
  let current = ''

  const addPiece = (piece: string) => {
    const candidate = current ? `${current} ${piece}` : piece
    if (mainTextCost(candidate) <= maximumCost) {
      current = candidate
      return
    }
    if (current) {
      chunks.push(current)
      current = ''
    }
    if (mainTextCost(piece) <= maximumCost) {
      current = piece
      return
    }
    chunks.push(...splitLongToken(piece, maximumCost))
  }

  for (const sentence of sentences) {
    if (mainTextCost(sentence) <= maximumCost) {
      addPiece(sentence)
      continue
    }

    const words = sentence.split(/\s+/u).filter(Boolean)
    if (current) chunks.push(current)
    current = ''
    for (const word of words) {
      addPiece(word)
    }
  }
  if (current) chunks.push(current)
  return chunks.filter(Boolean)
}

function hasEmploymentContent(entry: EmploymentEntry): boolean {
  return [entry.jobTitle, entry.employer, entry.description, entry.achievements]
    .some((value) => value.trim())
}

function hasEducationContent(entry: EducationEntry): boolean {
  return [entry.qualification, entry.institution, entry.description].some(
    (value) => value.trim(),
  )
}

function hasTrainingContent(entry: TrainingCertificateEntry): boolean {
  return [entry.name, entry.issuingOrganisation, entry.credentialId].some(
    (value) => value.trim(),
  )
}

function employmentHeaderCost(entry: EmploymentEntry): number {
  return (
    1 +
    mainTextCost(entry.jobTitle) +
    mainTextCost(
      [
        entry.employer,
        formatLocation(entry.city, entry.country),
      ].filter(Boolean).join(' — '),
    )
  )
}

function buildEmploymentFragments(
  entry: EmploymentEntry,
  entryIndex: number,
): CostedMainFragment[] {
  const headerCost = employmentHeaderCost(entry)
  const maximumDetailCost = Math.max(
    8,
    PAGINATION_MODEL.mainPageCapacity - 6 - headerCost,
  )
  const details = textItems(entry.description, entry.achievements).flatMap(
    (detail) => splitAtSafeBoundaries(detail, maximumDetailCost),
  )

  if (details.length === 0) {
    return [{
      cost: headerCost,
      fragment: {
        key: `employment-${entryIndex}-0`,
        kind: 'employment',
        entry,
        entryIndex,
        details: [],
        continued: false,
      },
      sectionKind: 'employment',
      sectionTitle: 'Employment history',
    }]
  }

  const fragments: CostedMainFragment[] = []
  let current: string[] = []
  let currentCost = headerCost + 2

  const flush = () => {
    if (current.length === 0) return
    fragments.push({
      cost: currentCost,
      fragment: {
        key: `employment-${entryIndex}-${fragments.length}`,
        kind: 'employment',
        entry,
        entryIndex,
        details: current,
        continued: fragments.length > 0,
      },
      sectionKind: 'employment',
      sectionTitle: 'Employment history',
    })
    current = []
    currentCost = headerCost + 2
  }

  for (const detail of details) {
    const detailCost = mainTextCost(detail)
    if (
      current.length > 0 &&
      currentCost + detailCost > PAGINATION_MODEL.mainPageCapacity - 4
    ) {
      flush()
    }
    current.push(detail)
    currentCost += detailCost
  }
  flush()
  return fragments
}

function buildEducationFragments(
  entry: EducationEntry,
  entryIndex: number,
): CostedMainFragment[] {
  const headerCost =
    1 +
    mainTextCost(entry.qualification) +
    mainTextCost(
      [
        entry.institution,
        formatLocation(entry.city, entry.country),
      ].filter(Boolean).join(' — '),
    )
  const descriptions = entry.description.trim()
    ? splitAtSafeBoundaries(
        entry.description.trim(),
        Math.max(8, PAGINATION_MODEL.mainPageCapacity - 6 - headerCost),
      )
    : ['']

  return descriptions.map((description, index) => ({
    cost: headerCost + (description ? mainTextCost(description) : 0) + 2,
    fragment: {
      key: `education-${entryIndex}-${index}`,
      kind: 'education',
      entry,
      entryIndex,
      description,
      continued: index > 0,
    },
    sectionKind: 'education',
    sectionTitle: 'Education & training',
  }))
}

function buildMainFragments(resume: ResumeData): CostedMainFragment[] {
  const fragments: CostedMainFragment[] = []
  if (resume.professionalOverview.trim()) {
    fragments.push({
      cost: mainTextCost(resume.professionalOverview) + 2,
      fragment: {
        key: 'overview-0',
        kind: 'overview',
        text: resume.professionalOverview,
        continued: false,
      },
      sectionKind: 'overview',
      sectionTitle: 'Professional overview',
    })
  }

  resume.employmentHistory.forEach((entry, index) => {
    if (hasEmploymentContent(entry)) {
      fragments.push(...buildEmploymentFragments(entry, index))
    }
  })
  resume.education.forEach((entry, index) => {
    if (hasEducationContent(entry)) {
      fragments.push(...buildEducationFragments(entry, index))
    }
  })
  resume.trainingAndCertificates.forEach((entry, index) => {
    if (!hasTrainingContent(entry)) return
    fragments.push({
      cost:
        1 +
        mainTextCost(entry.name) +
        mainTextCost(
          [entry.issuingOrganisation, entry.credentialId].filter(Boolean).join(' — '),
        ),
      fragment: {
        key: `training-${index}-0`,
        kind: 'training',
        entry,
        entryIndex: index,
      },
      sectionKind: 'training',
      sectionTitle: 'Additional training',
    })
  })
  return fragments
}

function splitEmploymentForAvailableSpace(
  source: CostedMainFragment,
  available: number,
): [CostedMainFragment, CostedMainFragment] | null {
  if (source.fragment.kind !== 'employment') return null
  const { fragment } = source
  if (fragment.details.length < 2) return null

  const baseCost = employmentHeaderCost(fragment.entry) + 2
  let headCost = baseCost
  let splitIndex = 0
  while (splitIndex < fragment.details.length - 1) {
    const detailCost = mainTextCost(fragment.details[splitIndex])
    if (headCost + detailCost > available) break
    headCost += detailCost
    splitIndex += 1
  }
  if (splitIndex === 0) return null

  const headDetails = fragment.details.slice(0, splitIndex)
  const tailDetails = fragment.details.slice(splitIndex)
  const head: CostedMainFragment = {
    ...source,
    cost: headCost,
    fragment: {
      ...fragment,
      details: headDetails,
    },
  }
  const tail: CostedMainFragment = {
    ...source,
    cost:
      baseCost + tailDetails.reduce(
        (total, detail) => total + mainTextCost(detail),
        0,
      ),
    fragment: {
      ...fragment,
      continued: true,
      details: tailDetails,
      key: `${fragment.key}-continued`,
    },
  }
  return [head, tail]
}

function paginateMain(
  fragments: CostedMainFragment[],
): MainSectionSlice[][] {
  const pages: MainSectionSlice[][] = [[]]
  const pageCosts = [0]
  const pending = [...fragments]

  while (pending.length > 0) {
    let source = pending.shift()
    if (!source) break
    let pageIndex = pages.length - 1
    let page = pages[pageIndex]
    let section: MainSectionSlice | undefined = page[page.length - 1]
    const startsSection = section?.kind !== source.sectionKind
    const headingCost = startsSection ? MAIN_SECTION_HEADING_COST : 0

    if (
      pageCosts[pageIndex] > 0 &&
      pageCosts[pageIndex] + headingCost + source.cost >
        PAGINATION_MODEL.mainPageCapacity
    ) {
      const available =
        PAGINATION_MODEL.mainPageCapacity -
        pageCosts[pageIndex] -
        headingCost
      const split = splitEmploymentForAvailableSpace(source, available)
      if (split) {
        source = split[0]
        pending.unshift(split[1])
      } else {
        pages.push([])
        pageCosts.push(0)
        pageIndex += 1
        page = pages[pageIndex]
        section = undefined
      }
    }

    const needsSection = section?.kind !== source.sectionKind
    if (needsSection) {
      section = {
        continued: pages
          .slice(0, pageIndex)
          .some((priorPage) =>
            priorPage.some((priorSection) => priorSection.kind === source.sectionKind),
          ),
        fragments: [],
        key: `${source.sectionKind}-page-${pageIndex + 1}`,
        kind: source.sectionKind,
        title: source.sectionTitle,
      }
      page.push(section)
      pageCosts[pageIndex] += MAIN_SECTION_HEADING_COST
    }

    if (!section) {
      throw new Error('Pagination section was not created.')
    }
    section.fragments.push(source.fragment)
    pageCosts[pageIndex] += source.cost
  }
  return pages
}

function buildContactItems(resume: ResumeData): ContactItem[] {
  const location = formatLocation(
    resume.personalDetails.city,
    resume.personalDetails.country,
  )
  return [
    {
      accessibleText: resume.personalDetails.phone.trim(),
      continued: false,
      href: resume.personalDetails.phone.trim()
        ? `tel:${resume.personalDetails.phone.replace(/\s/g, '')}`
        : '',
      icon: '☎',
      key: 'phone',
      label: 'Phone',
      text: resume.personalDetails.phone.trim(),
    },
    {
      accessibleText: resume.personalDetails.email.trim(),
      continued: false,
      href: resume.personalDetails.email.trim()
        ? `mailto:${resume.personalDetails.email.trim()}`
        : '',
      icon: '✉',
      key: 'email',
      label: 'Email',
      text: resume.personalDetails.email.trim(),
    },
    {
      accessibleText: location,
      continued: false,
      href: '',
      icon: '⌖',
      key: 'location',
      label: 'Location',
      text: location,
    },
    {
      accessibleText: resume.personalDetails.linkedInUrl.trim(),
      continued: false,
      href: safeHttpUrl(resume.personalDetails.linkedInUrl.trim()),
      icon: 'in',
      key: 'linkedin',
      label: 'LinkedIn',
      text: displayHttpUrl(resume.personalDetails.linkedInUrl.trim()),
    },
    {
      accessibleText: resume.personalDetails.portfolioUrl.trim(),
      continued: false,
      href: safeHttpUrl(resume.personalDetails.portfolioUrl.trim()),
      icon: '↗',
      key: 'portfolio',
      label: 'Portfolio',
      text: displayHttpUrl(resume.personalDetails.portfolioUrl.trim()),
    },
  ].filter((item) => item.text)
}

function sidebarTextItems(kind: SidebarTextKind, values: string[]): SidebarTextItem[] {
  return cleanList(values).map((text, index) => ({
    continued: false,
    key: `${kind}-${index}`,
    text,
  }))
}

function buildSidebarSources(resume: ResumeData): SidebarSource[] {
  const sources: SidebarSource[] = [
    {
      items: buildContactItems(resume),
      kind: 'contact',
      title: 'Contact information',
    },
    {
      items: sidebarTextItems('strengths', resume.strengths),
      kind: 'strengths',
      title: 'Core strengths',
    },
    {
      items: sidebarTextItems('technicalSkills', resume.technicalSkills),
      kind: 'technicalSkills',
      title: 'Technical skills',
    },
    {
      items: sidebarTextItems('softSkills', resume.softSkills),
      kind: 'softSkills',
      title: 'Soft skills',
    },
    {
      items: sidebarTextItems(
        'languages',
        resume.languages
          .filter((language) => language.name.trim())
          .map((language) => `${language.name.trim()}: ${language.proficiency}`),
      ),
      kind: 'languages',
      title: 'Language skills',
    },
    {
      items: sidebarTextItems('interests', resume.interests),
      kind: 'interests',
      title: 'Personal interests',
    },
  ]
  return sources.filter((source) => source.items.length > 0)
}

function splitSidebarTextItem(item: SidebarTextItem): SidebarTextItem[] {
  const maximumCharacters =
    (PAGINATION_MODEL.sidebarPageCapacity - 10) *
    PAGINATION_MODEL.sidebarCharactersPerLine
  const characters = Array.from(item.text)
  if (characters.length <= maximumCharacters) return [item]
  const chunks: SidebarTextItem[] = []
  for (let index = 0; index < characters.length; index += maximumCharacters) {
    const fragmentIndex = index / maximumCharacters
    chunks.push({
      continued: item.continued || fragmentIndex > 0,
      key: `${item.key}-${fragmentIndex}`,
      text: characters.slice(index, index + maximumCharacters).join(''),
    })
  }
  return chunks
}

function splitContactItem(item: ContactItem): ContactItem[] {
  const fragments = splitSidebarTextItem(item)
  return fragments.map((fragment) => ({
    accessibleText:
      fragments.length === 1 ? item.accessibleText : fragment.text,
    continued: fragment.continued,
    href: item.href,
    icon: item.icon,
    key: fragment.key,
    label: item.label,
    text: fragment.text,
  }))
}

function appendSidebarSource<T extends ContactItem | SidebarTextItem>(
  pages: SidebarSectionSlice[][],
  costs: number[],
  sourceItems: T[],
  createSlice: (
    items: T[],
    continued: boolean,
    sliceIndex: number,
  ) => SidebarSectionSlice,
): void {
    let remaining = sourceItems
    let continued = false
    let sliceIndex = 0
    while (remaining.length > 0) {
      let pageIndex = pages.length - 1
      let available = PAGINATION_MODEL.sidebarPageCapacity - costs[pageIndex]
      if (available < 5) {
        pages.push([])
        costs.push(7)
        pageIndex += 1
        available = PAGINATION_MODEL.sidebarPageCapacity - costs[pageIndex]
      }

      const slice: T[] = []
      let sliceCost = 3
      while (remaining.length > 0) {
        const item = remaining[0]
        const itemCost = sidebarItemCost(item)
        if (slice.length > 0 && sliceCost + itemCost > available) break
        if (slice.length === 0 && sliceCost + itemCost > available && costs[pageIndex] > 7) {
          break
        }
        slice.push(item)
        remaining = remaining.slice(1)
        sliceCost += itemCost
      }

      if (slice.length === 0) {
        pages.push([])
        costs.push(7)
        continue
      }
      pages[pageIndex].push(createSlice(slice, continued, sliceIndex))
      costs[pageIndex] += sliceCost
      continued = remaining.length > 0
      sliceIndex += 1
    }
}

function paginateSidebar(sources: SidebarSource[]): SidebarSectionSlice[][] {
  const pages: SidebarSectionSlice[][] = [[]]
  const costs = [22]

  for (const source of sources) {
    if (source.kind === 'contact') {
      const items = source.items.flatMap(splitContactItem)
      appendSidebarSource(pages, costs, items, (slice, continued, sliceIndex) => ({
        continued,
        items: slice,
        key: `${source.kind}-${sliceIndex}`,
        kind: source.kind,
        title: source.title,
      }))
    } else {
      const items = source.items.flatMap(splitSidebarTextItem)
      appendSidebarSource(pages, costs, items, (slice, continued, sliceIndex) => ({
        continued,
        items: slice,
        key: `${source.kind}-${sliceIndex}`,
        kind: source.kind,
        title: source.title,
      }))
    }
  }
  return pages
}

function selectShortenCandidate(resume: ResumeData): ShortenCandidate | null {
  const candidates: ShortenCandidate[] = []
  if (resume.professionalOverview.trim()) {
    candidates.push({
      fieldType: 'professionalOverview',
      index: null,
      kind: 'professionalOverview',
      label: 'professional overview',
      text: resume.professionalOverview,
    })
  }
  resume.employmentHistory.forEach((entry, index) => {
    if (entry.description.trim()) {
      candidates.push({
        fieldType: 'employmentResponsibilities',
        index,
        kind: 'employmentResponsibilities',
        label: `role ${index + 1} responsibilities`,
        text: entry.description,
      })
    }
    if (entry.achievements.trim()) {
      candidates.push({
        fieldType: 'employmentAchievements',
        index,
        kind: 'employmentAchievements',
        label: `role ${index + 1} achievements`,
        text: entry.achievements,
      })
    }
  })
  resume.education.forEach((entry, index) => {
    if (entry.description.trim()) {
      candidates.push({
        fieldType: 'educationAchievements',
        index,
        kind: 'educationAchievements',
        label: `education entry ${index + 1} achievements`,
        text: entry.description,
      })
    }
  })
  return candidates.reduce<ShortenCandidate | null>(
    (longest, candidate) =>
      longest === null || candidate.text.length > longest.text.length
        ? candidate
        : longest,
    null,
  )
}

function hasVisibleResumeContent(resume: ResumeData): boolean {
  const personalValues = Object.values(resume.personalDetails)
  return (
    personalValues.some((value) => value.trim().length > 0) ||
    resume.photograph !== null ||
    resume.professionalOverview.trim().length > 0 ||
    cleanList(resume.strengths).length > 0 ||
    cleanList(resume.technicalSkills).length > 0 ||
    cleanList(resume.softSkills).length > 0 ||
    cleanList(resume.interests).length > 0 ||
    resume.languages.some((language) => language.name.trim().length > 0) ||
    resume.employmentHistory.some(hasEmploymentContent) ||
    resume.education.some(hasEducationContent) ||
    resume.trainingAndCertificates.some(hasTrainingContent)
  )
}

export function paginateResume(resume: ResumeData): PaginationResult {
  const mainPages = paginateMain(buildMainFragments(resume))
  const sidebarPages = paginateSidebar(buildSidebarSources(resume))
  const pageCount = Math.max(1, mainPages.length, sidebarPages.length)
  const pages = Array.from({ length: pageCount }, (_, index) => ({
    key: `page-${index + 1}`,
    mainSections: mainPages[index] ?? [],
    pageNumber: index + 1,
    sidebarContinued: index > 0,
    sidebarSections: sidebarPages[index] ?? [],
  }))
  const fitStatus = !hasVisibleResumeContent(resume)
    ? 'empty'
    : pageCount > 1
      ? 'multiple'
      : 'single'
  const warnings =
    fitStatus === 'multiple'
      ? [
          `Your resume currently uses ${pageCount} A4 pages. Review each continuation page before printing.`,
        ]
      : fitStatus === 'single'
        ? ['Your resume fits on one A4 page.']
        : ['Add resume content to see its A4 page fit.']

  return {
    fitStatus,
    pages,
    shortenCandidate:
      pageCount > 1 ? selectShortenCandidate(resume) : null,
    warnings,
  }
}
