# ADR 0002: Tenant isolation via RLS, and the Neon role model

- Status: Accepted
- Date: 2026-09-10
- Slice: S01 (Identity, matter permissions, storage schema)

## Context

The architecture requires that a matter created by one tenant cannot be accessed
by another, enforced at both the application and database layers, using Postgres
RLS with transaction-local tenant context and separate migration vs application
database roles.

## Decisions

1. **Driver.** Use the `node-postgres` (pg) driver, not the Neon HTTP driver.
   RLS relies on transaction-local `set_config('app.tenant_id', ..., true)`
   (SET LOCAL), which requires every statement to run on one pinned
   session/transaction. `withTenant()` opens a transaction, sets the context, and
   runs the queries there.

2. **Two roles.** Migrations and `SECURITY DEFINER` helpers run as the owner
   role (`neondb_owner`), which owns the tables and therefore bypasses RLS. The
   application connects as a **non-owner** role that is fully subject to RLS.

3. **Neon `BYPASSRLS` caveat (important).** Neon's API/console-created roles are
   granted `BYPASSRLS` and membership in `neon_superuser`, which silently defeats
   RLS. The owner role cannot `ALTER`/`DROP` such a role (it is a peer, not a
   superuser). The application role is therefore a **SQL-created** role
   (`patent_app_rls`) — `CREATE ROLE ... NOBYPASSRLS` — because SQL-created roles
   default to `NOBYPASSRLS`. This was confirmed empirically: with the API role,
   isolation tests failed (RLS bypassed); with the SQL role, all pass.

4. **ACL checks via `SECURITY DEFINER`.** `app_can_access_matter()` is a
   `SECURITY DEFINER` function with a fixed empty `search_path`, so policies can
   check matter ACL membership without RLS recursion.

5. **Composite foreign keys.** Matter-owned tables carry `(tenant_id, matter_id)`
   composite FKs so cross-tenant/cross-matter links are impossible even before
   RLS evaluation.

## Consequences

- Isolation is verified by automated tests against a real Neon database: 9 DB-layer
  RLS tests and 7 application-layer authorization tests.
- Follow-up hardening: the unused API-created `patent_app` role still carries
  `BYPASSRLS`; it should be removed via the Neon console/API (it cannot be dropped
  by the owner role over SQL). Auth tables (user/session/…) currently have no RLS
  and are managed by Better Auth through the same role; adding RLS there is future
  hardening.
