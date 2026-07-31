import type { ReactNode } from 'react'

interface CvSectionProps {
  children: ReactNode
  className?: string
  title: string
}

export function CvSidebarSection({
  children,
  className = '',
  title,
}: CvSectionProps) {
  return (
    <section className={`cv-sidebar-section ${className}`.trim()}>
      <h2 className="cv-sidebar-section__title">{title}</h2>
      <div className="cv-sidebar-section__content">{children}</div>
    </section>
  )
}

export function CvMainSection({
  children,
  className = '',
  title,
}: CvSectionProps) {
  return (
    <section className={`cv-main-section ${className}`.trim()}>
      <h2 className="cv-main-section__title">{title}</h2>
      <div className="cv-main-section__content">{children}</div>
    </section>
  )
}
