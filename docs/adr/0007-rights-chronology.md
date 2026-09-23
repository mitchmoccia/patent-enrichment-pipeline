# ADR 0007: Contribution chronology and the legal-source register

- Status: Accepted
- Date: 2026-09-23
- Slice: S05

## Context

A matter needs to record who supplied which role, when something was disclosed
or filed, and which public guidance the workspace is using. Those records are
easy to overstate: a contribution is not inventorship, a reviewer click is not
counsel approval, and an older filing date cannot be copied onto a later
embodiment.

## Decision

Inventor, applicant, owner, and assignment-obligation rows stay separate.
`legal_inventorship` is constrained to `unresolved`.

Chronology events are disclosure, sale, or filing. Precision is day, month,
year, or unknown. Unknown precision stores no calendar date.

Embodiment filing dates must be on or after the day the embodiment was
developed.

The legal-source register is global and public. It seeds the 2024 USPTO AI
inventorship guidance as superseded by the 2025 revised guidance. Neither row
can have `counsel_approved` true. A superseded source cannot be selected as
current. Reviewer promotion changes review status only. The alert stays
"promoted by a reviewer, not counsel-approved". No signing key is present, so
promotion is unsigned.

An entity applicant cannot store a self-filer release. An individual self-filer
stores the label `self-filer`.

Rule selection and filing-date assignment write a successor matter snapshot.

## Consequences

The rights page can show chronology and the seeded register before counsel
reviews it. A later signed rule pack would be a separate promotion, not a
silent update of these rows.
