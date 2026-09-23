# ADR 0013: Gate evaluations stay immutable and human release binds one digest

- Status: Accepted
- Date: 2026-09-23
- Slice: S11

## Context

A gate can look finished because several models agree, or because someone
approved an earlier package. Claim text and the export package change after
that. The catalog also says a model cannot finalize a gate, and an
administrator cannot borrow practitioner capacity.

## Decision

G00–G16 have a deterministic evaluator. It can return needs_information,
needs_review, or fail. It does not return pass. A person may record pass only
when the deterministic result is not fail. Model rows cannot be pass, and the
database rejects that combination. Evaluations and releases are immutable.

Claim-bound gates store the claim digest. Package gates store the package
digest. A different digest displays as stale. Carry-forward is allowed only
when the digest is unchanged, and never for G13. A release row authorizes only
its manifest digest.

A quote missing from the source is a fabricated citation even if models agree.
An administrator cannot request patent-agent or patent-attorney capacity.
Practitioner capacity is not verified in this environment, so it cannot be
selected. A claim patch marks current mechanism analyses stale.

Commercial assessment, export, receipt, office action, and watch plan are
absent until their slices, so those gates stay needs_information.

## Consequences

The review page can show why a gate is open. Approving yesterday's package does
not approve today's claim text.
