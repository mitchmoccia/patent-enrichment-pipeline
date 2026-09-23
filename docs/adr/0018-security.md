# ADR 0018: A logical readback is not a disaster-recovery certification

- Status: Accepted
- Date: 2026-09-23
- Slice: S16

## Context

Row-level security already limits a tenant to its own rows. A pilot still
needs an honest account of what was not tested: production backup restore,
independent penetration testing, and a certified multi-tenant deployment.

## Decision

An instruction string cannot change network access, processing policy, or
export permission. A worker target supplied as a URL is refused, including
link-local metadata addresses. Recording a security check reads the matter and
its assertions back through the tenant-scoped connection and stores
`certified = false`. The database rejects any other value.

The page lists the unresolved risks. Data routes in this environment are the
application database, local object storage unless S3 and KMS are configured,
and no live Stripe, PostHog, USPTO, or model call unless those credentials are
set. This check does not send traffic to those providers.

## Consequences

The security page can show that a matter is readable to its tenant and that
the pilot is not certified.
