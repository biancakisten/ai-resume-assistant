# Resume data schema

Phase 3's shared source of truth is in `client/src/shared/resume`. Import from
the folder's `index.ts` barrel rather than individual implementation files.

## Creating an empty resume

```ts
import { createEmptyResumeData } from './shared/resume'

const resume = createEmptyResumeData()
```

Each call returns a new object. Optional text fields use empty strings,
repeatable sections use empty arrays, and the optional photograph is `null`.
Array order is the user's chosen display order.

Employment entries include separate optional `description` (responsibilities)
and `achievements` text fields. Phase 6 uses this distinction to improve only
the selected text without changing employer, job-title, or date facts.

## Validating resume data

```ts
import { validateResumeData } from './shared/resume'

const result = validateResumeData(resume)
if (!result.valid) {
  console.log(result.errors)
}
```

The validator accepts `unknown` so data loaded from forms, storage, or APIs is
checked at runtime. It never relies on throwing for ordinary validation
failures. Each error contains:

- `path`: dot-separated field path, such as `employmentHistory.0.endDate`
- `code`: stable machine-readable category, such as `required` or `duplicate`
- `message`: user-facing explanation

## Tests and checks

From `client`:

```sh
npm test
npm run typecheck
npm run lint
npm run build
```
