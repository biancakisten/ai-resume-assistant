import type { ResumeData } from '../../../shared/resume'
import { CvTemplate } from '../../resume-template'

export function ResumePreview({ resume }: { resume: ResumeData }) {
  return (
    <aside
      aria-label="Live resume preview"
      className="resume-preview"
    >
      <p className="resume-preview__label">
        LIVE RESUME PREVIEW
      </p>
      <div
        aria-label="Scrollable A4 resume preview"
        className="resume-preview__viewport"
        role="region"
        tabIndex={0}
      >
        <div className="resume-preview__page">
          <CvTemplate resume={resume} />
        </div>
      </div>
    </aside>
  )
}
