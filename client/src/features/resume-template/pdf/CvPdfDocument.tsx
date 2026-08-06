import {
  Document,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  type DocumentProps,
} from '@react-pdf/renderer'
import type { ReactElement } from 'react'
import type {
  EducationEntry,
  EmploymentEntry,
  MonthYear,
  ResumeData,
  TrainingCertificateEntry,
} from '../../../shared/resume'
import type {
  ContactItem,
  CvPageModel,
  MainFragment,
  PaginationResult,
  SidebarSectionSlice,
} from '../pagination'
import { PDF_FONT_FAMILY } from './pdfFonts'
import {
  PDF_A4_HEIGHT,
  PDF_A4_WIDTH,
  PDF_MAIN_PADDING_BOTTOM,
  PDF_MAIN_PADDING_HORIZONTAL,
  PDF_MAIN_PADDING_TOP,
  PDF_MAIN_WIDTH,
  PDF_SIDEBAR_PADDING_BOTTOM,
  PDF_SIDEBAR_PADDING_HORIZONTAL,
  PDF_SIDEBAR_PADDING_TOP,
  PDF_SIDEBAR_WIDTH,
} from './pdfGeometry'

export interface PdfLayoutBox {
  height: number
  left?: number
  top?: number
  width: number
}

export interface PdfLayoutNode {
  box?: PdfLayoutBox
  children?: PdfLayoutNode[]
}

export interface PdfLayoutDocument extends PdfLayoutNode {
  children: PdfLayoutNode[]
}

