# Cursor: Start Here

Build the Patent Enrichment Platform described in this handoff, end to end, in the repository the user designates. The deliverable is a working private application with real persistence, a real processing pipeline, truthful source integration, review workflows and accurate export packages.

The user supplies an idea and artifacts. The system develops a traceable technical model, researches relevant prior art, proposes supported claim strategies, challenges alternatives, drafts coherent application content, and prepares a package for an authorized human to review and release.

The initial supported domain is US software and computer-implemented utility inventions. Implement individual self-filer and verified practitioner/entity routes. Other jurisdictions and specialist domains remain development-only until their reviewed domain/rule packs are added.

## Read in this order

1. README.md.
2. PATENT_ENRICHMENT_ARCHITECTURE.md in full.
3. PIPELINE_GATES.md and policies/gates.json.
4. contracts/domain.ts and contracts/ports.ts.
5. docs/IMPLEMENTATION_DETAILS.md.
6. policies/roles.json.
7. BUILD_SLICES.md.
8. fixtures/agent-spending-authority.json and docs/EVALUATION_PROTOCOL.md.
9. STACK_BASELINE.json and docs/SOURCES.md.

Treat the package as an implementation specification. The TypeScript files are starter contracts, and the JSON files are policy specifications. Runtime validation, migrations, services, workers and UI still have to be built.

If you find a material contradiction, preserve the stronger evidence/authorization invariant, record an ADR describing the conflict, resolve it explicitly, and continue useful work. Never hide an unresolved contradiction behind a successful status.

## First actions

Inspect the actual repository, package manifests, applicable instructions, working tree and existing conventions. Preserve unrelated edits. If there is an established architecture, map the proposed package boundaries into it.

Confirm current stable dependency versions and security advisories. The September 10, 2026 registry baseline includes Next.js 16.3.4, React 19.3.0, Tailwind 4.3.3, TypeScript 7.0.2, AI SDK 7.0.97 and Workflow 4.8.8. Reverify and pin compatible installed versions; these observations are not a lockfile.

Use the actual installed Next.js, AI SDK and Workflow documentation. Public docs can target a different major. Do not mix Workflow v5 examples with a v4 package or an old AI SDK agent API with v7.

Create the implementation plan using S00–S17. Begin with a vertical slice that authenticates a user, creates a private matter, uploads an artifact, preserves evidence, runs a real bounded analysis, asks a material question and records a successor snapshot.

## Complete journey to implement

A user must be able to:

1. Sign in and create a private matter with a goal, applicant mode, processing policy and run budget.
2. Upload real artifacts and inspect original/extracted evidence.
3. Answer targeted questions about the technical mechanism, contributors and chronology.
4. Run approved research and see actual sources, mapping evidence and coverage limits.
5. Compare claim candidates, support, alternatives and commercial tradeoffs.
6. Edit claims and specification while preserving human changes and reopening affected checks.
7. Inspect independent challenges and resolve issues with evidence or an authorized residual-risk decision.
8. Generate matching DOCX/PDF, figures, support maps and a private dossier.
9. Approve the exact package in the correct capacity.
10. Import actual filing evidence, reconcile the submitted documents and manage a sample prosecution cycle.
11. Enable an optional bounded watch plan and inspect private evidence-backed alerts.
12. See actual usage, failures, current run status and integration readiness.

A static dashboard, a chat-only wrapper, a single long model prompt or a fake report generator is not this deliverable.

## Implementation invariants

- Original evidence and filed baselines are immutable; corrections are versioned.
- Supplied facts, actual observations, engineering proposals and legal/commercial assessments remain distinguishable.
- Human acceptance of a model proposal does not establish its earlier invention date or resolve inventorship by itself.
- The model cannot approve a gate, change permissions, sign, file, verify its own citation, or raise a spend cap.
- Citations must resolve to actual source versions; quotations and relied-on propositions are checked.
- Claim support includes combinations and ordering, not only individual word matches.
- Prior-art similarity, novelty, obviousness, eligibility, freedom to operate and commercial value are separate analyses.
- A changed claim invalidates all dependent analyses. A changed package requires new final approval.
- The immutable content manifest excludes itself and detached approval records; no circular hash construction.
- RLS, ACL and transaction-local context apply to web requests, jobs, search and export access.
- Provider uncertainty remains unknown; retries must not silently duplicate spend or filing.
- No mock provider can appear as a successful live integration.
- No official filed or granted state is inferred from a download, checkbox or model statement.
- US entity release requires the verified practitioner route; a self-filer is accurately labeled.
- Empty or negative findings are valid outcomes. Do not optimize the workflow to always recommend filing.

## Product experience

Build a serious evidence workspace. Use paper/graphite surfaces and restrained deep teal accents, strong typography, accessible contrast and generous document reading space. Avoid decorative dashboards, generic AI gradients, lime accents and animated agent theatrics.

The primary desktop experience combines a document or claim editor, linked evidence and actionable issues. Show the source passage when a user inspects an assertion. Show what a proposed edit changes and which analyses must rerun.

On mobile, support intake, questions, status, source inspection and review; use focused panes instead of squeezing the desktop three-column layout.

Write product text for inventors and practitioners. Use precise statuses such as “Needs inventor detail,” “Reference unavailable,” “Ready for your review,” and “Filing unconfirmed.” Technical provider codes belong in diagnostics.

## Work autonomously within the authorized build

Complete reversible implementation, fixes and verification without repeatedly asking permission for normal engineering choices. Before asking for a missing external dependency, finish the useful work that can proceed and present the exact configuration or decision needed.

Do not create paid accounts, accept third-party contracts, expose confidential matters, send review invitations, file applications or publicly deploy merely because a build slice mentions those capabilities. Existing explicit session authorization governs such actions.

An unavailable key is an integration limitation, not a reason to replace real behavior with fabricated success. Implement the adapter contract, error state, setup documentation and tests, then continue other slices.

Do not request an inventor's confidential material merely to test the UI; use the supplied synthetic fixture until the user authorizes real matter processing.

## Verification and completion reporting

Use meaningful unit/property tests for pure invariants, integration tests for database/worker/provider boundaries, and Playwright tests for complete user journeys. Test the actual selected Neon driver and workflow deployment path.

Each slice should leave inspectable evidence: implemented behavior, test commands/results, screenshots or render reports where useful, current commit if committed, and configuration limitations.

Before calling the application complete, execute the evaluation protocol and the golden journey. Verify real output bytes and rendered pages. Have an authorized user and qualified practitioner inspect the pilot outputs where the selected release mode requires it.

Report implementation, testing, commit, push and deployment as separate facts. Include remaining unsupported domains, unconfigured sources and unresolved limitations. “World-leading” is an aspiration to evaluate, not a label to hardcode into the product.

## Suggested opening instruction to Cursor

~~~text
Read CURSOR_START_HERE.md and the referenced handoff files in full. Build this
platform in the repository I have opened, preserving unrelated work and following
its applicable instructions. Start with S00 and continue through the ordered
slices. Implement complete vertical behavior, real persistence and honest adapter
states. Keep claim/evidence integrity, tenant isolation, bounded spending and
snapshot-bound human release as enforced domain rules. Verify each slice and keep
an evidence log. Complete all useful authorized work before asking for an external
credential or decision. Do not stop after planning, scaffolding or a static demo.
~~~

