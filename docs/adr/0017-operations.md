# ADR 0017: Billing stays unavailable until Stripe is configured

- Status: Accepted
- Date: 2026-09-23
- Slice: S15

## Context

A webhook can be replayed. A cancelled run can still have a committed cost.
Analytics can leak the invention. A watch plan can be mistaken for permission
to send a demand letter.

## Decision

Stripe entitlements stay null. Without both secret and webhook environment
names, status is unavailable. With them set, status is configured_unverified
and this code still does not call Stripe. A webhook classification never
grants an entitlement. A repeated event id is a duplicate. A reservation keeps
its quoted amount when a catalog price changes. Cancelling releases only an
unused reservation. A committed amount stays in the exposure.

Analytics accepts matter_state, gate_id, and provider. Any other property is
refused. A watch plan requires an explicit approval, a source, a cadence, and
a budget. The database rejects an unapproved plan and any demand-letter flag.
There is no send path.

An approved plan moves G16 to needs_review. The check does not pass the gate.

## Consequences

The operations page lists provider status as unconfigured in this environment.
No paid account is created.
