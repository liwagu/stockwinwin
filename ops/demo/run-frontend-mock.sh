#!/usr/bin/env bash
# Paper Desk demo — Mode B: frontend mock preview.
#
# Runs the /paper UI with the feature flag on and the proxy in mock mode, so it
# serves in-memory fixtures and never calls the production backend.
#
# Paper-only simulation. No broker orders, no real-money trades, no managed
# funds, no guaranteed returns. Mock mode is for UI/demo validation only — it is
# NOT production proof.
#
# See docs/DEMO_MODE.md (Mode B).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
UI_DIR="${REPO_ROOT}/trading-ui"

cd "${UI_DIR}"

if [[ ! -d node_modules ]]; then
  echo "[demo] Installing frontend dependencies ..."
  npm install
fi

# Preview/demo flags only. These do NOT change production defaults — production
# keeps NEXT_PUBLIC_ENABLE_PAPER_DESK off and previews use mock.
export NEXT_PUBLIC_ENABLE_PAPER_DESK=true
export PAPER_DESK_API_MODE=mock

echo "[demo] Paper Desk UI (mock preview) -> http://localhost:3000/paper"
echo "[demo] NEXT_PUBLIC_ENABLE_PAPER_DESK=true PAPER_DESK_API_MODE=mock"
echo "[demo] Paper-only simulation — no backend, no real-money trades. Mock data is not production proof."
exec npm run dev
