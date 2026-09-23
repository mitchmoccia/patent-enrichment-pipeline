# Cursor Build Slices

Build the complete platform defined in PATENT_ENRICHMENT_ARCHITECTURE.md. Read CURSOR_START_HERE.md first. This is an ordered delivery plan with reviewable outcomes, not a list of independent demos.

## Execution rules

Complete each slice through UI, service, persistence, errors and meaningful verification. Keep business rules in shared packages. Implement real storage, real state and actual adapter errors. Fixture mode must be explicit and must never share a production namespace.

Each slice ends with a short evidence record: what works, commands executed, meaningful test results, source revision, deployment state if any, and external dependencies still unconfigured. “Written,” “tested,” “committed,” “pushed,” and “deployed” are separate states.

Do not introduce placeholders that return successful patent analysis. An adapter can return unavailable; an analysis can return insufficient information. Both are better than fabricated success.

Authorization to build covers local implementation and reversible development work in the user-designated repository. It does not authorize creating a paid vendor account, accepting legal-service terms, filing a patent, sending invitations, or publishing confidential matter material. Prepare concrete outputs before requesting any additional external authorization.

## Proposed repository layout

| Path | Responsibility |
|---|---|
| apps/web | Next.js app, RSC reads, Client Components and route/action adapters |
| apps/document-worker | Quarantine, extraction, OCR and render task entry points |
| packages/contracts | Zod schemas, domain types, API and event definitions |
| packages/db | Drizzle schema, migrations, roles and RLS |
| packages/domain | Pure mechanism, claim, support, gate and release logic |
| packages/application | Authorized command/query services |
| packages/workflows | Durable stage orchestration and persisted decisions |
| packages/ai | Role contracts, prompts, approved model routes and output validation |
| packages/research | Source adapters, hybrid retrieval and reference verification |
| packages/documents | Canonical document tree, figures, forms and exports |
| packages/security | Policy context, artifact/URL safeguards and service auth |
| packages/billing | Entitlements, budget reservations and usage reconciliation |
| packages/evaluation | Fixtures, benchmark runners and human evaluation records |
| packages/ui | Reusable visual components and tokens |
| infra | Worker images, deployment configuration and environment documentation |
| docs | Architecture decisions, runbooks and verification evidence |

This monorepo structure is a proposal. If the designated repository has a coherent established layout, map these boundaries into it rather than starting a conflicting architecture. Preserve unrelated work.

## S00 Bootstrap and dependency verification

**Goal:** Establish a reproducible current stack and honest integration inventory.

Read package manifests and applicable repository instructions. Compare the registry observations in STACK_BASELINE.json with current stable versions and security advisories. Install compatible versions, pin them and commit a lockfile. Do not use canary or beta packages just to display a larger version number.

Read bundled Next.js, AI SDK and Workflow documentation for installed versions. Confirm Node runtime compatibility, TypeScript tooling, auth peer support, Drizzle migrations and worker build images. The baseline AI SDK is v7 while Workflow stable is v4; avoid importing examples from the wrong generation.

Create environment variable validation and .env.example with placeholders only. Choose a proposed repository name only if a new repository is needed; do not assume one has already been created.

**Deliver:** Running shell app, package boundaries, build/lint/typecheck scripts, CI baseline and an ADR recording actual versions.

**Verify:** Clean install and production build in CI; no undeclared dependency on the developer's global environment; explicit adapter status page with unconfigured sources.

## S01 Identity matter permissions and storage schema

**Goal:** A user can create a private matter that another tenant cannot access.

Implement Better Auth, organizations, membership, MFA path and matter ACL. Create initial Drizzle schema from contracts/domain.ts. Add transaction-local tenant context, RLS and composite foreign keys. Use separate migration and application database roles.

Create /app, matter creation and matter overview routes. Store the user's initial idea as a source artifact or versioned assertion, not only as a title field. Create immutable snapshot scaffolding.

**Deliver:** Real login, private matter creation, authorized reads and editable initial goal.

**Verify:** Cross-tenant reads/writes/source-link attempts fail at both application and database layers. Revoked access is rejected by Server Actions and Route Handlers independently of proxy.ts.

