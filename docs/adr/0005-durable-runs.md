# ADR 0005: Durable runs and budget reservations

- Status: Accepted
- Date: 2026-09-23
- Slice: S03

## Context

A run has to survive a closed browser, a retried callback, and a worker that
returns after a newer attempt has already taken the fence. Provider timeouts
can still cost money. Workflow's published docs mix v4 and v5; this repo pins
Workflow 4.8.8.

## Decision

Postgres is the authority for runs, stages, attempts, reservations, external
operations, decisions, the outbox, and ordered matter events. Row locks on the
matter keep reservation checks and event sequence numbers serialized.

The same operation id and request hash returns the existing reservation. A
different hash conflicts. Reserved, committed, unknown, and reconciled amounts
count against the cap. Released amounts do not. An unknown amount with no
figure stays visible and blocks new spend. A timeout keeps the quoted amount
and marks it unknown so a retry of that operation does not call the provider
again.

A stale fence can keep the cost and a rejection event. It cannot replace the
accepted stage output. Resume payloads carry a decision id. An approved flag
is not a decision. A model actor cannot raise the cap or resume a run.

`openDecisionHook` imports `createHook` from Workflow 4.8.8 and is not on the
Next.js import path. Unconfigured analysis completes as `provider_unavailable`
with no invented text and no reservation. No queue consumer is configured, so
the UI polls persisted events.

## Consequences

Closing the browser does not cancel a run. Cancellation releases unused
reservations and leaves unknown costs in place. A later slice can attach a
worker that suspends on the decision hook without moving authority out of
Postgres.
