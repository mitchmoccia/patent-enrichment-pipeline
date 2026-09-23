# ADR 0014: An export is an unexecuted review package

- Status: Accepted
- Date: 2026-09-23
- Slice: S12

## Context

A download can be mistaken for a filing. The package can also hide comments,
leak tenant metadata, cite a missing figure, or drift after the specification
changes. Page images and a zipped DOCX are not produced in this environment.

## Decision

Assembly rejects a missing claims clause, a hidden comment, an orphan figure,
broken claim numbering, metadata leakage, text that is not NFC, and a package
over the review length budget. A successful package stores a manifest of file
hashes bound to the current package digest. The link expires. A later section
edit makes that manifest stale. The form text stays unexecuted.

`word/document.xml` is escaped text, not a zipped DOCX. PDF status stays
`review_rendering_unavailable`. The page tells the filer to inspect the
official portal. Building a package does not set the matter to filed or
granted. A live matching manifest lets G12 move to needs_review. It does not
pass the gate.

## Consequences

The export page can show the current files, or say the link expired or the
package changed. Official submission remains manual.