## S02 Artifact quarantine and evidence viewer

**Goal:** A user uploads authentic material and can inspect exactly what the system extracted.

Implement upload intents, private S3 objects, completion verification, scanning task dispatch and parser results. Initial types: text, PDF, DOCX, JSON, images and source ZIP. Add CSV and media transcription through explicit additional parser capabilities.

Store source spans and expose page/paragraph/line locators. Preserve original and extracted versions. Show OCR uncertainty, unsupported formats and processing errors.

**Deliver:** Evidence workspace with original/extracted comparison and source-linked assertions.

**Verify:** Hash mismatch, unsafe archive path, excessive decompression, macro content, malformed PDF and dropped-negation fixtures. No uploaded code executes.

## S03 Durable runs budget accounting and events

**Goal:** A run survives browser closure, retries and duplicate callbacks without losing work or silently exceeding its approved spending cap.

Implement run/stage/attempt tables, outbox, worker job tokens, external operation records, cost reservations and workflow start/resume. Implement idempotent commands and fencing. Expose ordered run events with reconnection and polling fallback.

Do not put the whole pipeline inside a streaming HTTP request. A bounded sidecar assistant may stream text, but the run status comes from persisted records.

**Deliver:** Start, pause, cancel and resume controls; a simple real ingestion-to-analysis workflow.

**Verify:** Crash after a commit, retry after a provider timeout, duplicate callback, out-of-order event, stale worker result and budget reservation race. Unknown provider costs remain visible.

## S04 Mechanism extraction and targeted questions

**Goal:** Idea plus artifacts becomes a coherent invention model with honest unknowns.

Implement the intake analyst and systems engineer contracts. Extract actors, state, operations, invariants, technical effects and contradictions. Build the invention workspace and question inbox.

Inventor answers become dated evidence records. Accepting a model suggestion keeps its model origin and actual acceptance date. Ask consequence-based questions with links to affected features.

**Deliver:** A user can resolve a missing mechanism detail and watch the successor snapshot invalidate the affected analysis.

**Verify:** Agent-spending fixture asks about uncertain payment outcomes; vague ideas produce development tasks; no proposed mechanism is labeled as an original supplied fact.

## S05 Contribution chronology and legal-rule registry

**Goal:** The system knows who supplied which substance, what was filed when, and which rules it is using.

Implement separate inventor, applicant, owner and assignment-obligation records. Add disclosures/sale events and uncertain-date precision. Build contribution and priority views.

Implement legal sources with effective dates, supersession, applicability and reviewed rule-pack promotion. Seed the source register, but do not pretend legal counsel has approved it. Provide manual reviewer promotion and stale-rule alerts.

**Deliver:** A mode-aware matter rights and chronology panel; versioned legal-rule snapshots.

**Verify:** Historical AI inventorship guidance cannot be selected as current after supersession; a new embodiment cannot receive an old filing date; LLC applicant mode cannot select self-filer release.

## S06 Research adapters and hybrid retrieval

**Goal:** Searches produce identifiable actual sources and disclose their coverage limits.

Implement the SourceAdapter interface and adapter health checks. Ship user-imported reference support and at least one real provider integration supported by available credentials. Add EPO OPS and documented USPTO capabilities as access allows. Do not fabricate endpoints.

Create query preview, approved egress scope, bibliographic normalization, exact publication versions, source retrieval, full-text and vector indexing, reranking and family display.

**Deliver:** Research workspace with query plan, result list, original passages, provider failures and stop reason.

**Verify:** Unavailable full text remains unavailable; expired API keys do not become “zero matches”; a family date cannot replace a publication's actual disclosure date; tenant filters preserve isolation and search relevance.

## S07 Prior-art and eligibility analyses

**Goal:** The system produces structured arguments and counterarguments against current claim candidates.

Implement G05/G06 analyzers and typed findings. Separate anticipation, obviousness and technical similarity. Maintain legal prior-art eligibility as a reviewed record distinct from relevance. Retrieve and validate relied-on citations.

The UI must show claim limitations beside supporting reference passages and the specific arrangement analysis. Add eligibility questions grounded in actual technical operations.

**Deliver:** Reviewable prior-art charts and legal issue dossier with no invented success probability.

