#!/usr/bin/env bash
# Paper Desk demo — Mode C: optional LLM briefs via a CliProxy (or any
# Anthropic-Messages-compatible gateway).
#
# The deterministic committee is still the default and the fallback for ANY
# failure. This mode opts into authoring the macro/research/risk briefs through
# one HTTP call. Credentials are read from the RUNTIME ENVIRONMENT ONLY and are
# never printed, logged, or committed.
#
# Paper-only simulation. No broker orders, no real-money trades, no managed
# funds, no guaranteed returns. The LLM authors briefs only.
#
# Required runtime env (set in your shell / secrets manager — never commit):
#   PAPER_DESK_LLM_BASE_URL   gateway base URL (no key in the URL)
#   PAPER_DESK_LLM_API_KEY    provided at runtime, never committed
# Optional:
#   PAPER_DESK_LLM_MODEL      defaults to claude-opus-4-8
#
# See docs/DEMO_MODE.md (Mode C).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
AI_DIR="${REPO_ROOT}/ai-service"
HOST="${PAPER_DESK_HOST:-0.0.0.0}"
PORT="${PAPER_DESK_PORT:-8000}"

if [[ -z "${PAPER_DESK_LLM_BASE_URL:-}" || -z "${PAPER_DESK_LLM_API_KEY:-}" ]]; then
  cat <<'MSG' >&2
[demo] LLM mode needs runtime-only credentials that are NOT set.
[demo] Export them in your shell (do not commit them), then re-run:

  export PAPER_DESK_LLM_BASE_URL="https://your-cliproxy-host"
  export PAPER_DESK_LLM_API_KEY="<provide-at-runtime-never-commit>"
  # optional: export PAPER_DESK_LLM_MODEL="claude-opus-4-8"

[demo] Without these, the backend would simply fall back to deterministic
[demo] briefs. Use ops/demo/run-backend-deterministic.sh for that.
MSG
  exit 1
fi

cd "${AI_DIR}"

if [[ ! -f .env ]]; then
  echo "[demo] No ai-service/.env found; copying from .env.example."
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

# Opt into LLM briefs for this process only. The key itself is inherited from
# the environment and is never echoed here.
export PAPER_DESK_AGENT_MODE=llm
export PAPER_DESK_LLM_MODEL="${PAPER_DESK_LLM_MODEL:-claude-opus-4-8}"

echo "[demo] Paper Desk backend (LLM briefs, deterministic fallback) on http://${HOST}:${PORT}"
echo "[demo] PAPER_DESK_AGENT_MODE=llm  PAPER_DESK_LLM_MODEL=${PAPER_DESK_LLM_MODEL}"
echo "[demo] LLM base URL is set; API key is read from the environment and never printed."
echo "[demo] Paper-only simulation — no real-money trades. Any LLM failure falls back to deterministic briefs."
exec uvicorn main:app --reload --host "${HOST}" --port "${PORT}"
