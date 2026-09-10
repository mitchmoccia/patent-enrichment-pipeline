# Implementation Decisions and Transaction Patterns

This companion closes gaps that are easy to miss when implementing the high-level architecture. It specifies intended behavior, not tested production code. Use the installed package documentation when translating these patterns into Drizzle, AI SDK and Workflow APIs.

## 1 Domain module boundaries

Route Handlers and Server Actions share application services. A route authenticates and validates transport input; the service authorizes the operation, applies the domain transition and persists it. Model orchestration cannot bypass that service by writing directly to tables.

Keep pure rules in packages/domain: claim dependency validation, structured scope diffs, budget arithmetic, gate readiness, dependency invalidation and manifest canonicalization. Put source and model calls behind the ports in contracts/ports.ts.

The application database is the authority for business state. Workflow execution history helps resume work but is not the user's matter record. Rebuilding a workflow deployment must not erase pending decisions or change a filed baseline.

## 2 Required database constraints

For every matter-owned table, use a tenant and matter composite key in references. A UUID being globally unique does not establish permission to link it.

| Relation | Required constraint or index |
|---|---|
| matters | Unique tenant_id/id; monotonic head_revision updated under concurrency control |
| matter_acl | Unique tenant_id/matter_id/principal_id; indexed active access checks |
| artifact_versions | Unique tenant_id/matter_id/id; required SHA-256; immutable original object version |
| source_spans | Composite FK to artifact version; stable locator and extraction version |
| claims and claim_versions | Stable claim identity; unique claim/revision; selected version belongs to same matter |
| support_links | Composite FKs for claim, paragraph and source records; typed combination relationship |
| matter_snapshots | Unique matter/revision; immutable digest and complete referenced version set |
| gate_evaluations | Index snapshot/gate/policy/dependency digest; immutable historical evaluations |
| approvals | Immutable snapshot and manifest bindings; revocation recorded separately |
| idempotency_commands | Unique tenant/actor/operation/key; canonical request hash and stored response |
| step_attempts | Unique run/stage/attempt; current fencing token checked at commit |
| outbox | Unique event identity; delivery attempts and next attempt time; no sensitive payload duplication |
| reservations | Unique operation identity; nonnegative amount; explicit unknown/reconciled status |
| webhook_events | Unique provider/event identity; verified payload hash |
| docket_events | Source and rule version required for confirmed dates |

Use checks for enumerations, nonnegative integer amounts and required status-dependent fields. Enforce cross-row invariants in a locked transaction or a carefully reviewed database constraint/trigger. An ORM type alone does not enforce a concurrent invariant.

Critical provenance records are append-only for application roles. Corrections create successor records with a supersedes link and reason. Delete according to the actual retention policy through a privileged audited deletion service.

## 3 RLS and connection context

Use three role classes: migration owner, narrowly scoped application role, and isolated maintenance roles. Do not use a Neon project owner or a BYPASSRLS database role for normal requests.

Every request or worker command obtains a transaction-capable connection, begins a transaction, establishes transaction-local tenant/actor/purpose settings, runs the authorized queries on that same connection, and commits or rolls back. Clear-on-transaction-end behavior is essential with pools.

RLS should enforce both tenant membership and matter permissions where practical. If an ACL helper uses SECURITY DEFINER, restrict its execution rights, set a fixed safe search_path and avoid recursive policies. Review and test its exact implementation.

The server derives context from verified identity. A caller-supplied tenant ID or model tool argument is never the authority for session context. RLS does not protect a system that hands unrestricted database credentials to clients.

Verify local PostgreSQL behavior and the actual selected Neon connection path. Do not infer transaction semantics from similar-looking query syntax. Include concurrent pooled-connection tests because sequential happy paths will miss context leakage.

## 4 Command transaction

Use this order for a state-changing command:

1. Authenticate, load current identity/capacity and validate the runtime request schema.
2. Resolve matter access and processing policy from the server.
3. Begin the scoped transaction and reserve or read the idempotency record.
4. A repeated key with a different canonical request hash returns conflict.
5. For a matching completed command, recheck current access before returning the stored result.
6. Lock or compare the expected matter revision.
7. Apply the legal domain transition and write the new immutable records.
8. Write audit event and outbox event in the same transaction.
9. Commit before dispatching external work.
10. Return persisted IDs and actual status.

