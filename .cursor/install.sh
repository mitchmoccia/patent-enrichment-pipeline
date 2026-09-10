#!/usr/bin/env bash
#
# Cloud Agent install step for patent-enrichment-pipeline.
#
# The repository is currently a greenfield project. This script is a safe no-op
# on an empty checkout and automatically installs dependencies once code is
# added (e.g. from SRD-driven work). It is idempotent: re-running it against an
# already-prepared checkout simply refreshes dependencies.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

log() { printf '[install] %s\n' "$*"; }

installed_something=0

# --- Node / TypeScript projects -------------------------------------------------
if [[ -f package.json ]]; then
  installed_something=1
  if [[ -f pnpm-lock.yaml ]]; then
    log "Detected pnpm-lock.yaml -> pnpm install --frozen-lockfile"
    corepack enable >/dev/null 2>&1 || true
    pnpm install --frozen-lockfile
  elif [[ -f yarn.lock ]]; then
    log "Detected yarn.lock -> yarn install --frozen-lockfile"
    corepack enable >/dev/null 2>&1 || true
    yarn install --frozen-lockfile
  elif [[ -f package-lock.json ]]; then
    log "Detected package-lock.json -> npm ci"
    npm ci
  else
    log "package.json without a lockfile -> npm install"
    npm install
  fi
fi

# --- Python projects ------------------------------------------------------------
if [[ -f pyproject.toml ]]; then
  installed_something=1
  log "Detected pyproject.toml -> pip install editable project"
  if grep -q '\[project.optional-dependencies\]' pyproject.toml && grep -q '^dev' pyproject.toml; then
    python3 -m pip install -e ".[dev]"
  else
    python3 -m pip install -e "."
  fi
elif [[ -f requirements.txt ]]; then
  installed_something=1
  log "Detected requirements.txt -> pip install -r requirements.txt"
  python3 -m pip install -r requirements.txt
fi

if [[ "$installed_something" -eq 0 ]]; then
  log "No dependency manifests found yet (empty project)."
  log "This is expected for a greenfield repo. Add package.json / pyproject.toml /"
  log "requirements.txt and this step will install them automatically."
fi

log "Toolchain versions:"
log "  python: $(python3 --version 2>&1)"
log "  node:   $(node --version 2>&1)"
log "Install step complete."
