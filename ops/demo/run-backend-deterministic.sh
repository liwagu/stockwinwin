#!/usr/bin/env bash
# Paper Desk demo — Mode A: backend deterministic (the v1 default).
#
# Paper-only simulation. No broker orders, no real-money trades, no managed
# funds, no guaranteed returns. Deterministic Macro / Research / Risk briefs.
#
# See docs/DEMO_MODE.md (Mode A).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AI_DIR="${REPO_ROOT}/ai-service"
HOST="${PAPER_DESK_HOST:-0.0.0.0}"
PORT="${PAPER_DESK_PORT:-8000}"

cd "${AI_DIR}"

if [[ ! -f .env ]]; then
  echo "[demo] No ai-service/.env found; copying from .env.example (deterministic defaults)."
  cp .env.example .env
fi

if [[ ! -d .venv ]]; then
  echo "[demo] Creating virtualenv at ai-service/.venv ..."
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate

echo "[demo] Installing backend dependencies ..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

# Force deterministic briefs for this demo regardless of any inherited env.
export PAPER_DESK_AGENT_MODE=deterministic

echo "[demo] Paper Desk backend (deterministic briefs) on http://${HOST}:${PORT}"
echo "[demo] Paper-only simulation — no real-money trades. Endpoints under /v1/paper-desk"
echo "[demo] Smoke-test with: ops/demo/smoke-loop.sh"
exec uvicorn main:app --reload --host "${HOST}" --port "${PORT}"
