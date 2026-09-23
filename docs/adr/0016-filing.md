# ADR 0016: A receipt is not a filing until a person records it

- Status: Accepted
- Date: 2026-09-23
- Slice: S14

## Context

A downloaded package, a checkbox, or a model sentence can be mistaken for an
official filing or a grant. A portal edit can also make the submitted bytes
differ from the released package. A response can add a feature the original
application never disclosed.

## Decision

Importing a receipt stores both digests. Different digests are a reconciliation
issue and are not verified. Matching digests are verified and still leave the
matter state unchanged. A person can record `filed` only from a verified
receipt, and not by marking a download or a checkbox. A model cannot record
it. `granted_recorded` is not set from an import or from office-action text.

A deadline stores its source and rule before it can be confirmed. An amendment
with no original support, or one marked as newly invented, is refused. An IDS
candidate stays unsubmitted.

A verified receipt moves G14 to needs_review. An office action moves G15 to
needs_review. Neither check passes the gate.

## Consequences

The filing page can show the matter state beside the receipt comparison.
Official submission remains manual.