**Verify:** Fabricated citation, snippet-only reliance, wrong-date reference, distributed features across unrelated references, absent combination motivation, and generic AI/processor eligibility fixes.

## S08 Claim editor support graph and revision invalidation

**Goal:** Users can compare claim candidates, inspect their support, and edit without losing provenance.

Implement exact text plus reviewed claim AST, dependencies, limitation IDs, AND/OR/ordering semantics and actor mappings. Build broad/core/fallback comparison and support panes.

Generate candidate edits as patches against an expected revision. Include limitation and combination support, not only matching vocabulary. Implement semantic revision invalidation.

**Deliver:** Claim workspace with meaningful scope diffs, support status, source links and fallback structure.

**Verify:** Dependent-claim cycles, category mismatch, AND-to-OR change, deleted condition, contradictory quantified terms and support spread across incompatible embodiments.

## S09 Alternatives and design-around laboratory

**Goal:** The platform finds plausible competing implementations and shows what would change the protection strategy.

Implement independent challenger context, mutation operators, technical tradeoff records, finite scenario matrices and reviewable coverage mappings. Keep engineering feasibility separate from legal conclusions.

Add experiment-plan generation. Enable execution only in a separately configured sandbox with scoped files, no secrets, constrained networking and explicit compute budget.

**Deliver:** Side-by-side alternatives with preserved benefit, element mappings, assumptions and supported response options.

**Verify:** A design-around that removes an essential commercial benefit is not ranked as an equivalent substitute without explanation. A partition-tolerant alternative must state its consistency assumptions. AI proposals do not enter the selected disclosure automatically.

## S10 Specification editor and deterministic figures

**Goal:** A selected mechanism and claim strategy becomes coherent editable application content.

Implement the canonical document tree, terminology registry, section-specific drafting, whole-document consistency review and a Tiptap patent editor. Add diagram JSON, SVG generation, numeral management and figure descriptions.

Provide a proposed edit queue with merge handling. Preserve human edits. Support different application types without inventing universal form requirements.

**Deliver:** Specification, claim set, abstract and linked figures with source navigation.

**Verify:** Numerical claims require experiment evidence; hypothetical examples remain hypothetical; paragraph edits invalidate support; figure labels and text agree; no hidden prompt text or legal analysis enters clean sections.

## S11 Independent review and gate service

**Goal:** Completion reflects actual decisions and known evidence rather than model consensus.

Implement all pre-filing gate contracts and readiness evaluator. Add assignment, issue resolution, residual-risk acceptance and authenticated approval records.

Model role outputs can propose findings but cannot approve releases. Reviewers see concrete documents, affected clauses and evidence. Implement deterministic carry-forward only for unchanged dependency digests.

**Deliver:** Review workspace with actionable blockers, disagreements, exact revision comparison and mode-aware release capacity.

**Verify:** Fabricated citation survives three agreeing models but fails the validator; a stale reviewer approval cannot release a changed package; an administrator cannot impersonate practitioner capacity.

## S12 Export engine and clean package assembly

**Goal:** Approved content becomes accurate portable files.

Implement DOCX generation, PDF review rendering, page images, text comparison, form-template versioning, clean/review separation and cryptographic manifests. Create download authorization and expiring links.

Validate actual content and layout, not just file creation. Include raw JSON and CSV support maps for machine interoperability. Keep unsigned forms explicitly unexecuted.

**Deliver:** A complete downloadable working package and a releasable exact manifest.

**Verify:** Missing clause, altered Unicode symbol, orphan figure, bad claim numbering, hidden comments, metadata leakage, page overflow and stale manifest. An official portal rendering still requires filer inspection.

## S13 Commercial assessment and portfolio decision

**Goal:** The product can explain whether continued patent investment has a plausible business purpose.

Implement buyer hypotheses, substitutes, evidence requests, costs and transparent scenario formulas. Separate product cashflow from incremental patent value. Show operating, licensing/sale and defensive strategies.

The gate passes when the assessment is honestly completed, including a defer or stop recommendation. It does not require a positive sales story.

**Deliver:** Commercial dossier and portfolio decision record.

