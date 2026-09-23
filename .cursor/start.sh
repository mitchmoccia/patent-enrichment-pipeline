#!/usr/bin/env bash
#
# Cloud Agent start step. Runs on every boot BEFORE the terminals launch.
#
# The Postgres *process* does not survive a reboot/new pod even though its data
# directory does, so this restarts the cluster and re-applies the idempotent
# migrations. Dependency installation and library builds stay in install.sh.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

log() { printf '[start] %s\n' "$*"; }

# Ensure the cluster is running and the RLS role model exists.
bash .cursor/db.sh

# Ensure a local .env exists (gitignored; recreated if absent).
bash .cursor/write-dotenv.sh

# Re-apply migrations idempotently so the schema is guaranteed present.
# (db:migrate runs packages/db/src/migrate.ts via tsx — source, no prebuild.)
if [[ -f packages/db/src/migrate.ts ]]; then
  log "Applying database migrations + RLS (idempotent)"
  pnpm --filter @patent/db db:migrate
fi

log "Start step complete — web dev server launches in the 'web' terminal."
