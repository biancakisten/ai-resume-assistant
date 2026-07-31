# Phase 7: React CV template

## Design reference

The reusable CV template recreates Figma node `177:1427` from the approved
Pixel Pals design system. The implementation follows the reference's A4
two-column composition, Roboto typography, navy sidebar, cyan-blue accent,
circular photograph, uppercase section headings, and right-aligned dates.

The Figma-generated absolute-positioned reference code was not copied. The
React implementation uses semantic, reusable sections and responsive CSS
proportions derived from the source design.

The source frame is `1240 × 1797`; its `430px` sidebar is reproduced as
`34.68%`. The principal colours are navy `#1f2a44`, cyan `#4fa1d1`, ink
`#0f0f12`, body copy `#40454d`, and sidebar copy `#ebf0f7`. Roboto Regular,
Medium and Bold are self-hosted template assets. Arial and the generic
sans-serif family remain fallbacks. Self-hosting avoids a third-party request,
works offline after the application loads, and gives screen and print the same
font source. The official Apache 2.0 font licence is stored beside the assets.

## Component structure

- `CvTemplate` renders one A4 page from a `ResumeData` value.
- `CvSidebarSection` provides reusable sidebar headings and content spacing.
- `CvMainSection` provides reusable main-column headings and content spacing.
- `ResumePreview` places the template inside the existing manual form and
  keeps it sticky only at layouts with enough horizontal space.

The template imports the shared `ResumeData` model rather than duplicating it.
Updates from the manual form flow directly into the preview through its
`resume` prop. The only local state records a failed photograph load so the
portrait can fall back safely; no form or Phase 6 AI state is coupled to the
template.

## ResumeData mapping

| ResumeData field | Template section |
| --- | --- |
| `personalDetails.firstName`, `lastName` | Sidebar identity name and initials fallback |
| `personalDetails.professionalTitle` | Sidebar identity title |
| `personalDetails.email`, `phone` | Contact links |
| `personalDetails.city`, `country` | Contact location |
| `personalDetails.linkedInUrl`, `portfolioUrl` | Safe HTTP(S) contact links |
| `photograph.url`, `altText` | Circular portrait |
| Professional overview | Professional overview |
| Strengths | Core strengths |
| Employment job title, employer, location and dates | Employment history heading |
| Employment description and achievements | Employment history bullets |
| Education qualification, institution, location and dates | Education & training |
| Education description/achievements | Education entry description |
| Technical skills | Technical skills |
| Soft skills | Soft skills |
| Training name, issuer, completion state and credential ID | Additional training |
| Languages | Language skills |
| Interests | Personal interests |

Empty optional sections are omitted. Responsibilities and achievements are
rendered as separate bullet points without changing the stored text. Current
employment and education entries display `Present`; in-progress training
displays `In progress`. Missing non-current end dates show only the start date,
without a dangling separator. Lists discard whitespace-only items and partial
repeatable entries do not create placeholder headings.

The schema deliberately contains some non-display metadata. Employment type is
kept in `ResumeData` but omitted to match the approved Figma entry treatment.
Photograph file name, MIME type, byte size and pixel dimensions support upload
validation, not presentation. Training credential URLs are retained for future
linked credential treatment; Phase 7 displays the credential ID but does not
introduce a link absent from the reference design.

## Fallbacks and deliberate design differences

When there is no usable photograph, the portrait shows initials. It uses the
first and final words across the supplied names, the first two letters for a
single name, and `CV` for empty or whitespace-only names. Invalid URLs and
images that fail to load also use this fallback.

Unlike the fictional Figma content, the template always renders the supplied
`ResumeData` and never bundles the sample portrait. Semantic document flow
replaces the reference's absolute positioning so variable user content remains
readable. Additional schema sections—technical skills, soft skills, education
achievements and training metadata—are included even though the fictional
reference does not demonstrate every case. Links are interactive and
keyboard-focusable on screen; the original sample displayed contact details as
plain text.

## Responsive and print behaviour

The page keeps the A4 `210 / 297` aspect ratio. Container query units scale the
design typography and spacing with the preview width, while the form and
preview stack when the viewport cannot support both comfortably. On narrow
phones, the labelled preview viewport scrolls horizontally around a minimum
readable A4 rendering instead of shrinking essential text or overflowing the
browser page.

Print styles use A4 portrait size with zero browser margins, remove the preview
frame and label, preserve backgrounds where the browser supports print colour
adjustment, and render the template at exactly `210mm × 297mm`. Screen-only
minimum widths and shadows are reset for print.

Phase 7 does not calculate overflow, split content across pages, generate a
PDF, or expose a download action. Overflow handling remains Phase 8 and PDF
generation remains Phase 9. Until Phase 8, content beyond one A4 page is
clipped deliberately; maximum-entry resumes and unusually long text can
overflow the available page.