Never keep a database transaction open while waiting on a language model, an external search or a human. A failed external call resumes through another command or stage attempt.

Use bounded retries only for recognized transactional conflicts. Re-read the intended input revision on retry; do not silently apply a user edit against a different claim draft.

## 5 Snapshot and invalidation computation

A snapshot is a manifest of exact immutable versions, not a timestamp over mutable rows. Its digest must include the rule and model policy versions plus the relevant decision-state digest.

Define input sets for each gate in policies/gates.json. Compute a dependency digest from sorted typed IDs, their content hashes and the applicable evaluator version. A stable ID whose content is mutable cannot serve as an unchanged dependency.

Examples:

| Change | Required reassessment |
|---|---|
| Claim condition removed | Claim parse, support, art, eligibility, alternatives, disclosure consistency, review, export and release |
| Source OCR correction | Every assertion, mapping and paragraph relying on the corrected span |
| New human contribution account | Inventorship/ownership and any changed claim or embodiment scope |
| Rule-pack replacement | Affected legal assessments, reviewed issues and release readiness |
| Font or page-break fix | Render/content checks, package hash and new release approval |
| Prior-art provider outage discovered | Search coverage and dependent conclusions |
| Membership revoked | Authorization immediately; invalidate affected pending review capacity |

A deterministic carry-forward service may create a new gate binding only if its full declared dependency digest is identical. It records the predecessor evaluation and the reason. Final release approval never carries forward.

Resolve “fixed” findings only after the corrective artifact exists and the affected check has been rerun. A model stating that it fixed the problem is not evidence of the fix.

## 6 Durable stage execution

A stage record identifies input snapshot, policy, role version and output contract. Attempts acquire a lease with a monotonically increasing fencing token.

A stage worker reads immutable inputs, checks current authorization, reserves its maximum authorized cost, records a prepared external operation and commits. It then calls the approved external provider outside the transaction.

On response, validate schema, source IDs, provenance and tool results before committing outputs. The commit checks the current attempt fence. A stale attempt can preserve a quarantined diagnostic artifact but cannot replace the accepted stage result.

If the provider accepted a request but no result was received, set external outcome to unknown. Retain the cost reservation until usage reconciliation or an authorized bounded policy resolves it. If the provider has no idempotency or status lookup, the UI must show that retry could incur another charge.

Cancellation stops new stage dispatch. It does not undo completed model calls or guarantee termination of an in-flight provider request. Persist late results safely and reconcile actual costs.

## 7 Human decisions and workflow hooks

Create the pending decision in the database before presenting it in the UI. The human acts through a normal authorized application command. An outbox dispatcher then notifies the workflow.

Use the hook/signal APIs supported by the pinned Workflow version. Keep a durable database polling/reconciliation path so a signal racing with hook registration cannot lose the decision. Test early delivery, duplicate delivery, expired hook and deployment restart.

A resume payload contains a decision ID, not a trusted “approved=true” assertion. The resumed stage reads the authoritative decision, validates its snapshot and verifies that it still applies.

Timeouts create reminders or a paused state. They never imply consent or convert an unresolved material issue into a pass.

## 8 Immutable manifests and detached approvals

Avoid a circular hash dependency between files, the manifest and the approval:

1. Generate all application, form and private-review payload files from a frozen snapshot.
2. Validate and hash their exact bytes.
3. Produce an immutable content manifest listing those payload files. It excludes itself and detached approval records from its file list.
4. Serialize that manifest with a versioned deterministic canonical-JSON routine and compute its digest.
5. Ask the authorized human to approve that digest and those exact files.
6. Store a detached approval receipt binding the snapshot and manifest digest.
7. Assemble an outer ZIP containing the payload files, manifest and detached receipt.

PackageRecord carries mutable preparation/release state. PackageManifest stays immutable. Revocation is a separate event or record; do not edit the originally approved manifest.

A replacement export gets a new manifest and requires a new approval. The raw ZIP hash may differ because of archive metadata unless reproducibility controls normalize it; record both the outer archive hash and the authoritative per-file manifest.

