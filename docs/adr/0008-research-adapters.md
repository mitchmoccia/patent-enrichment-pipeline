# ADR 0008: Research adapters without unverified office calls

- Status: Accepted
- Date: 2026-09-23
- Slice: S06

## Context

The source register names USPTO Open Data Portal and EPO Open Patent Services.
It also says the exact endpoint, authentication, coverage, and licensing have
to be verified before an adapter calls them. This environment has no verified
contract and no entitled key that has been checked against one.

## Decision

User-imported references are the only records searched. A query plan records
egress as none. USPTO and EPO OPS report `not_configured` without a key, or
`endpoint_unverified` when a key is present. Neither status has a match count.

A 401 or 403 classification returns `credentials_rejected` and a null match
count, including when a body claims zero hits. Missing full text stays
unavailable. A family date is stored beside the publication date and is not
used as the disclosure date. Imported rows are tenant-scoped.

No vector index is built. Ranking is lexical overlap on the imported title and
passage.

## Consequences

The research page can collect references and show why an office was not called.
A later verified endpoint can be added without relabeling these empty plans as
searches that found nothing.
