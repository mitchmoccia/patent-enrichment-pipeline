#!/usr/bin/env bash
#
# Cloud Agent install step for the Patent Enrichment Platform.
#
# Idempotent repository bootstrap after checkout:
#   1. Ensure PostgreSQL server binaries are present.
#   2. Install Node dependencies (pnpm, frozen lockfile).
#   3. Provision a local Postgres cluster + the two-role RLS model.
#   4. Generate a local .env (if missing) and apply migrations + RLS.
#   5. Print an honest integration inventory.
#
# The internal packages (@patent/contracts, @patent/db, @patent/application)
# ship TypeScript source and are transpiled by Next (transpilePackages), so no
# library prebuild is required here.
#
# Per-boot concerns (restarting Postgres, re-applying idempotent migrations)
# live in .cursor/start.sh so this step is not required to run again on new pods.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

log() { printf '[install] %s\n' "$*"; }

# --- 1. PostgreSQL server (system package; baked into the environment snapshot).
if ! ls /usr/lib/postgresql/*/bin/initdb >/dev/null 2>&1; then
  log "Installing PostgreSQL server + client"
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
else
  log "PostgreSQL binaries already present"
fi

# --- 2. Node dependencies.
corepack enable >/dev/null 2>&1 || true
log "Installing Node dependencies (pnpm --frozen-lockfile)"
pnpm install --frozen-lockfile

# --- 3. Local Postgres cluster + roles + database.
log "Provisioning local PostgreSQL cluster"
bash .cursor/db.sh

# --- 4. Local .env + migrations (Drizzle schema + RLS policies).
bash .cursor/write-dotenv.sh
log "Applying database migrations + RLS"
pnpm --filter @patent/db db:migrate

# --- 5. Honest integration inventory (load .env so it reflects local config).
set -a; . ./.env; set +a
log "Integration inventory:"
pnpm check:env || true

log "Toolchain versions:"
log "  node:   $(node --version 2>&1)"
log "  pnpm:   $(pnpm --version 2>&1)"
log "  psql:   $(/usr/lib/postgresql/*/bin/psql --version 2>&1 | head -n1)"
log "Install step complete."
