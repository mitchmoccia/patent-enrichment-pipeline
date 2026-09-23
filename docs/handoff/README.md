# Patent Enrichment Platform — Architecture and Cursor Handoff

Prepared for Mitch Moccia / Xpancom. September 10, 2026.

This package specifies an ambitious patent development, research, drafting and review platform. Input an idea and artifacts; produce an evidence-linked technical model, supported claim strategy, coherent application package and private review dossier.

The initial release scope is US software and computer-implemented utility inventions, with individual self-filer and verified practitioner/entity modes. Expert-quality drafting is a benchmark objective; this architecture does not establish attorney equivalence or predict patent income.

## Package map

| File | Purpose |
|---|---|
| [CURSOR_START_HERE.md](CURSOR_START_HERE.md) | Agent instructions, reading order and copyable build prompt |
| [PATENT_ENRICHMENT_ARCHITECTURE.md](PATENT_ENRICHMENT_ARCHITECTURE.md) | Complete architecture, system boundaries, UX, data, pipeline, security and operations |
| [PIPELINE_GATES.md](PIPELINE_GATES.md) | Human-readable acceptance and recovery contracts for G00–G16 |
| [BUILD_SLICES.md](BUILD_SLICES.md) | Eighteen ordered delivery slices, S00–S17 |
| [STACK_BASELINE.json](STACK_BASELINE.json) | Current registry observations, engines and peer metadata |
| [contracts/domain.ts](contracts/domain.ts) | Evidence, claims, reviews, manifests and workflow data contracts |
| [contracts/ports.ts](contracts/ports.ts) | Source adapters, gate/export/release services and worker/event contracts |
| [policies/gates.json](policies/gates.json) | Machine-readable gates, dependencies, release profiles and initial limits |
| [policies/roles.json](policies/roles.json) | Fifteen bounded AI roles and server-enforced tool permissions |
| [fixtures/agent-spending-authority.json](fixtures/agent-spending-authority.json) | Synthetic engineering case with fault scenarios and expected pipeline defects |
| [docs/IMPLEMENTATION_DETAILS.md](docs/IMPLEMENTATION_DETAILS.md) | Transaction, RLS, revision, workflow, manifest, document and deployment decisions |
| [docs/EVALUATION_PROTOCOL.md](docs/EVALUATION_PROTOCOL.md) | Independent practitioner benchmark, defect corpus and release criteria |
| [docs/SOURCES.md](docs/SOURCES.md) | Primary legal/technical sources and explicit verification limits |
| [docs/HANDOFF_VALIDATION.md](docs/HANDOFF_VALIDATION.md) | Checks performed on this handoff package |

## Design commitments

- Seventeen gates address authorization, artifact integrity, mechanism, provenance, research, claim scope, disclosure, challenge, economics, export, release and prosecution.
- Broad/core/fallback claims and an adversarial design-around laboratory focus on useful defensible scope.
- An immutable evidence and support graph prevents model-generated detail from becoming invented source evidence.
- Durable workflows, atomic cost reservations and scoped workers make long runs recoverable and bounded.
- A clean application package and a separate private dossier serve different audiences.
- Final approval binds an exact snapshot and exact file hashes.
- Evaluation measures substantive quality, source fidelity, repair effort and operational failures.

## Technology baseline

Next.js 16.3.4, React 19.3.0, Tailwind 4.3.3 and TypeScript 7.0.2 were observed in the npm registry on the research date. The design includes AI SDK, Workflow, Neon/Drizzle, Better Auth, private S3/KMS, ECS workers, Stripe and PostHog. Cursor must verify compatible current stable releases and create the actual lockfile.

## How to use

Extract the complete archive into the designated repository's documentation area or make this folder available to Cursor. Open CURSOR_START_HERE.md, use its suggested instruction, and execute BUILD_SLICES.md.

The files are an architecture and implementation handoff, not an already built or deployed application. The supplied TypeScript contracts require runtime schemas and services; the policy catalogs require implemented evaluators. No external filing, legal representation, search subscription or deployment was performed to create this package.

