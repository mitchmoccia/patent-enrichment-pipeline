# ADR 0011: Alternatives stay out of the disclosure until a person selects them

- Status: Accepted
- Date: 2026-09-23
- Slice: S09

## Context

A design-around can drop the feature a buyer actually needs and still be
listed as a substitute. A partition-tolerant design can hide the consistency
rule it depends on. Model text can also be copied into the selected disclosure
without a person choosing it.

## Decision

An alternative that removes a named essential benefit without an explanation is
ranked `not_equivalent`. A partition-tolerant alternative must store a
consistency assumption. Feasibility is `unknown`, `plausible`, or `implausible`.
There is no legal-conclusion column.

Model-origin rows cannot be marked in the selected disclosure. A person-origin
row can, and only after an explicit selection. Experiment execution stays
`unavailable`. A configured sandbox endpoint still does not run code in this
build. The stored plan is the rank reason and the assumption text.

## Consequences

The alternatives page can compare options without treating a model draft as the
disclosure or an unrun experiment as evidence.
