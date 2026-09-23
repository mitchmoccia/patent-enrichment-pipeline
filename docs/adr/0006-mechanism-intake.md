# ADR 0006: Mechanism intake without a live model

- Status: Accepted
- Date: 2026-09-23
- Slice: S04

## Context

The intake analyst should read the inventor's record and ask about missing
mechanism details. This environment has no gateway key and no approved model
id. Inventing a mechanism, an invention date, or inventorship from that gap
would be false.

## Decision

`packages/ai` pins AI SDK 7.0.97. A live call uses `generateText` and
`Output.object` only when `AI_GATEWAY_API_KEY` and `AI_INTAKE_MODEL` are both
set. The model id is not chosen in code.

Without that route, intake is `provider_unavailable`. Elements are exact
supplied sentences. Questions describe gaps, including an uncertain payment
outcome when the record itself asks about one. A short idea with no supplied
mechanism becomes a development task.

A model suggestion stays `proposed_embodiment` from a model. Accepting it
stores the acceptance time. The invention date stays null and inventorship
stays unresolved. The answer or acceptance writes a successor snapshot and
marks the prior mechanism analysis stale.

A model actor cannot approve a gate, change permissions, sign, file, verify a
citation, or raise a spend cap.

## Consequences

The invention page can be used before a model route exists. A later approved
model id can run the same schema. Quotes that are not in the record are
dropped instead of stored as supplied facts.
