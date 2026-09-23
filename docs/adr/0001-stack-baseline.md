# ADR 0001: Stack baseline and S00 bootstrap

- Status: Accepted
- Date: 2026-09-10
- Slice: S00 (Bootstrap and dependency verification)

## Context

`docs/handoff/STACK_BASELINE.json` records npm registry observations as of
2026-09-10 and explicitly states they are "registry observations, not an
integration-tested lockfile." BUILD_SLICES.md S00 requires verifying the current
stable versions against the registry, installing compatible versions, pinning
them, and committing a lockfile.

## Decision

The versions below were confirmed available on the npm registry from this
environment (`npm view <pkg> version`) and are pinned exactly. A `pnpm-lock.yaml`
is committed as the reproducible source of truth.

### Verified and pinned now (S00 shell)

| Package | Pinned | Role |
|---|---|---|
| next | 16.3.4 | App Router web app, Node runtime |
| react / react-dom | 19.3.0 | UI |
| typescript | 7.0.2 | Type system / tooling |
| tailwindcss / @tailwindcss/postcss | 4.3.3 | Styling |
| zod | 4.6.1 | Runtime validation boundaries |
| @biomejs/biome | 2.5.13 | Lint + format (single dev dependency) |

Package manager: `pnpm@10.33.3` (workspaces). Runtime: Node.js — baseline target
is Node 24 LTS; this environment runs Node 22.14, which satisfies every package's
declared engines (`next >=20.9`, `ai >=22`). Production images should pin Node 24.

### Verified available, introduced in their slices

To keep S00 lean and buildable, the following are confirmed present on the
registry at the baseline versions but are added when their slice needs them, so
the lockfile grows with actually-exercised code:

| Package | Version | Slice |
|---|---|---|
| drizzle-orm / drizzle-kit | 0.45.2 / 0.31.10 | S01 |
| better-auth | 1.7.4 | S01 |
| @neondatabase/serverless | 1.1.0 | S01 |
| ai | 7.0.97 | S04 |
| @ai-sdk/react | 4.0.100 | S04 |
| workflow | 4.8.8 | S03 |

## Notes and traps

- The AI SDK baseline is v7 while Workflow stable is v4. Use each package's
  bundled documentation for the installed major; do not mix a v5 Workflow example
  with the v4 runtime, or an old AI SDK agent API with v7.
- TypeScript 7.0.2 is the native compiler. CI runs `tsc --noEmit` to confirm the
  configured project type-checks under the installed toolchain.
- Model IDs are not hardcoded; approved routes are selected and evaluated per
  docs/handoff/docs/EVALUATION_PROTOCOL.md before use.

## Consequences

A clean `pnpm install` plus `pnpm build`, `pnpm typecheck`, and `pnpm lint`
succeed with no dependency on developer-global state. `pnpm check:env` reports the
honest integration inventory (all unconfigured at S00).
