# ADR 0009: Prior-art findings without a success probability

- Status: Accepted
- Date: 2026-09-23
- Slice: S07

## Context

A chart can look persuasive while the citation is missing, the full text was
never retrieved, the reference is later than the disclosure, or several
references are combined without a reason. Eligibility answers can also collapse
into "use a processor" or "use AI".

## Decision

Anticipation, obviousness, and technical similarity are different finding
kinds. Relevance is stored separately from legal status. A quote that is not
contained in the imported passage or full text is `fabricated_citation`.
Anticipation on an unavailable full text is `snippet_only`. A disclosure date
after the matter's day-precision disclosure or filing date is `wrong_date`.
Anticipation that needs more than one reference is `distributed_features`.
Obviousness across references without a motivation is
`absent_combination_motivation`.

Eligibility answers must include the limitation text. A sentence that only
adds a processor, a computer, or AI is `generic_eligibility_fix`.

No success probability column exists. Supplying one to the assessor is refused.

## Consequences

Rejected findings stay on the dossier so a reviewer can see why they failed.
They are not rewritten as supported.
