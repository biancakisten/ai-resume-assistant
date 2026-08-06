# Phase 8: Content overflow and deterministic pagination

## Purpose

Phase 8 replaces the Phase 7 single-page clipping rule with a deterministic
page model. Resume content is divided into explicit A4 pages before React
renders it. The same page model drives the responsive preview and print output,
so print does not introduce a second pagination system.

Phase 8 does not generate PDFs, add download controls, deploy the application,
or implement Phase 9 functionality.

## Pagination architecture

`paginateResume()` is a pure function. It accepts `ResumeData` and returns:

- ordered A4 page models;
- sidebar and main-column slices for every page;
- a visible fit or overflow warning;
- the longest supported AI field that may be shortened when the resume spans
  multiple pages.

The function does not inspect the DOM, viewport size, browser font metrics, or
device pixel ratio. It uses separate calibrated capacity estimates for the
main column (76 cost units at an estimated 62 characters per line) and sidebar
(70 cost units at an estimated 19 characters per line). Heading, entry-header,
paragraph and list spacing add explicit costs. Compact entries are charged for
their actual visible lines and spacing rather than a generic multi-line block,
which prevents short education and training entries from creating a sparse
trailing page. These values are calibrated to the fixed Roboto typography,
page padding, gaps and column widths.
Any change to those CSS properties requires a matching pagination-model update
and dense preview/print verification. This estimate is deterministic, not a
claim of pixel-perfect browser line measurement.

Each rendered page retains:

- `210mm × 297mm` A4 geometry;
- a full-bleed navy sidebar at the top, left and bottom A4 edges;
- independent internal padding for sidebar content and the white main column;
- the 34.68% navy sidebar and 65.32% main column;
- the Phase 7 Roboto font files;
- navy `#1f2a44` and blue `#4fa1d1`;
- the existing heading, entry, date and list styles.

Continuation pages use a compact name/title identity in the sidebar. Sidebar
sections continue at list-item boundaries. Main sections repeat their heading
with “(continued)” when they span pages.

## Page-break rules

The paginator applies these rules in order:

1. A short resume remains on one page.
2. Section headings are added only with at least one content fragment.
3. Employment, education and training entries remain intact when the complete
   entry fits in the remaining page capacity.
4. An entry that does not fit moves to the next page when that page has room.
5. Unusually long employment content splits between responsibility or
   achievement bullets. A long entry may also continue on the next page when
   safe bullet fragments can use meaningful space that would otherwise remain
   blank.
6. A single oversized bullet or education description splits at sentence
   boundaries. The sentence scanner recognises whitespace-delimited `.`, `!`
   and `?`, avoids common abbreviations and does not treat punctuation inside a
   decimal as a boundary.
7. If one sentence is still oversized, it splits at word boundaries. A single
   extremely long token falls back to bounded Unicode code-point chunks so the
   loop always advances and content is never discarded.
8. A continuation fragment repeats the entry heading and date so that it keeps
   its context.
9. Sidebar sections split between visible items. An exceptionally long contact
   or list value is split into labelled continuation fragments as a final
   fallback.
10. Available space is filled in stored order, allowing a following education
    or training entry onto the current page when the complete entry fits.
11. Empty sections, headings without content, empty fragments and blank trailing
    pages are never emitted.

The resulting pages remain in stored ResumeData order. Source objects are never
mutated. Text is rendered through React as text, not raw HTML. Leading list
markers and surrounding whitespace are intentionally normalised exactly as in
the Phase 7 list rendering; when oversized prose is split, internal runs of
whitespace are normalised to a single readable space. Punctuation, words and
Unicode code points are otherwise preserved.

Stable deterministic keys identify pages, section slices and content fragments.
The typed page model is independent of Phase 6 AI state and is computed before
the template renders.

## Fit and overflow feedback

The live preview announces one of three states:

- an empty resume needs content before fit can be assessed;
- the resume fits on one A4 page; or
- the resume uses a specific number of A4 pages and every continuation page
  should be reviewed.

The notice is a polite atomic status message, is expressed in text rather than
colour alone, and is excluded from print. The preview region remains keyboard
focusable and horizontally scrollable on small screens. Multiple pages are
stacked in order with a visible screen-only gap. Print consumes the same page
model, removes preview decoration and scrolling, preserves backgrounds, fixes
each page at `210mm × 297mm`, and adds a page break after every page except the
last.

## Shorten to fit

When the resume spans multiple pages, the preview selects the longest field
already supported by Phase 6:

- professional overview;
- employment responsibilities;
- employment achievements; or
- education achievements.

The user may request “Shorten to fit with AI”. The request always uses the
existing `concise` style and sends only that selected field. Existing Phase 6
consent, loading, cancellation, retry, comparison, Accept, Reject and Undo
behaviour remains unchanged. Text is not replaced until the user accepts the
suggestion.

Repeatable entries use their existing stable builder identifiers in the AI
field key. Applying an accepted suggestion resolves that identifier against the
current entry order, so a reordered or deleted entry cannot receive another
entry’s suggestion.

The control never runs automatically and is omitted for one-page resumes or
when there is no supported field to shorten. Consent cancellation submits
nothing. Existing comparison, Accept, Reject, Retry, Cancel and Undo behaviour
is reused unchanged. Accepting a suggestion immediately recomputes the page
model; the resulting status reports the real page count and never promises that
one suggestion will produce one page.

## Accessibility

The preview and each page have descriptive region labels. The complete CV has
one level-one heading; continuation identities are styled neutral text so they
do not create repeated document headings. Repeated section headings explicitly
say “continued”, while the decorative “CV continued” label is hidden from
assistive technology. There is no nested `main` landmark. Contact links retain
accessible names, and long continuation fragments retain their field context.
Phase 6 keyboard and focus behaviour remains responsible for consent and AI
comparison controls.

## Known limitations

- Pagination uses deterministic estimates rather than live font
  measurement. An unusual browser font-rendering difference may leave more
  whitespace than another browser.
- Phase 8 does not promise a particular maximum page count. It preserves all
  supplied content and uses as many A4 pages as required.
- “Shorten to fit” proposes one supported field at a time. Accepting one
  suggestion may reduce the page count, but the user may need to repeat the
  action or edit other fields.
- Browser font loading and sub-pixel rounding can change where glyphs wrap, so
  dense pages must still be reviewed. The full Naledi Mkhize regression fixture
  verifies that its former four-page result becomes three ordered pages, uses
  available space on the first two pages, and avoids clipping or a nearly empty
  tail. Long unbroken values use
  `overflow-wrap: anywhere` and bounded page-model fragments rather than
  clipping.
- Pathological single-token values can be continued at Unicode code-point
  boundaries. This preserves the data but may create a visually awkward break.
- Page numbers are exposed through accessible page labels; decorative printed
  page-number footers are intentionally deferred because they are not part of
  the approved Figma design.
- No PDF file is generated in Phase 8. PDF generation, download controls and
  deployment remain Phase 9.
