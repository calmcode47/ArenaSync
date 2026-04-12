#!/bin/bash
# ArenaFlow Smoke Test Script
# Run after docker-compose up to verify all services are reachable
# Usage: bash scripts/smoke_test.sh [backend_url] [frontend_url]

BACKEND=${1:-"http://localhost:8000"}
FRONTEND=${2:-"http://localhost:5173"}

echo "════════════════════════════════════════"
echo "  ArenaFlow Pre-Submission Smoke Test"
echo "════════════════════════════════════════"

PASS=0; FAIL=0

check() {
  local label="$1"
  local url="$2"
  local expected_status="$3"
  local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" = "$expected_status" ]; then
    echo "  ✅ $label → HTTP $status"
    PASS=$((PASS+1))
  else
    echo "  ❌ $label → HTTP $status (expected $expected_status)"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "[ BACKEND ]"
check "Health endpoint"           "$BACKEND/health"           "200"
check "OpenAPI docs"              "$BACKEND/docs"             "200"
check "API root (401 expected)"   "$BACKEND/api/v1/auth/me"  "401"

echo ""
echo "[ FRONTEND ]"
check "Frontend root"             "$FRONTEND"                 "200"

echo ""
echo "[ BUNDLE SIZE CHECK ]"
if [ -d "frontend/dist" ]; then
  SIZE=$(du -sh frontend/dist | awk '{print $1}')
  echo "  📦 frontend/dist: $SIZE"
else
  echo "  ⚠️  frontend/dist not found — run 'npm run build' first"
fi

echo ""
echo "[ REPO SIZE CHECK ]"
REPO_BYTES=$(du -sb . --exclude=.git --exclude=node_modules --exclude=__pycache__ \
             --exclude=.venv --exclude=frontend/dist --exclude="*.pyc" 2>/dev/null | awk '{print $1}')
REPO_KB=$((REPO_BYTES / 1024))
if [ "$REPO_BYTES" -lt 1048576 ]; then
  echo "  ✅ Repo source size: ${REPO_KB}KB < 1MB limit"
else
  echo "  ❌ Repo source size: ${REPO_KB}KB EXCEEDS 1MB limit"
  FAIL=$((FAIL+1))
fi

echo ""
echo "════════════════════════════════════════"
echo "  Results: $PASS passed · $FAIL failed"
echo "════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then exit 1; fi