const NAVY = '#1f2a44'
const ACCENT = '#4fa1d1'
const INK = '#0f0f12'
const COPY = '#40454d'
const SIDEBAR_COPY = '#ebf0f7'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    color: COPY,
    flexDirection: 'row',
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 8,
    height: PDF_A4_HEIGHT,
    maxHeight: PDF_A4_HEIGHT,
    minHeight: PDF_A4_HEIGHT,
    width: PDF_A4_WIDTH,
  },
  pageContent: {
    flexDirection: 'row',
    height: PDF_A4_HEIGHT,
    maxHeight: PDF_A4_HEIGHT,
    minHeight: PDF_A4_HEIGHT,
    width: PDF_A4_WIDTH,
  },
  sidebar: {
    backgroundColor: NAVY,
    color: SIDEBAR_COPY,
    flexShrink: 0,
    height: PDF_A4_HEIGHT,
    paddingBottom: PDF_SIDEBAR_PADDING_BOTTOM,
    paddingHorizontal: PDF_SIDEBAR_PADDING_HORIZONTAL,
    paddingTop: PDF_SIDEBAR_PADDING_TOP,
    width: PDF_SIDEBAR_WIDTH,
  },
  identity: {
    alignItems: 'center',
    flexShrink: 0,
    marginBottom: 18,
    textAlign: 'center',
  },
  identityContinued: {
    alignItems: 'flex-start',
    flexShrink: 0,
    marginBottom: 14,
    textAlign: 'left',
  },
  portrait: {
    borderColor: '#ffffff',
    borderRadius: 48,
    borderWidth: 2,
    height: 96,
    marginBottom: 12,
    objectFit: 'cover',
    width: 96,
  },
  portraitFallback: {
    alignItems: 'center',
    backgroundColor: '#e7eef8',
    borderColor: '#ffffff',
    borderRadius: 48,
    borderWidth: 2,
    height: 96,
    justifyContent: 'center',
    marginBottom: 12,
    width: 96,
  },
  portraitInitials: {
    color: NAVY,
    fontSize: 21,
    fontWeight: 700,
  },
  name: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 1.12,
    marginBottom: 4,
  },
  professionalTitle: {
    color: ACCENT,
    fontSize: 9.5,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  continuationLabel: {
    color: SIDEBAR_COPY,
    fontSize: 7,
    fontWeight: 500,
    letterSpacing: 0.6,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  sidebarSection: {
    flexShrink: 0,
    marginBottom: 13,
  },
  sidebarHeading: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1.15,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  sidebarItem: {
    color: SIDEBAR_COPY,
    flexShrink: 0,
    fontSize: 8.2,
    fontWeight: 500,
    lineHeight: 1.3,
    marginBottom: 2,
    textDecoration: 'none',
  },
  contactRow: {
    flexDirection: 'row',
    flexShrink: 0,
    marginBottom: 2,
  },
  contactIcon: {
    color: ACCENT,
    fontSize: 7,
    fontWeight: 700,
    width: 13,
  },
  listRow: {
    flexDirection: 'row',
    flexShrink: 0,
  },
  bullet: {
    color: ACCENT,
    fontSize: 8.2,
    width: 9,
  },
  main: {
    color: COPY,
    flexShrink: 0,
    height: PDF_A4_HEIGHT,
    paddingBottom: PDF_MAIN_PADDING_BOTTOM,
    paddingHorizontal: PDF_MAIN_PADDING_HORIZONTAL,
    paddingTop: PDF_MAIN_PADDING_TOP,
    width: PDF_MAIN_WIDTH,
  },
  mainSection: {
    flexShrink: 0,
    marginBottom: 17,
  },
  mainHeading: {
    color: INK,
    fontSize: 11.5,
    fontWeight: 700,
    lineHeight: 1.15,
    marginBottom: 9,
    textTransform: 'uppercase',
  },
  overview: {
    color: COPY,
    flexShrink: 0,
    fontSize: 8.6,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  entry: {
    flexShrink: 0,
    marginBottom: 11,
  },
  compactEntry: {
    flexShrink: 0,
    marginBottom: 8,
  },
  entryHeading: {
    flexDirection: 'row',
    flexShrink: 0,
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  entryHeadingCopy: {
    flexShrink: 1,
    paddingRight: 8,
  },
  entryTitle: {
    color: INK,
    fontSize: 9.5,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  organisation: {
    color: COPY,
    fontSize: 8,
    lineHeight: 1.2,
    marginTop: 2,
  },
  date: {
    color: COPY,
    flexShrink: 0,
    fontSize: 8,
    lineHeight: 1.2,
    textAlign: 'right',
  },
  detail: {
    color: COPY,
    flexShrink: 0,
    fontSize: 8.8,
    fontWeight: 500,
    lineHeight: 1.34,
    marginTop: 5,
  },
  credentialLink: {
    color: COPY,
    fontSize: 8,
    textDecoration: 'none',
  },
  sidebarOnlyNote: {
    color: COPY,
    fontSize: 8,
  },
})

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

function formatMonthYear(value: MonthYear): string {
  const month = MONTHS[value.month - 1]
  return month ? `${month} ${value.year}` : String(value.year)
}

function formatRange(
  startDate: MonthYear,
  endDate: MonthYear | null,
  current: boolean,
): string {
  const end = current
    ? 'Present'
    : endDate
      ? formatMonthYear(endDate)
      : ''
  return [formatMonthYear(startDate), end].filter(Boolean).join(' - ')
}

function cleanName(resume: ResumeData): string {
  return [resume.personalDetails.firstName, resume.personalDetails.lastName]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ')
}

function initials(resume: ResumeData): string {
  const names = cleanName(resume).split(/\s+/).filter(Boolean)
  if (names.length === 0) return 'CV'
  if (names.length === 1) return names[0].slice(0, 2).toUpperCase()
  return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
}

function location(...parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(', ')
}

function safeHttpUrl(value: string): string {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? value
      : ''
  } catch {
    return ''
  }
}

function contactIcon(item: ContactItem): string {
  if (item.key.startsWith('phone')) return 'T'
  if (item.key.startsWith('email')) return 'E'
  if (item.key.startsWith('location')) return 'L'
  if (item.key.startsWith('linkedin')) return 'in'
  return 'W'
}

function PdfSidebarSection({ section }: { section: SidebarSectionSlice }) {
  return (
    <View style={styles.sidebarSection}>
      <Text style={styles.sidebarHeading}>
        {section.title}{section.continued ? ' (continued)' : ''}
      </Text>
      {section.kind === 'contact'
        ? section.items.map((item) => (
            <View key={item.key} style={styles.contactRow}>
              <Text style={styles.contactIcon}>
                {item.continued ? '' : contactIcon(item)}
              </Text>
              {item.href ? (
                <Link src={item.href} style={styles.sidebarItem}>
                  {item.text}
                </Link>
              ) : (
                <Text style={styles.sidebarItem}>{item.text}</Text>
              )}
            </View>
          ))
        : section.items.map((item) => (
            <View key={item.key} style={styles.listRow}>
              <Text style={styles.bullet}>{item.continued ? '' : '•'}</Text>
              <Text style={styles.sidebarItem}>{item.text}</Text>
            </View>
          ))}
    </View>
  )
}

function PdfEmployment({ fragment }: { fragment: Extract<MainFragment, { kind: 'employment' }> }) {
  const entry: EmploymentEntry = fragment.entry
  const organisation = [entry.employer, location(entry.city, entry.country)]
    .filter(Boolean)
    .join(' - ')
  return (
    <View style={styles.entry}>
      <View style={styles.entryHeading}>
        <View style={styles.entryHeadingCopy}>
          {entry.jobTitle.trim() ? (
            <Text style={styles.entryTitle}>
              {entry.jobTitle}{fragment.continued ? ' (continued)' : ''}
            </Text>
          ) : null}
          {organisation ? <Text style={styles.organisation}>{organisation}</Text> : null}
        </View>
        <Text style={styles.date}>
          {formatRange(entry.startDate, entry.endDate, entry.currentlyWorkingHere)}
        </Text>
      </View>
      {fragment.details.length > 0 ? (
        <Text style={styles.detail}>
          {fragment.details.map((detail) => `• ${detail}`).join('\n')}
        </Text>
      ) : null}
    </View>
  )
}

function PdfEducation({ fragment }: { fragment: Extract<MainFragment, { kind: 'education' }> }) {
  const entry: EducationEntry = fragment.entry
  const organisation = [entry.institution, location(entry.city, entry.country)]
    .filter(Boolean)
    .join(' - ')
  return (
    <View style={styles.compactEntry}>
      <View style={styles.entryHeading}>
        <View style={styles.entryHeadingCopy}>
          {entry.qualification.trim() ? (
            <Text style={styles.entryTitle}>
              {entry.qualification}{fragment.continued ? ' (continued)' : ''}
            </Text>
          ) : null}
          {organisation ? <Text style={styles.organisation}>{organisation}</Text> : null}
        </View>
        <Text style={styles.date}>
          {formatRange(entry.startDate, entry.endDate, entry.currentlyStudying)}
        </Text>
      </View>
      {fragment.description ? (
        <Text style={styles.detail}>{fragment.description}</Text>
      ) : null}
    </View>
  )
}

function trainingDate(entry: TrainingCertificateEntry): string {
  if (entry.inProgress) return 'In progress'
  return entry.completionDate ? formatMonthYear(entry.completionDate) : ''
}

function PdfTraining({ fragment }: { fragment: Extract<MainFragment, { kind: 'training' }> }) {
  const entry = fragment.entry
  const credentialUrl = safeHttpUrl(entry.credentialUrl.trim())
  const credentialText = entry.credentialId
    ? `Credential ${entry.credentialId}`
    : entry.name
  return (
    <View style={styles.compactEntry}>
      <View style={styles.entryHeading}>
        <View style={styles.entryHeadingCopy}>
          {entry.name.trim() ? <Text style={styles.entryTitle}>{entry.name}</Text> : null}
          {entry.issuingOrganisation ? (
            <Text style={styles.organisation}>{entry.issuingOrganisation}</Text>
          ) : null}
          {entry.credentialId ? (
            credentialUrl ? (
              <Link src={credentialUrl} style={styles.credentialLink}>
                {credentialText}
              </Link>
            ) : (
              <Text style={styles.organisation}>{credentialText}</Text>
            )
          ) : credentialUrl ? (
            <Link src={credentialUrl} style={styles.credentialLink}>
              View credential
            </Link>
          ) : null}
        </View>
        <Text style={styles.date}>{trainingDate(entry)}</Text>
      </View>
    </View>
  )
}

function PdfFragment({ fragment }: { fragment: MainFragment }) {
  switch (fragment.kind) {
    case 'overview':
      return <Text style={styles.overview}>{fragment.text}</Text>
    case 'employment':
      return <PdfEmployment fragment={fragment} />
    case 'education':
      return <PdfEducation fragment={fragment} />
    case 'training':
      return <PdfTraining fragment={fragment} />
  }
}

function PdfPageContent({
  page,
  photograph,
  resume,
}: {
  page: CvPageModel
  photograph?: string
  resume: ResumeData
}) {
  const fullName = cleanName(resume)
  return (
    <>
      <View style={styles.sidebar}>
        <View style={page.sidebarContinued ? styles.identityContinued : styles.identity}>
          {!page.sidebarContinued ? (
            photograph ? (
              <Image src={photograph} style={styles.portrait} />
            ) : (
              <View style={styles.portraitFallback}>
                <Text style={styles.portraitInitials}>{initials(resume)}</Text>
              </View>
            )
          ) : null}
          <Text style={styles.name}>{fullName || 'Your name'}</Text>
          <Text style={styles.professionalTitle}>
            {resume.personalDetails.professionalTitle || 'Professional title'}
          </Text>
          {page.sidebarContinued ? (
            <Text style={styles.continuationLabel}>CV continued</Text>
          ) : null}
        </View>
        {page.sidebarSections.map((section) => (
          <PdfSidebarSection key={section.key} section={section} />
        ))}
      </View>
      <View style={styles.main}>
        {page.mainSections.map((section) => (
          <View key={section.key} style={styles.mainSection}>
            <Text style={styles.mainHeading}>
              {section.title}{section.continued ? ' (continued)' : ''}
            </Text>
            {section.fragments.map((fragment) => (
              <PdfFragment key={fragment.key} fragment={fragment} />
            ))}
          </View>
        ))}
        {page.mainSections.length === 0 && page.pageNumber > 1 ? (
          <Text style={styles.sidebarOnlyNote}>
            Sidebar information continued from the previous page.
          </Text>
        ) : null}
      </View>
    </>
  )
}

export function CvPdfDocument({
  onLayout,
  pagination,
  photograph,
  resume,
}: {
  onLayout?: (layout: PdfLayoutDocument) => void
  pagination: PaginationResult
  photograph?: string
  resume: ResumeData
}): ReactElement<DocumentProps> {
  const handleRender = (props: unknown) => {
    const layout = (props as { _INTERNAL__LAYOUT__DATA_?: PdfLayoutDocument })
      ._INTERNAL__LAYOUT__DATA_
    if (layout) onLayout?.(layout)
  }
  return (
    <Document
      author={cleanName(resume)}
      creator="AI Resume Assistant"
      language="en"
      onRender={handleRender as DocumentProps['onRender']}
      producer="AI Resume Assistant"
      title={`${cleanName(resume) || 'Resume'} CV`}
    >
      {pagination.pages.map((page) => (
        <Page key={page.key} size="A4" style={styles.page} wrap={false}>
          <View style={styles.pageContent}>
            <PdfPageContent page={page} photograph={photograph} resume={resume} />
          </View>
        </Page>
      ))}
    </Document>
  )
}
