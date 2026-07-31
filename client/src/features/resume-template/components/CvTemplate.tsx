import { useState } from 'react'
import type {
  EducationEntry,
  EmploymentEntry,
  MonthYear,
  PhotographData,
  ResumeData,
  TrainingCertificateEntry,
} from '../../../shared/resume'
import { CvMainSection, CvSidebarSection } from './CvSections'
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

function formatLocation(...parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(', ')
}

function displayUrl(value: string): string {
  return value.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function safeHttpUrl(value: string): string {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : ''
  } catch {
    return ''
  }
}

function textItems(...values: string[]): string[] {
  return values.flatMap((value) =>
    value
      .split(/\r?\n/)
      .map((item) => item.replace(/^[•*-]\s*/, '').trim())
      .filter(Boolean),
  )
}

function cleanList(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean)
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

function keysByContent<T>(entries: T[]): string[] {
  const occurrences = new Map<string, number>()
  return entries.map((entry) => {
    const content = JSON.stringify(entry)
    const occurrence = (occurrences.get(content) ?? 0) + 1
    occurrences.set(content, occurrence)
    return `${content}#${occurrence}`
  })
}

function CvEmploymentEntry({ entry }: { entry: EmploymentEntry }) {
  const details = textItems(entry.description, entry.achievements)
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
            {entry.jobTitle.trim() && <h3>{entry.jobTitle}</h3>}
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

function CvEducationEntry({ entry }: { entry: EducationEntry }) {
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
            {entry.qualification.trim() && <h3>{entry.qualification}</h3>}
            {institutionLocation && (
              <p className="cv-entry__organisation">{institutionLocation}</p>
            )}
          </div>
        )}
        <p className="cv-entry__date">
          {formatRange(entry.startDate, entry.endDate, entry.currentlyStudying)}
        </p>
      </div>
      {entry.description && (
        <p className="cv-entry__description">{entry.description}</p>
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

function SidebarList({ items }: { items: string[] }) {
  const visibleItems = cleanList(items)
  const itemKeys = keysByContent(visibleItems)

  return (
    <ul className="cv-sidebar-list">
      {visibleItems.map((item, index) => (
        <li key={itemKeys[index]}>{item}</li>
      ))}
    </ul>
  )
}

export function CvTemplate({ resume }: { resume: ResumeData }) {
  const fullName = fullNameFrom(
    resume.personalDetails.firstName,
    resume.personalDetails.lastName,
  )
  const initials = initialsFrom(
    resume.personalDetails.firstName,
    resume.personalDetails.lastName,
  )
  const location = formatLocation(
    resume.personalDetails.city,
    resume.personalDetails.country,
  )
  const employment = resume.employmentHistory.filter(hasEmploymentContent)
  const education = resume.education.filter(hasEducationContent)
  const training = resume.trainingAndCertificates.filter(hasTrainingContent)
  const employmentKeys = keysByContent(employment)
  const educationKeys = keysByContent(education)
  const trainingKeys = keysByContent(training)
  const strengths = cleanList(resume.strengths)
  const technicalSkills = cleanList(resume.technicalSkills)
  const softSkills = cleanList(resume.softSkills)
  const languages = resume.languages
    .filter((language) => language.name.trim())
    .map((language) => `${language.name.trim()}: ${language.proficiency}`)
  const interests = cleanList(resume.interests)
  const contactItems = [
    {
      href: resume.personalDetails.phone.trim()
        ? `tel:${resume.personalDetails.phone.replace(/\s/g, '')}`
        : '',
      icon: '☎',
      label: 'Phone',
      value: resume.personalDetails.phone.trim(),
    },
    {
      href: resume.personalDetails.email.trim()
        ? `mailto:${resume.personalDetails.email.trim()}`
        : '',
      icon: '✉',
      label: 'Email',
      value: resume.personalDetails.email.trim(),
    },
    {
      href: '',
      icon: '⌖',
      label: 'Location',
      value: location,
    },
    {
      href: safeHttpUrl(resume.personalDetails.linkedInUrl.trim()),
      icon: 'in',
      label: 'LinkedIn',
      value: resume.personalDetails.linkedInUrl.trim(),
    },
    {
      href: safeHttpUrl(resume.personalDetails.portfolioUrl.trim()),
      icon: '↗',
      label: 'Portfolio',
      value: resume.personalDetails.portfolioUrl.trim(),
    },
  ].filter((item) => item.value)

  return (
    <article
      aria-label={`${fullName || 'Resume'} CV`}
      className="cv-template-page"
      data-testid="cv-template"
    >
      <aside className="cv-template-sidebar">
        <div className="cv-identity">
          <CvPortrait
            fullName={fullName}
            initials={initials}
            key={resume.photograph?.url || 'photograph-placeholder'}
            photograph={resume.photograph}
          />
          <h1>{fullName || 'Your name'}</h1>
          <p>{resume.personalDetails.professionalTitle || 'Professional title'}</p>
        </div>

        {contactItems.length > 0 && (
          <CvSidebarSection title="Contact information">
            <address className="cv-contact-list">
              {contactItems.map((item) => (
                <p key={item.label}>
                  <span aria-hidden="true" className="cv-contact-list__icon">
                    {item.icon}
                  </span>
                  <span className="sr-only">{item.label}: </span>
                  {item.href ? (
                    <a
                      aria-label={`${item.label}: ${item.value}`}
                      href={item.href}
                    >
                      {item.value.startsWith('http')
                        ? displayUrl(item.value)
                        : item.value}
                    </a>
                  ) : (
                    item.value
                  )}
                </p>
              ))}
            </address>
          </CvSidebarSection>
        )}

        {strengths.length > 0 && (
          <CvSidebarSection title="Core strengths">
            <SidebarList items={strengths} />
          </CvSidebarSection>
        )}

        {technicalSkills.length > 0 && (
          <CvSidebarSection title="Technical skills">
            <SidebarList items={technicalSkills} />
          </CvSidebarSection>
        )}

        {softSkills.length > 0 && (
          <CvSidebarSection title="Soft skills">
            <SidebarList items={softSkills} />
          </CvSidebarSection>
        )}

        {languages.length > 0 && (
          <CvSidebarSection title="Language skills">
            <SidebarList items={languages} />
          </CvSidebarSection>
        )}

        {interests.length > 0 && (
          <CvSidebarSection title="Personal interests">
            <SidebarList items={interests} />
          </CvSidebarSection>
        )}
      </aside>

      <div className="cv-template-main">
        {resume.professionalOverview.trim() && (
          <CvMainSection title="Professional overview">
            <p className="cv-overview">{resume.professionalOverview}</p>
          </CvMainSection>
        )}

        {employment.length > 0 && (
          <CvMainSection title="Employment history">
            <div className="cv-entry-list">
              {employment.map((entry, index) => (
                <CvEmploymentEntry
                  entry={entry}
                  key={employmentKeys[index]}
                />
              ))}
            </div>
          </CvMainSection>
        )}

        {education.length > 0 && (
          <CvMainSection title="Education & training">
            <div className="cv-entry-list cv-entry-list--compact">
              {education.map((entry, index) => (
                <CvEducationEntry
                  entry={entry}
                  key={educationKeys[index]}
                />
              ))}
            </div>
          </CvMainSection>
        )}

        {training.length > 0 && (
          <CvMainSection title="Additional training">
            <div className="cv-entry-list cv-entry-list--compact">
              {training.map((entry, index) => (
                <CvTrainingEntry
                  entry={entry}
                  key={trainingKeys[index]}
                />
              ))}
            </div>
          </CvMainSection>
        )}
      </div>
    </article>
  )
}
