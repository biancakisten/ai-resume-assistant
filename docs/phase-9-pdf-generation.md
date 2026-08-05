# Phase 9: Browser PDF generation and download

## Purpose

Phase 9 adds an explicit, local PDF preparation workflow to the resume builder.
It uses the Phase 8 `PaginationResult` as the single page-order source for both
the HTML preview and the PDF. No resume data, photograph, or generated file is
sent to a PDF service or stored by the application.

## Architecture

`ResumePdfDownload` receives the same `ResumeData` and `PaginationResult` used
by `ResumePreview`. Selecting **Prepare PDF** dynamically imports the production
generator. The generator then loads React-pdf, registers the bundled fonts,
prepares the photograph, renders the document to a `Blob`, and verifies the PDF
signature, A4 media boxes, page count, and measured layout before exposing a
native **Download PDF** link.

The PDF document renders exactly one fixed, non-wrapping A4 page for every
`CvPageModel`. Each page is `595.28 × 841.89` points and keeps the preview's
34.68% navy sidebar, main-column geometry, blue accents, hierarchy, and stored
content order. Every supported sidebar and main-column fragment is rendered.
The generator does not mutate either input.

React-pdf and its production document module are loaded only after the user
requests a PDF. They are emitted as lazy production chunks and are not included
in the initial application bundle. The scoped `Buffer.isBuffer` compatibility
probe exists only while a PDF generation request is active and is removed when
the request settles.

## Fonts, links, and selectable text

The existing self-hosted Roboto Regular, Medium, and Bold files are registered
with React-pdf and embedded in the output. Resume text remains vector text, so
it is sharp, searchable, and selectable. Email, telephone, LinkedIn, portfolio,
and visible training credential URLs are emitted as PDF link annotations.

The PDF contains only resume pages. Builder controls, preview notices, AI
controls, status messages, and download controls are never part of the PDF
document tree.

## Photographs

JPEG and PNG photographs are decoded before rendering and embedded as data
URLs. WebP is decoded locally and converted to PNG with a canvas because PDF
reader support for embedded WebP is inconsistent. `createImageBitmap` is used
when available; an `HTMLImageElement` decode path is the fallback. This covers
valid data, blob, and HTTP(S) photograph URLs accepted by the resume schema.

An HTTP(S) photograph must be readable by the browser under the source
server's CORS policy. Blob URLs must still exist when preparation begins. A
selected image that cannot be fetched, decoded, or converted causes PDF
preparation to fail with a visible retryable error; it is never silently
omitted. Fetched image bytes are also limited to the builder's existing 5 MB
photograph limit before decoding.

## Download state and cleanup

PDF creation never starts automatically and a successful preparation never
triggers a download. The action is disabled while work is in progress. Loading,
ready, and error states are announced through a polite atomic live region. A
failure exposes **Retry PDF**.

The component fingerprints the resume and page model for each request. A
result is discarded if content changes or the component unmounts before it
finishes. A ready PDF becomes stale immediately when resume content changes.
Because React-pdf does not expose cancellable rendering, an outdated request is
allowed to finish privately but blocks another preparation until it settles;
its result is never published. This prevents edited resumes from creating
overlapping background work. Replaced and unmounted object URLs are revoked.
Filenames use normalised first and last names
(`first-name-last-name-resume.pdf`) and fall back to `resume.pdf`.

## Clipping safeguards and errors

The fixed PDF styles are calibrated against short, multi-page, maximum-count,
and dense resumes. No PDF style uses hidden overflow to conceal content. Before
rendering, the generator rejects a pathological fragment that exceeds the
Phase 8 A4 capacity and therefore cannot be represented safely on its assigned
page. After rendering, it rejects out-of-bounds layout boxes, missing pages,
incorrect A4 media boxes, and invalid PDF output. The user is asked to shorten
the affected content rather than receiving a silently clipped file.

## Browser and accessibility limitations

- PDF generation requires modern browser support for dynamic imports, `Blob`,
  object URLs, canvas, and image decoding.
- Large, image-heavy resumes can temporarily consume significant memory while
  React-pdf builds the file. The loading state remains visible during this work.
- Cross-origin photographs require suitable CORS response headers.
- Exceptionally long unbroken tokens use React-pdf's Unicode-safe hyphenation
  points. Source characters remain present and selectable, although a PDF
  viewer may show a typographic hyphen where such a token wraps.
- PDF link annotations and selectable text are preserved, but React-pdf does
  not produce a fully tagged PDF/UA document. Reading order and semantics can
  vary between assistive technologies and PDF readers.
- Browser PDF viewers can display colours, fonts, and link activation slightly
  differently. Chrome is covered by the project browser verification; Safari
  and Firefox must be checked manually when their automation/runtime is not
  available.

Phase 9 does not add deployment, persistence, external PDF services,
dependency-audit remediation, or Phase 10 functionality.
