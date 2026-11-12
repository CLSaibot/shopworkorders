#!/usr/bin/env bash
# Run a SQL file against the Supabase project via the Management API.
# Usage: SUPABASE_ACCESS_TOKEN=... scripts/sql.sh <file.sql> [project_ref]
set -euo pipefail
REF="${2:-gntupswjbblawppczcfi}"
node -e 'process.stdout.write(JSON.stringify({query:require("fs").readFileSync(process.argv[1],"utf8")}))' "$1" |
  curl -sS -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN:-proxy-injected}" -H "Content-Type: application/json" --data @- -w "\nHTTP %{http_code}\n"
