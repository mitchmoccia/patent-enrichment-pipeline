# ADR 0012: Specification sections stay clean of prompts and legal argument

- Status: Accepted
- Date: 2026-09-23
- Slice: S10

## Context

Application text has to stay distinguishable from a prompt, a legal chart, and
a worked example. A number in a claim is not evidence. A figure sentence that
uses a different label from the figure list is not the same drawing.

## Decision

Abstract, description, and claims are stored as sections. Prompt-like text and
legal-analysis words are refused in those sections. A claim containing a digit
needs an evidence note supplied by the user. Text that says "hypothetical" or
"for example" is stored as hypothetical. A figure reference must name a listed
numeral and include that figure's label. Editing the description marks claim
support stale.

The editor is a section form. Tiptap is not bundled. The checks live in the
service so a later canvas cannot bypass them.

## Consequences

The specification page can hold an abstract, a description, claims, figures,
and a terminology list. It does not render a rich-text canvas or generate SVG.
