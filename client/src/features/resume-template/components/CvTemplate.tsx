import { useMemo, useState } from 'react'
import type {
  EducationEntry,
  EmploymentEntry,
  MonthYear,
  PhotographData,
  ResumeData,
  TrainingCertificateEntry,
} from '../../../shared/resume'
import { CvMainSection, CvSidebarSection } from './CvSections'
import {
  paginateResume,
  type ContactItem,
  type MainFragment,
  type MainSectionSlice,
  type PaginationResult,
  type SidebarSectionSlice,
  type SidebarTextItem,
} from '../pagination'
import '../styles/cv-template.css'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
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
  return [formatMonthYear(startDate), end].filter(Boolean).join(' – ')
}

function fullNameFrom(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim().split(/\s+/).filter(Boolean).join(' ')
}

function initialsFrom(firstName: string, lastName: string): string {
  const names = `${firstName} ${lastName}`.trim().split(/\s+/).filter(Boolean)
  if (names.length === 0) return 'CV'
  if (names.length === 1) return names[0].slice(0, 2).toUpperCase()
  return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
}

function supportedPhotographUrl(value: string): boolean {
  const url = value.trim()
  if (
    /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i.test(url)
  ) {
    return true
  }

  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'http:' ||
      parsed.protocol === 'https:' ||
      (parsed.protocol === 'blob:' && parsed.pathname.length > 0)
    )
  } catch {
    return false
  }
}

function CvPortrait({
  fullName,
  initials,
  photograph,
}: {
  fullName: string
  initials: string
  photograph: PhotographData | null
}) {
  const [failed, setFailed] = useState(false)
  const canRender =
    photograph !== null &&
    supportedPhotographUrl(photograph.url) &&
    !failed

  return (
    <div className="cv-portrait">
      {canRender ? (
        <img
          alt={
            photograph.altText ||
            `Professional portrait of ${fullName || 'the candidate'}`
          }
          onError={() => setFailed(true)}
          src={photograph.url}
        />
      ) : (
        <span aria-label="Photograph placeholder">{initials}</span>
      )}
    </div>
  )
}

function formatLocation(...parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(', ')
}

function CvEmploymentEntry({
  continued,
  details,
  entry,
}: {
  continued: boolean
  details: string[]
  entry: EmploymentEntry
}) {
  const employerLocation = [
    entry.employer,
    formatLocation(entry.city, entry.country),
  ]
    .filter(Boolean)
    .join(' — ')

  return (
    <article className="cv-entry">
      <div className="cv-entry__heading">
        {(entry.jobTitle.trim() || employerLocation) && (
          <div>
            {entry.jobTitle.trim() && (
              <h3>
                {entry.jobTitle}
                {continued && ' (continued)'}
              </h3>
            )}
            {employerLocation && (
              <p className="cv-entry__organisation">{employerLocation}</p>
            )}
          </div>
        )}
        <p className="cv-entry__date">
          {formatRange(
            entry.startDate,
            entry.endDate,
            entry.currentlyWorkingHere,
          )}
        </p>
      </div>
      {details.length > 0 && (
        <ul className="cv-entry__details">
          {details.map((detail, index) => (
            <li key={`${detail}-${index}`}>{detail}</li>
          ))}
        </ul>
      )}
    </article>
  )
}

function CvEducationEntry({
  continued,
  description,
  entry,
}: {
  continued: boolean
  description: string
  entry: EducationEntry
}) {
  const institutionLocation = [
    entry.institution,
    formatLocation(entry.city, entry.country),
  ]
    .filter(Boolean)
    .join(' — ')

  return (
    <article className="cv-entry cv-entry--compact">
      <div className="cv-entry__heading">
        {(entry.qualification.trim() || institutionLocation) && (
          <div>
            {entry.qualification.trim() && (
              <h3>
                {entry.qualification}
                {continued && ' (continued)'}
              </h3>
            )}
            {institutionLocation && (
              <p className="cv-entry__organisation">{institutionLocation}</p>
            )}
          </div>
        )}
        <p className="cv-entry__date">
          {formatRange(entry.startDate, entry.endDate, entry.currentlyStudying)}
        </p>
      </div>
      {description && (
        <p className="cv-entry__description">{description}</p>
      )}
    </article>
  )
}

function trainingDate(entry: TrainingCertificateEntry): string {
  if (entry.inProgress) return 'In progress'
  return entry.completionDate ? formatMonthYear(entry.completionDate) : ''
}

function CvTrainingEntry({ entry }: { entry: TrainingCertificateEntry }) {
  const date = trainingDate(entry)
  const metadata = [
    entry.issuingOrganisation,
    entry.credentialId ? `Credential ${entry.credentialId}` : '',
  ]
    .filter(Boolean)
    .join(' — ')

  return (
    <article className="cv-entry cv-entry--compact">
      <div className="cv-entry__heading">
        <div>
          {entry.name.trim() && <h3>{entry.name}</h3>}
          {metadata && <p className="cv-entry__organisation">{metadata}</p>}
        </div>
        {date && <p className="cv-entry__date">{date}</p>}
      </div>
    </article>
  )
}