Clean application content must not contain the private issue dossier, AI prompts, reviewer deliberations or speculative licensing discussion. The application itself still needs the actual substantive disclosure; “clean” never means deleting inconvenient technical limitations or required disclosure information.

## 9 Document engine detail

Use a versioned application AST as the sole selected content source. Each paragraph has stable identity, accepted text and support links. Renderers consume that tree; do not ask separate models to independently regenerate DOCX and PDF.

Choose a maintained DOCX generator and a containerized office/PDF rendering route after checking current license and rendering behavior. Pin renderer image, fonts, locale and transformation version. Use Python libraries for extraction/OCR where useful, while keeping the public application contracts in TypeScript.

Render deterministic figures from typed graph/geometry specifications. Sanitize SVG, prohibit external references and scripts, embed approved fonts or convert text appropriately, and retain legible numerals at final page size.

Check section order, claim numbering, dependencies, figure numbering, unsupported glyphs, equations, margins, page overflow and text extraction. Compare selected textual content before and after conversion with an explicit normalization policy; never normalize away legally meaningful negation, operators or quantities.

The filer must inspect the official portal's generated view and validation feedback. Local DOCX/PDF equality does not establish that a third-party portal has interpreted every feature identically. [USPTO DOCX guidance](https://www.uspto.gov/patents/docx)

## 10 API transport and editing

Use POST commands for mutations. Treat Server Actions as public server endpoints requiring the same authorization as API routes. Use read-only Server Components for matter views and Client Components for interactive editing and visualization.

Return stable error codes with issue IDs, next action and whether retry is safe. A 202 response means accepted for processing, never completed analysis.

For collaborative editing, start with optimistic revisions and explicit merge handling. Do not add a CRDT framework until concurrent real-time editing is a measured need. Preserve human changes and show the base and proposed patch. Rejected model patches remain in the private history.

For event delivery, use a durable per-matter sequence and authorized cursor. A reconnect receives events after that cursor, while the UI periodically reconciles authoritative run state. Events are hints to refetch; they are not the only record of a completed gate.

## 11 Environments and infrastructure

| Environment | Data and dependencies | Release rules |
|---|---|---|
| Local | Docker-backed PostgreSQL/storage stubs and clearly synthetic fixtures; optional approved real adapters | No production credentials or confidential imports by default |
| CI | Ephemeral database, service stubs and deterministic fixtures | No public model calls in untrusted pull requests |
| Preview | Isolated auth, database branch and storage prefix/account | Synthetic or explicitly approved data only |
| Staging | Separate managed database, workers and approved provider routes | Full integration and restoration tests |
| Production | Approved regions, backups, retention and service identities | Reviewed artifact, migration and route promotion |

Use GitHub Actions for install/typecheck/build, unit/integration tests, security checks and deployment preparation. Pin actions and worker images to reviewed versions/digests. Use least-privilege OIDC federation where supported instead of persistent cloud deployment keys.

Use infrastructure-as-code for S3/KMS/SQS/ECS permissions, worker services and operational alarms. A suitable initial choice is AWS CDK in TypeScript, pinned at bootstrap; choose a repository's established alternative if it already manages this infrastructure coherently.

Apply expand/migrate/contract database changes. Deploy readers that tolerate old and new schema versions before removing columns. Incompatible document or event schemas need migration readers and versioned handlers.

Run periodic restoration drills including database, object versions, manifests and encryption-key access. A database-only backup is insufficient when the actual evidence lives in object storage.

## 12 Configuration and estimates

The initial $25 run cap in the policy catalog is a product configuration choice. It is not a promise that comprehensive search and drafting costs $25. Retrieve current model/search/storage prices into a reviewed pricing catalog at implementation, record actual usage, and expose taxes or vendor charges where applicable.

Do not give a calendar completion estimate by counting model roles. After S00–S04, measure throughput, integration readiness and review effort, then produce a milestone forecast with explicit staffing assumptions. External counsel, search licenses and credential setup can dominate elapsed time even when code generation is fast.

Track integration readiness as implemented/configured/verified rather than a single boolean. Real provider keys, permissible data terms and demonstrated test traffic are separate facts.

