# ADR 0003: MFA enforcement and matter controls

- Status: Accepted
- Date: 2026-09-23
- Slice: S01 residual

## Context

Better Auth's `two_factor` table already existed, but nothing enrolled a second
factor or refused a session that lacked one. The goal was write-once. Revocation
existed in the application service and was not exposed, and Server Actions and
Route Handlers were not both shown to reject a revoked principal. A matter also
had nowhere to store the processing policy or run budget that later slices
account against.

## Decisions

1. **TOTP enrollment.** The Better Auth two-factor plugin is enabled. A signed-in
   person enrolls at `/app/mfa` with their password, then confirms a TOTP code.
   `twoFactorEnabled` stays false until that code verifies. Backup codes are
   shown once.

2. **Enforcement at the command, not only the layout.** The workspace layout
   redirects an unenrolled session to `/app/mfa`. Server Actions and Route
   Handlers each check the verified session flag again before a mutation. A
   direct POST cannot skip the layout and still succeed.

3. **Revocation is a human owner action.** Both transports re-read the matter
   under the caller's RLS context. A revoked principal gets `UNAUTHORIZED` from
   each function. The last owner cannot be removed.

4. **Goal, policy, and budget are versioned.** Editing the goal, recording a
   processing policy, or setting the run budget increments `head_revision` and
   writes a successor snapshot. `trainingUseAllowed` is fixed `false` in Zod and
   by a database check. A caller with `actorKind: "model"` cannot change the
   budget or membership.

## Consequences

- Local development requires an authenticator app (or a manual TOTP check)
  before matter mutations. Sign-in still works without MFA; the workspace does
  not.
- S03 budget accounting reads `run_budget_microusd`. This slice only stores it.
