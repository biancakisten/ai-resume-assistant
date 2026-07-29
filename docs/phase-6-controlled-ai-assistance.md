# Phase 6: Controlled AI assistance

## Architecture

Phase 6 improves one eligible resume field at a time. The React form owns
session-only AI state through `useResumeAiAssistance`; this state is separate
from `ResumeData` and is never written to browser storage. The browser calls
the same-origin Vercel Function at `POST /api/improve-resume-text`. Only the
server imports the OpenAI SDK or reads OpenAI environment variables.

Repeatable employment and education controls use the form's stable UI entry
IDs. Requests are associated with an `AbortController`, and stale responses
are ignored after cancellation, navigation, deletion, or replacement by a
newer request.

## Eligible fields and styles

AI controls are limited to:

- Professional overview
- Employment responsibilities
- Employment achievements
- Education achievements

The supported styles are exactly `professional`, `concise`, and
`achievement-focused`. The browser cannot send a custom prompt or arbitrary
instructions.

## Consent lifecycle

The first request opens a keyboard-accessible consent dialog explaining what
is sent, that the complete CV is not sent automatically, that suggestions
require approval, that this feature does not permanently store the selected
text in the application, and that suggestions may be wrong. Consent lives
only in React memory. Refreshing, reopening, or using Start Over resets it.
Cancelling the dialog sends no request.

## API contract

Request:

```json
{
  "fieldType": "professionalOverview",
  "style": "professional",
  "text": "The selected field text"
}
```

Successful response:

```json
{
  "suggestion": "The improved field text",
  "warnings": []
}
```

The endpoint accepts POST with JSON only. It rejects extra properties,
unsupported fields or styles, blank text, text exceeding the matching schema
limit, and raw request bodies larger than 16 KiB. Validated provider output is
limited to the selected field's schema limit, ten non-empty warnings of at
most 500 characters each, and 8 KiB in total. Responses use
`Cache-Control: no-store`. Provider failures, timeouts, rate limits, invalid
output, and configuration failures map to short, non-sensitive error objects.
Retryable client errors offer Try again; the original text remains unchanged.

## Factual integrity

Server-controlled instructions treat submitted resume text as untrusted data
and prohibit invented or inferred facts, employers, dates, qualifications,
skills, duties, metrics, achievements, names, or numbers. They require
warnings when information is unclear or contradictory. The endpoint also
rejects model output containing numeric tokens that did not appear in the
original field. The request uses a strict structured-output schema and sets
`store: false`, so the response is not retained as Responses API application
state. OpenAI's separate platform data controls may still apply.
See OpenAI's official
[Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs)
for the Responses API `text.format` configuration.

Suggestions never replace form content automatically. The user compares the
original and suggestion, then chooses Accept, Reject, or Try again. Accept
updates only the selected field. Undo restores the exact pre-AI value until
the user leaves the step, even if the accepted text was edited afterward.
Cancel and Reject preserve the original.

## Environment and local setup

Use Node.js 22 or newer, install dependencies in `client`, and copy the
variable names from `client/.env.example` into an ignored local environment
file:

```text
OPENAI_API_KEY=
OPENAI_MODEL=
```

The Vercel project Root Directory must be `client`; Vercel discovers
`client/api/improve-resume-text.ts` as `/api/improve-resume-text` from that
root. Supply real values locally without committing them, then run `vercel
dev` from `client` so the Vercel Function and frontend are available together.
Neither variable may use a `VITE_` prefix. The endpoint uses Vercel's default
Node.js runtime and its Web-standard `fetch(request: Request)` export. See the
official [Vercel Node.js Functions documentation](https://vercel.com/docs/functions/runtimes/node-js).

For Vercel, open the project's Settings, add `OPENAI_API_KEY` and
`OPENAI_MODEL` under Environment Variables for the intended environments,
then redeploy. Never place the secret in browser code or a checked-in file.

## Known limitations and scope

- AI output still requires human review and may contain mistakes.
- The numeric-token guard treats signs and percentages as meaningful and
  rejects numeric tokens absent from the source. It is deliberately
  conservative about formatting changes (for example, `1,000` versus `1000`)
  and cannot detect a changed claim that reuses the same numeric token.
- No request history, persistence, database, or saved AI suggestion exists.
- Phase 5 resume upload and extraction remains deferred to version 1.1.
- Job-description and target-role tailoring are excluded from version 1.0.
- Whole-resume processing, final CV templates, and PDF generation are not
  included in Phase 6.
