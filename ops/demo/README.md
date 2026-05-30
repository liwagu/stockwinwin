# Paper Desk demo runbook

Executable companions to [`docs/DEMO_MODE.md`](../../docs/DEMO_MODE.md). Each
script runs the exact commands documented for one Paper Desk run mode.

> **Paper-only.** Every script here drives a simulation. Paper Desk never places
> broker orders, never routes real-money trades, never manages funds, and never
> promises or guarantees returns.

| Script | Mode | What it does |
| --- | --- | --- |
| `run-backend-deterministic.sh` | A | Sets up a venv (if needed) and runs the FastAPI service with deterministic briefs (the v1 default). |
| `run-frontend-mock.sh` | B | Runs the `/paper` UI with `NEXT_PUBLIC_ENABLE_PAPER_DESK=true PAPER_DESK_API_MODE=mock` — no backend required. |
| `run-backend-llm.sh` | C | Runs the FastAPI service with the opt-in LLM brief adapter. Reads LLM credentials from the runtime environment only. |
| `smoke-loop.sh` | — | Curls the full session -> allocate -> resolve -> history loop against a running backend. |

## Usage

```bash
# Mode A — backend deterministic
ops/demo/run-backend-deterministic.sh

# Mode B — frontend mock preview
ops/demo/run-frontend-mock.sh

# Mode C — optional LLM briefs (provide creds at runtime, never commit them)
export PAPER_DESK_LLM_BASE_URL="https://your-cliproxy-host"
export PAPER_DESK_LLM_API_KEY="<provide-at-runtime-never-commit>"
ops/demo/run-backend-llm.sh

# Smoke-test a running backend (defaults to http://localhost:8000)
ops/demo/smoke-loop.sh
```

## Secrets

No script needs a committed secret. LLM credentials are read from the runtime
environment (`PAPER_DESK_LLM_BASE_URL`, `PAPER_DESK_LLM_API_KEY`) and are never
printed. `run-backend-llm.sh` exits with guidance if they are missing rather
than falling through with a partial config.

Run the repo secret scan before committing — it should print nothing:

```bash
rg -l 'sk_live_|sk_test_|whsec_[A-Za-z0-9]{4,}|gho_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|hf_[A-Za-z0-9]{20,}|https://[^[:space:]]+:[^[:space:]@]+@|service_role[^[:space:]]{20,}|eyJ[A-Za-z0-9_-]{20,}' . || true
```
