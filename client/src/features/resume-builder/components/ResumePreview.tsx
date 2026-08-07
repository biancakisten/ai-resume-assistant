import { useMemo } from 'react'
import type { ResumeData } from '../../../shared/resume'
import { AiImproveControl } from '../ai/AiImproveControl'
import type { ResumeAiController } from '../ai/types'
import {
  CvTemplate,
  paginateResume,
  type ShortenCandidate,
} from '../../resume-template'
import type { RepeatableUiIds } from '../types'
import { ResumePdfDownload } from './ResumePdfDownload'

export interface ShortenSelection {
  candidate: ShortenCandidate
  stableId: string
}

interface ResumePreviewProps {
  ai?: ResumeAiController
  ids?: Pick<RepeatableUiIds, 'education' | 'employment'>
  onApplyShortening?: (selection: ShortenSelection, value: string) => void
  resume: ResumeData
  showPdfDownload?: boolean
}

function stableIdFor(
  candidate: ShortenCandidate,
  ids?: ResumePreviewProps['ids'],
): string {
  if (candidate.kind === 'professionalOverview') return 'overview'
  const index = candidate.index ?? 0
  if (candidate.kind === 'educationAchievements') {
    return ids?.education[index] ?? `education-${index}`
  }
  return ids?.employment[index] ?? `employment-${index}`
}

export function ResumePreview({
  ai,
  ids,
  onApplyShortening,
  resume,
  showPdfDownload = false,
}: ResumePreviewProps) {
  const pagination = useMemo(() => paginateResume(resume), [resume])
  const candidate = pagination.shortenCandidate
  const stableId = candidate ? stableIdFor(candidate, ids) : ''

  return (
    <aside
      aria-label="Live resume preview"
      className="resume-preview"
    >
      <p className="resume-preview__label">
        LIVE RESUME PREVIEW
      </p>
      <div
        className={
          pagination.fitStatus === 'multiple'
            ? 'resume-preview__warning resume-preview__warning--overflow'
            : pagination.fitStatus === 'single'
              ? 'resume-preview__warning resume-preview__warning--fit'
              : 'resume-preview__warning resume-preview__warning--empty'
        }
        aria-atomic="true"
        role="status"
      >
        <p>{pagination.warnings[0]}</p>
      </div>
      {candidate && ai && onApplyShortening && (
        <div className="resume-preview__shorten">
          <h2>Shorten to fit</h2>
          <p>
            The longest supported field is {candidate.label}. AI can propose a
            concise version; your text changes only if you accept it.
          </p>
          <AiImproveControl
            actionLabel="Shorten to fit with AI"
            ai={ai}
            fieldKey={`fit:${candidate.kind}:${stableId}`}
            fieldType={candidate.fieldType}
            fixedStyle="concise"
            label={candidate.label}
            onChange={(value) =>
              onApplyShortening({ candidate, stableId }, value)
            }
            text={candidate.text}
          />
        </div>
      )}
      {showPdfDownload ? (
        <ResumePdfDownload pagination={pagination} resume={resume} />
      ) : null}
      <div
        aria-label="Scrollable A4 resume preview"
        className="resume-preview__viewport"
        role="region"
        tabIndex={0}
      >
        <div className="resume-preview__page">
          <CvTemplate pagination={pagination} resume={resume} />
        </div>
      </div>
    </aside>
  )
}
