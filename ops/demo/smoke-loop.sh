#!/usr/bin/env bash
# Paper Desk demo — smoke-test the full loop against a running backend.
#
# Drives: session/today -> allocation -> resolve -> history, using a throwaway
# anonymous id. Works against Mode A (deterministic) or Mode C (LLM) backends.
#
# Paper-only simulation. No broker orders, no real-money trades, no managed
# funds, no guaranteed returns. The allocation is paper capital only.
#
# Usage:
#   ops/demo/smoke-loop.sh                 # http://localhost:8000
#   PAPER_DESK_BASE_URL=http://host:8000 ops/demo/smoke-loop.sh
#
# Requires: curl, python3 (for JSON field extraction).
set -euo pipefail

BASE_URL="${PAPER_DESK_BASE_URL:-http://localhost:8000}"
ANON="demo-anon-$(date +%s)"

echo "[demo] Base URL: ${BASE_URL}"
echo "[demo] Anonymous id: ${ANON} (paper-only simulation)"

echo "[demo] 1/4 GET session/today ..."
SESSION_JSON="$(curl -fsS "${BASE_URL}/v1/paper-desk/session/today?anonymous_id=${ANON}")"
SESSION_ID="$(printf '%s' "${SESSION_JSON}" | python3 -c 'import json,sys; print(json.load(sys.stdin)["session_id"])')"
echo "[demo]   session_id=${SESSION_ID}"

echo "[demo] 2/4 POST allocation (paper weights total 100) ..."
curl -fsS -X POST "${BASE_URL}/v1/paper-desk/allocation" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"${SESSION_ID}\",\"anonymous_id\":\"${ANON}\",\"allocations\":{\"NVDA\":40,\"AMD\":20,\"TSLA\":20,\"BTCUSDT\":10,\"SPY\":10}}" \
  >/dev/null
echo "[demo]   allocation submitted"

echo "[demo] 3/4 POST resolve (idempotent, simulated result) ..."
curl -fsS -X POST "${BASE_URL}/v1/paper-desk/resolve" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"${SESSION_ID}\",\"anonymous_id\":\"${ANON}\"}" \
  >/dev/null
echo "[demo]   resolved"

echo "[demo] 4/4 GET history ..."
curl -fsS "${BASE_URL}/v1/paper-desk/history?anonymous_id=${ANON}" >/dev/null
echo "[demo]   history fetched"

echo "[demo] OK — full paper loop completed. Simulation only; no real-money trades."
