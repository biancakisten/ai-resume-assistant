import { ConfirmDialog } from '../components/ConfirmDialog'
import type { ResumeAiController } from './types'

export function AiConsentDialog({
  ai,
}: {
  ai: Pick<
    ResumeAiController,
    'consentOpen' | 'confirmConsent' | 'cancelConsent'
  >
}) {
  return (
    <ConfirmDialog
      confirmLabel="Continue with AI"
      onCancel={ai.cancelConsent}
      onConfirm={ai.confirmConsent}
      open={ai.consentOpen}
      title="Share selected text with the AI service?"
    >
      <p>Please review how this feature works before continuing:</p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>Only the selected text will be sent to the AI service.</li>
        <li>The complete CV will not be sent automatically.</li>
        <li>The suggestion will not replace your text without your approval.</li>
        <li>
          This feature does not permanently store the selected text in the
          application.
        </li>
        <li>
          AI suggestions may contain mistakes. Review every suggestion before
          accepting it.
        </li>
      </ul>
      <p className="mt-3">
        Consent lasts only until this page is refreshed, reopened, or reset.
      </p>
    </ConfirmDialog>
  )
}