**Verify:** Missing market data remains unknown; unsupported licensing probabilities are rejected; a negative commercial conclusion does not erase engineering work.

## S14 Filing records docketing and prosecution

**Goal:** The platform accurately follows an application after an authorized person files it.

Implement receipt import, actual submitted-file reconciliation, filed baselines, office-action extraction, proposed deadlines and human confirmation. Add response-option generation and scope-impact diffs.

Add IDS candidate review and submission records. Create family continuity and support views. Keep official submission manual until an authorized integration is separately specified and verified.

**Deliver:** A user can import a receipt and office action, review proposed docket entries, and produce a supported response draft.

**Verify:** No receipt means no verified filed status; mismatched submitted files create a reconciliation issue; an unsupported amendment is blocked; confirmed deadlines retain source/rule context.

## S15 Billing operations and monitoring

**Goal:** The service can operate without uncontrolled cost or confidential analytics leakage.

Finish Stripe entitlements, webhook verification, subscription limits and transparent cost breakdowns. Connect metadata-only PostHog events and redacted error/trace monitoring. Add worker and provider health panels.

Implement user-enabled watch plans with explicit source/cadence/budget settings. No recurring task starts without its own approved plan. No automated demand letters.

**Deliver:** Operational dashboards, billing reconciliation, spend caps and private portfolio alerts.

**Verify:** Duplicate Stripe events, concurrent reservations, pricing-catalog change, cancelled run with incurred costs, metadata leakage, provider outages and unauthorized watch creation.

## S16 Security and disaster recovery release gate

**Goal:** Evidence supports a confidential multi-tenant pilot.

Test RLS, service authorization, role revocation, cache isolation, signed-link behavior, parser sandboxing, SSRF defenses, prompt injection, secrets detection and preview isolation.

Exercise backup restoration and deletion/retention behavior. Document subprocessors and actual data routes. Confirm workers cannot fetch arbitrary objects or export unapproved data.

**Deliver:** Threat model, tested mitigation evidence, restoration runbook and unresolved-risk list.

**Verify:** A fresh environment restores an authorized matter and its immutable records; private source data cannot be accessed across tenants; malicious artifact instructions cannot produce network or policy changes.

## S17 Practitioner benchmark and private pilot

**Goal:** Establish measured quality and a real complete journey.

Execute docs/EVALUATION_PROTOCOL.md on synthetic defect fixtures and rights-cleared matters. Record independent practitioner ratings, disagreements, repair effort and actual limitations.

Complete the golden journey from idea through release, then a sample receipt and office-action cycle. Validate on desktop and mobile with real persistence and a configured model/source route. Have the user and practitioner inspect the actual outputs.

**Deliver:** Private pilot with honest capability labels, benchmark report, deployment URL if deployment was authorized, and a precise list of remaining limitations.

**Verify:** All critical engineering gates pass; no unresolved critical defect in the released evaluation packages; public quality claims remain disabled unless justified by the evidence.

## Environment and secret inventory

| Name or category | Required purpose |
|---|---|
| DATABASE_URL | Scoped application connection |
| DATABASE_MIGRATION_URL | Separate privileged migration connection |
| BETTER_AUTH_SECRET and BETTER_AUTH_URL | Auth configuration |
| S3 bucket region and KMS identifiers | Private artifacts and encryption |
| Worker service identity and callback verification keys | Job authorization |
| Approved AI Gateway or provider credentials | Explicit model routes |
| Approved source-provider credentials | Patent and technical retrieval |
| Stripe secret and webhook verification key | Billing |
| PostHog project config | Metadata-only analytics |
| Error/OTel endpoint credentials | Redacted operations |
| Rule-pack signing or promotion identity | Controlled legal policy updates |

Use a secret manager or hosting-managed secrets. Never add actual values to this document, a fixture, a screenshot, or Git history. Environment validation must show a clear configuration error rather than a fake success.

## Completion evidence

The final Cursor report must include the implemented journey, repository/branch, exact commit if committed, push state, deployment state, meaningful verification results, configured/unconfigured adapters, and product limits. Do not describe a prototype as a live legal service.

The user should be able to inspect the app and download a real package. No final claim of completion based only on passing TypeScript or showing a static dashboard.

