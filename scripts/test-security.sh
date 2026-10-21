#!/usr/bin/env bash
# Runs the database security tests on a throwaway local PostgreSQL database.
# Usage: scripts/test-security.sh [psql connection options], e.g. scripts/test-security.sh -h /tmp -p 55434 -U postgres
# Every line printed should say PASS. Needs PostgreSQL 15+; pgvector is optional.
set -euo pipefail
cd "$(dirname "$0")/.."
DB=ekoa_security_test
PSQL=(psql "$@" -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null
has_vector=$("${PSQL[@]}" -d postgres -tAc "select count(*) from pg_available_extensions where name = 'vector'")
"${PSQL[@]}" -d $DB -f supabase/tests/supabase_stubs.sql >/dev/null
for f in supabase/migrations/*.sql; do
  if [ "$has_vector" = "0" ]; then
    sed -e '/create extension if not exists vector/d' -e '/embedding extensions.vector(1536),/d' "$f" | "${PSQL[@]}" -d $DB >/dev/null
  else
    "${PSQL[@]}" -d $DB -f "$f" >/dev/null
  fi
done
"${PSQL[@]}" -d $DB -f supabase/seed.sql >/dev/null
"${PSQL[@]}" -d $DB -f supabase/bootstrap-steward.sql >/dev/null
psql "$@" -d $DB -f supabase/tests/security_test.sql 2>&1 | grep -E "PASS|FAIL|ERROR"
