#!/usr/bin/env bash
#
# Local PostgreSQL bootstrap for the Patent Enrichment Platform dev environment.
#
# Runs a self-contained Postgres cluster as the current (non-root) user, with no
# system service and no sudo. Idempotent: safe to run on every boot. It ensures
# the cluster exists, is running, and that the two-role RLS model is provisioned:
#
#   - owner/migration role : the initdb bootstrap superuser (owns tables, runs
#                            migrations + rls.sql, bypasses RLS by design).
#   - application role      : patent_app_rls (LOGIN, NOSUPERUSER, NOBYPASSRLS) so
#                            row-level security is actually enforced on app reads.
#
# Local trust auth on 127.0.0.1 is used because this is a single-user dev VM; RLS
# (a role-privilege property) is enforced regardless of the auth method. Do NOT
# use trust auth outside a local development machine.
set -euo pipefail

PG_VERSION="${PG_VERSION:-16}"
PG_BIN="/usr/lib/postgresql/${PG_VERSION}/bin"
PGDATA="${PGDATA:-$HOME/.local/share/patent/pgdata}"
PGPORT="${PGPORT:-5432}"
PGHOST_TCP="127.0.0.1"
PG_LOG="${PG_LOG:-$HOME/.local/share/patent/postgres.log}"

DB_NAME="${PATENT_DB_NAME:-patent}"
OWNER_ROLE="$(id -un)"           # initdb bootstrap superuser == current OS user
APP_ROLE="${PATENT_APP_ROLE:-patent_app_rls}"

log() { printf '[db] %s\n' "$*"; }

if [[ ! -x "$PG_BIN/initdb" ]]; then
  echo "[db] ERROR: PostgreSQL ${PG_VERSION} binaries not found at $PG_BIN" >&2
  echo "[db] Install with: sudo apt-get install -y postgresql postgresql-contrib" >&2
  exit 1
fi

mkdir -p "$(dirname "$PGDATA")"

# 1. Initialize the cluster once (trust auth for local dev; see header note).
if [[ ! -s "$PGDATA/PG_VERSION" ]]; then
  log "Initializing cluster at $PGDATA"
  "$PG_BIN/initdb" -D "$PGDATA" \
    --auth-local=trust --auth-host=trust \
    --encoding=UTF8 >/dev/null
  # Keep the cluster private to localhost.
  {
    echo "listen_addresses = '127.0.0.1'"
    echo "port = $PGPORT"
    echo "unix_socket_directories = '/tmp'"
  } >>"$PGDATA/postgresql.conf"
else
  log "Reusing existing cluster at $PGDATA"
fi

# 2. Start the server if it is not already accepting connections.
if "$PG_BIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
  log "PostgreSQL already running"
else
  log "Starting PostgreSQL (log: $PG_LOG)"
  "$PG_BIN/pg_ctl" -D "$PGDATA" -l "$PG_LOG" \
    -o "-p $PGPORT -k /tmp" -w start >/dev/null
fi

# 3. Wait for readiness.
for _ in $(seq 1 30); do
  if "$PG_BIN/pg_isready" -h "$PGHOST_TCP" -p "$PGPORT" -q; then break; fi
  sleep 1
done
"$PG_BIN/pg_isready" -h "$PGHOST_TCP" -p "$PGPORT" -q

psql() { "$PG_BIN/psql" -h "$PGHOST_TCP" -p "$PGPORT" -d postgres -v ON_ERROR_STOP=1 "$@"; }

# 4. Application role: LOGIN, non-superuser, cannot bypass RLS.
if [[ -z "$(psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$APP_ROLE'")" ]]; then
  log "Creating application role '$APP_ROLE' (NOSUPERUSER NOBYPASSRLS)"
  psql -c "CREATE ROLE $APP_ROLE LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;"
else
  log "Application role '$APP_ROLE' already exists"
  psql -c "ALTER ROLE $APP_ROLE LOGIN NOSUPERUSER NOBYPASSRLS;"
fi

# 5. Database owned by the migration/owner role.
if [[ -z "$(psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")" ]]; then
  log "Creating database '$DB_NAME' (owner: $OWNER_ROLE)"
  psql -c "CREATE DATABASE $DB_NAME OWNER $OWNER_ROLE;"
else
  log "Database '$DB_NAME' already exists"
fi
psql -c "GRANT CONNECT ON DATABASE $DB_NAME TO $APP_ROLE;"

log "Ready:"
log "  DATABASE_MIGRATION_URL=postgresql://$OWNER_ROLE@$PGHOST_TCP:$PGPORT/$DB_NAME"
log "  DATABASE_URL=postgresql://$APP_ROLE@$PGHOST_TCP:$PGPORT/$DB_NAME"
