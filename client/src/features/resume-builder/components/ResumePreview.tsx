import type { ResumeData } from '../../../shared/resume'

export function ResumePreview({ resume }: { resume: ResumeData }) {
  const fullName = `${resume.personalDetails.firstName} ${resume.personalDetails.lastName}`.trim()
  return (
    <aside
      aria-label="Live resume preview"
      className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:min-h-[34rem]"
    >
      <p className="text-xs font-bold tracking-[0.16em] text-purple-800">
        LIVE RESUME PREVIEW
      </p>
      {resume.photograph && (
        <img
          alt={resume.photograph.altText || 'Uploaded resume photograph'}
          className="mt-5 size-20 rounded-xl object-cover"
          src={resume.photograph.url}
        />
      )}
      <h2 className="mt-5 text-2xl font-bold text-slate-950">
        {fullName || 'Your name'}
      </h2>
      <p className="mt-1 font-semibold text-blue-700">
        {resume.personalDetails.professionalTitle || 'Professional title'}
      </p>
      <p className="mt-3 text-sm text-slate-500">
        {[resume.personalDetails.city, resume.personalDetails.country]
          .filter(Boolean)
          .join(', ') || 'Location'}
      </p>
      {resume.professionalOverview && (
        <p className="mt-5 text-sm leading-6 text-slate-700">
          {resume.professionalOverview}
        </p>
      )}
      {resume.employmentHistory.length > 0 && (
        <section className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Experience
          </h3>
          {resume.employmentHistory.slice(0, 3).map((entry, index) => (
            <div className="mt-3" key={`${entry.employer}-${index}`}>
              <p className="text-sm font-bold text-slate-900">{entry.jobTitle || 'Job title'}</p>
              <p className="text-xs text-slate-600">{entry.employer || 'Employer'}</p>
            </div>
          ))}
        </section>
      )}
      {(resume.technicalSkills.length > 0 || resume.softSkills.length > 0) && (
        <section className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Skills
          </h3>
          <p className="mt-2 text-sm text-slate-700">
            {[...resume.technicalSkills, ...resume.softSkills].join(' · ')}
          </p>
        </section>
      )}
      {!fullName &&
        !resume.professionalOverview &&
        resume.employmentHistory.length === 0 && (
          <p className="mt-8 text-sm leading-6 text-slate-500">
            Content updates here as you complete the form.
          </p>
        )}
    </aside>
  )
}
