# Paper Desk — Demo Mode

This guide lets a brand-new contributor start any of the three Paper Desk run
modes from this document alone. Companion shell scripts live in
[`ops/demo/`](../ops/demo/) — they run the exact same commands described here.

> **Paper-only boundary.** Paper Desk is a simulation. It never places broker
> orders, never routes Alpaca or other real-money trades, never manages user
> funds, and never promises or guarantees investment returns. Every mode below
> is paper-only. The user always chooses the paper allocation.

## What the three modes are for

| Mode | Use it when you want to… | Backend needed? | Briefs |
| --- | --- | --- | --- |
| **A. Backend deterministic** | Run the real FastAPI Paper Desk loop end to end with the deterministic committee (the v1 default). | Yes (FastAPI + the deterministic committee) | Deterministic |
| **B. Frontend mock preview** | Validate the `/paper` UI in isolation without standing up the backend (preview/hackathon demos). | No | Mock fixtures |
| **C. Optional LLM briefs** | Author the Macro / Research / Risk briefs through one opt-in Anthropic Messages-compatible HTTP call (e.g. via a CliProxy gateway). | Yes (backend + reachable endpoint) | LLM, with deterministic fallback |

Production defaults are unchanged by any of this:
`NEXT_PUBLIC_ENABLE_PAPER_DESK` stays **off**, previews use
`PAPER_DESK_API_MODE=mock`, and briefs stay **deterministic** unless a runtime
explicitly opts in. None of these modes commit credentials.

## Server-controlled universe

All modes operate on the same fixed paper universe (SPY is the benchmark hurdle
rate):

```text
NVDA, AMD, TSLA, BTCUSDT, SPY
```

---

## Mode A — Backend deterministic (the v1 default)

This runs the real product loop: deterministic Macro / Research / Risk briefs ->
user-confirmed paper allocation -> internal paper ledger -> SPY benchmark, alpha,
drawdown, journal. Briefs are deterministic; no LLM call is made.

Runbook script: [`ops/demo/run-backend-deterministic.sh`](../ops/demo/run-backend-deterministic.sh)

### 1. Configure the backend

```bash
cd ai-service
cp .env.example .env          # only if you do not already have one
```

The Paper Desk deterministic defaults are already correct in `.env.example`:

```text
PAPER_DESK_AGENT_MODE=deterministic
PAPER_DESK_LLM_BASE_URL=
PAPER_DESK_LLM_API_KEY=
PAPER_DESK_LLM_MODEL=claude-opus-4-8
```

Leave them as-is for deterministic mode. (Never commit a real `.env`; only
`.env.example` is tracked.)

### 2. Install and run the FastAPI service

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The Paper Desk router is mounted at the prefix `/v1/paper-desk`.

### 3. Smoke-test the loop (no real money is involved)

```bash
# Today's session + three deterministic briefs (returns a `session_id`)
curl -s "http://localhost:8000/v1/paper-desk/session/today?anonymous_id=demo-anon-0001"

# Submit a paper allocation (weights total 100; use the session_id from above)
curl -s -X POST "http://localhost:8000/v1/paper-desk/allocation" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"<SESSION_ID_FROM_ABOVE>","anonymous_id":"demo-anon-0001",
       "allocations":{"NVDA":40,"AMD":20,"TSLA":20,"BTCUSDT":10,"SPY":10}}'

# Resolve into a simulated result (idempotent)
curl -s -X POST "http://localhost:8000/v1/paper-desk/resolve" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"<SESSION_ID_FROM_ABOVE>","anonymous_id":"demo-anon-0001"}'

# Journal / history
curl -s "http://localhost:8000/v1/paper-desk/history?anonymous_id=demo-anon-0001"
```

The resolve result is a **simulation**: it includes portfolio return, SPY
benchmark return, alpha, drawdown, per-asset returns, and a price/data source
label. Missing market data produces a clearly labeled fallback or incomplete
state — never an unlabeled fabricated number.

### 4. (Optional) Run the full stack against this backend

To drive the loop from the `/paper` UI against this real backend, run the
frontend with the feature flag on and the API mode set to `remote` (the default):

```bash
cd trading-ui
NEXT_PUBLIC_ENABLE_PAPER_DESK=true PAPER_DESK_API_MODE=remote AI_SERVICE_URL=http://localhost:8000 npm run dev
# open http://localhost:3000/paper
```

### 5. Run the backend tests

```bash
cd ai-service
pytest
```

---

## Mode B — Frontend mock preview

Use this for UI/demo validation without a backend. The Next.js proxy routes
under `app/api/paper-desk/**` return in-memory mock fixtures when
`PAPER_DESK_API_MODE=mock`, so the preview never touches the production backend.

> Mock mode is for UI/demo validation only. It is **not** production proof.
> Production proof requires the FastAPI Paper Desk service and Supabase tables.

Runbook script: [`ops/demo/run-frontend-mock.sh`](../ops/demo/run-frontend-mock.sh)

### 1. Start the dev server in mock mode

```bash
cd trading-ui
npm install   # first time only
NEXT_PUBLIC_ENABLE_PAPER_DESK=true PAPER_DESK_API_MODE=mock npm run dev
# open http://localhost:3000/paper
```