function SidebarList({ items }: { items: SidebarTextItem[] }) {
  return (
    <ul className="cv-sidebar-list">
      {items.map((item) => (
        <li
          className={item.continued ? 'cv-sidebar-list__continuation' : ''}
          key={item.key}
        >
          {item.text}
        </li>
      ))}
    </ul>
  )
}

function ContactList({ items }: { items: ContactItem[] }) {
  return (
    <address className="cv-contact-list">
      {items.map((item) => (
        <p key={item.key}>
          <span aria-hidden="true" className="cv-contact-list__icon">
            {item.continued ? '' : item.icon}
          </span>
          <span className="sr-only">
            {item.label}{item.continued ? ' continued' : ''}:{' '}
          </span>
          {item.href ? (
            <a
              aria-label={`${item.label}${item.continued ? ' continued' : ''}: ${item.accessibleText}`}
              href={item.href}
            >
              {item.text}
            </a>
          ) : (
            item.text
          )}
        </p>
      ))}
    </address>
  )
}

function SidebarSection({ section }: { section: SidebarSectionSlice }) {
  const title = `${section.title}${section.continued ? ' (continued)' : ''}`
  return (
    <CvSidebarSection title={title}>
      {section.kind === 'contact' ? (
        <ContactList items={section.items} />
      ) : (
        <SidebarList items={section.items} />
      )}
    </CvSidebarSection>
  )
}

function MainFragmentContent({ fragment }: { fragment: MainFragment }) {
  switch (fragment.kind) {
    case 'overview':
      return <p className="cv-overview">{fragment.text}</p>
    case 'employment':
      return (
        <CvEmploymentEntry
          continued={fragment.continued}
          details={fragment.details}
          entry={fragment.entry}
        />
      )
    case 'education':
      return (
        <CvEducationEntry
          continued={fragment.continued}
          description={fragment.description}
          entry={fragment.entry}
        />
      )
    case 'training':
      return <CvTrainingEntry entry={fragment.entry} />
  }
}

function sectionListClass(kind: MainSectionSlice['kind']): string {
  if (kind === 'overview') return ''
  return kind === 'employment'
    ? 'cv-entry-list'
    : 'cv-entry-list cv-entry-list--compact'
}

export function CvTemplate({
  pagination,
  resume,
}: {
  pagination?: PaginationResult
  resume: ResumeData
}) {
  const fullName = fullNameFrom(
    resume.personalDetails.firstName,
    resume.personalDetails.lastName,
  )
  const initials = initialsFrom(
    resume.personalDetails.firstName,
    resume.personalDetails.lastName,
  )
  const result = useMemo(
    () => pagination ?? paginateResume(resume),
    [pagination, resume],
  )

  return (
    <article
      aria-label={`${fullName || 'Resume'} CV`}
      className="cv-template-document"
      data-testid="cv-template"
    >
      {result.pages.map((page) => (
        <section
          aria-label={`Page ${page.pageNumber} of ${result.pages.length}`}
          className="cv-template-page"
          data-testid="cv-template-page"
          key={page.key}
        >
          <aside
            aria-label={
              page.sidebarContinued
                ? `CV sidebar, page ${page.pageNumber}`
                : 'CV sidebar'
            }
            className="cv-template-sidebar"
          >
            <div
              className={
                page.sidebarContinued
                  ? 'cv-identity cv-identity--continued'
                  : 'cv-identity'
              }
            >
              {!page.sidebarContinued && (
                <CvPortrait
                  fullName={fullName}
                  initials={initials}
                  key={resume.photograph?.url || 'photograph-placeholder'}
                  photograph={resume.photograph}
                />
              )}
              {page.sidebarContinued ? (
                <p className="cv-identity__continued-name">
                  {fullName || 'Your name'}
                </p>
              ) : (
                <h1>{fullName || 'Your name'}</h1>
              )}
              <p className="cv-identity__title">
                {resume.personalDetails.professionalTitle ||
                  'Professional title'}
              </p>
              {page.sidebarContinued && (
                <span aria-hidden="true" className="cv-continuation-label">
                  CV continued
                </span>
              )}
            </div>
            {page.sidebarSections.map((section) => (
              <SidebarSection
                key={section.key}
                section={section}
              />
            ))}
          </aside>

          <div className="cv-template-main">
            {page.mainSections.map((section) => (
              <CvMainSection
                key={section.key}
                title={`${section.title}${section.continued ? ' (continued)' : ''}`}
              >
                <div className={sectionListClass(section.kind)}>
                  {section.fragments.map((fragment) => (
                    <MainFragmentContent
                      fragment={fragment}
                      key={fragment.key}
                    />
                  ))}
                </div>
              </CvMainSection>
            ))}
            {page.mainSections.length === 0 && page.pageNumber > 1 && (
              <p className="cv-main-continuation-note">
                Sidebar information continued from the previous page.
              </p>
            )}
          </div>
        </section>
      ))}
    </article>
  )
}
