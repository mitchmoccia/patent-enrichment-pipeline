# ADR 0019: The benchmark does not certify legal quality

- Status: Accepted
- Date: 2026-09-23
- Slice: S17

## Context

The evaluation protocol asks for defect families, practitioner annotation, and
a report that does not turn a small pilot into a public quality claim.

## Decision

The benchmark runs the implemented checks for a fabricated citation, a later
date, a snippet-only anticipation, a generic eligibility fix, a dependency
cycle, a model proposal entering the disclosure, model agreement on a missing
quote, an entity self-filer release, a family date used as a disclosure date,
a stale release digest, and an unsupported licensing probability. Each of
those is caught by the existing rules.

The stored report records zero practitioner annotators, no statistical
sufficiency, no patentability certification, and no deployment URL. The
database rejects a certified flag. Two practitioners did not independently
annotate this run, and no hidden evaluation set was used.

## Consequences

The benchmark page can show which known defects the current rules catch, and
the limits of that result.
