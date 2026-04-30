#!/usr/bin/env bash
set -euo pipefail

SQLCMD=""
for candidate in /opt/mssql-tools18/bin/sqlcmd /opt/mssql-tools/bin/sqlcmd; do
  if [ -x "$candidate" ]; then
    SQLCMD="$candidate"
    break
  fi
done

if [ -z "$SQLCMD" ]; then
  echo "sqlcmd was not found in this SQL Server image." >&2
  exit 1
fi

SQLCMD_TRUST_ARG=""
if [[ "$SQLCMD" == *mssql-tools18* ]]; then
  SQLCMD_TRUST_ARG="-C"
fi

DB_NAME="${MSSQL_DB:-student_db}"

echo "Waiting for SQL Server to accept connections..."
ready=0
for _ in {1..60}; do
  if "$SQLCMD" \
    -S mssql \
    -U sa \
    -P "${MSSQL_SA_PASSWORD}" \
    $SQLCMD_TRUST_ARG \
    -Q "SELECT 1" >/dev/null 2>&1; then
    ready=1
    break
  fi

  sleep 2
done

if [ "$ready" -ne 1 ]; then
  echo "SQL Server did not become ready in time." >&2
  exit 1
fi

echo "Creating SQL Server database '$DB_NAME' if it does not exist..."
"$SQLCMD" \
  -S mssql \
  -U sa \
  -P "${MSSQL_SA_PASSWORD}" \
  $SQLCMD_TRUST_ARG \
  -b \
  -Q "IF DB_ID(N'${DB_NAME}') IS NULL BEGIN EXEC(N'CREATE DATABASE [${DB_NAME}]'); END"

echo "SQL Server database '$DB_NAME' is ready."