- `NEXT_PUBLIC_ENABLE_PAPER_DESK=true` un-hides the `/paper` route (production
  keeps this off, so the page 404s by default).
- `PAPER_DESK_API_MODE=mock` makes the proxy routes serve mock fixtures instead
  of calling `AI_SERVICE_URL`.

You can step through the full paper loop — session, three brief panels, the
five-asset allocation, submit, resolve, and journal preview — entirely against
the mock fixtures. No backend, no network calls to the AI service.

### 2. Validation gates (matches CI)

```bash
cd trading-ui
NEXT_PUBLIC_ENABLE_PAPER_DESK=true PAPER_DESK_API_MODE=mock npm run lint
NEXT_PUBLIC_ENABLE_PAPER_DESK=true PAPER_DESK_API_MODE=mock npm run build
NEXT_PUBLIC_ENABLE_PAPER_DESK=true PAPER_DESK_API_MODE=mock npm run test
```

### 3. Confirm the production-off default still 404s

```bash
cd trading-ui
npm run dev
# http://localhost:3000/paper -> 404 (flag off, as in production)
```

---

## Mode C — Optional LLM briefs via CliProxy

This is an **opt-in** path. The deterministic committee is still the default and
remains the fallback for any failure. When enabled, the backend asks an
Anthropic Messages-compatible endpoint to author the three briefs (`macro`,
`research`, `risk`) in a single HTTP call. A CliProxy (or any other
Anthropic-Messages-compatible gateway) is one way to provide that endpoint.

The adapter lives behind `ai-service/services/paper_desk_llm.py` and is gated
entirely by environment variables.

Runbook script: [`ops/demo/run-backend-llm.sh`](../ops/demo/run-backend-llm.sh)

### Runtime-only environment variables

Set these **in the runtime environment only** (your shell, a secrets manager, or
the deploy platform's env settings). **Never** write a real key into a tracked
file, a commit, a log, or this doc. `.env.example` ships these blank on purpose.

```bash
export PAPER_DESK_AGENT_MODE=llm
export PAPER_DESK_LLM_BASE_URL="https://your-cliproxy-host"   # gateway base URL, no key
export PAPER_DESK_LLM_API_KEY="<provide-at-runtime-never-commit>"
export PAPER_DESK_LLM_MODEL="claude-opus-4-8"                 # optional; this is the default
```

The adapter posts to `${PAPER_DESK_LLM_BASE_URL}/v1/messages` with
`anthropic-version: 2023-06-01`.

### Run the backend with LLM briefs enabled

```bash
cd ai-service
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Then exercise the same endpoints as Mode A. Successful LLM briefs are labeled
`source_quality="model_inference"`; deterministic briefs keep their
`market_data` / `prediction_cache` / `fallback` labels.

### Fallback and safety contract

The adapter is deliberately fail-safe. It silently falls back to the
deterministic briefs (and the loop keeps working) on any of:

- `PAPER_DESK_AGENT_MODE` is anything other than `llm`.
- `PAPER_DESK_LLM_BASE_URL` or `PAPER_DESK_LLM_API_KEY` is missing/blank.
- HTTP/transport error, non-2xx status, or timeout.
- Response is not strict JSON, is missing an agent, or fails validation.

API key values are never logged or returned. The LLM still operates strictly
inside the paper-only boundary — it authors briefs only and never places trades
or promises returns.

To switch back to the default at any time, unset the override:

```bash
unset PAPER_DESK_AGENT_MODE PAPER_DESK_LLM_BASE_URL PAPER_DESK_LLM_API_KEY PAPER_DESK_LLM_MODEL
```

---

## Secret hygiene

No mode requires committing a secret. Before any commit, run the repo secret
scan (it should print nothing):

```bash
rg -l 'sk_live_|sk_test_|whsec_[A-Za-z0-9]{4,}|gho_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|hf_[A-Za-z0-9]{20,}|https://[^[:space:]]+:[^[:space:]@]+@|service_role[^[:space:]]{20,}|eyJ[A-Za-z0-9_-]{20,}' . || true
```

Only `.env.example` is tracked; real `.env` files are git-ignored. Provide LLM
credentials at runtime only.

## Quick reference

| Variable | Where | Default | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_ENABLE_PAPER_DESK` | frontend | `false` | Off in production. Set `true` to expose `/paper`. |
| `PAPER_DESK_API_MODE` | frontend | `remote` | `mock` serves fixtures; previews use `mock`. |
| `AI_SERVICE_URL` | frontend | `http://localhost:8000` | Backend the proxy calls in `remote` mode. |
| `PAPER_DESK_AGENT_MODE` | backend | `deterministic` | `llm` opts into the brief adapter. |
| `PAPER_DESK_LLM_BASE_URL` | backend | blank | Required for `llm`. Runtime only. |
| `PAPER_DESK_LLM_API_KEY` | backend | blank | Required for `llm`. **Runtime only, never commit.** |
| `PAPER_DESK_LLM_MODEL` | backend | `claude-opus-4-8` | Optional override. |

See [`docs/PAPER_DESK_V1_CONTRACT.md`](./PAPER_DESK_V1_CONTRACT.md) and
[`docs/AGENT_WORKFLOW.md`](./AGENT_WORKFLOW.md) for the full contract and safety
rules.
