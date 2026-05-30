# Paper Desk v1 Contract

## Product Boundary

Paper Desk v1 is an internal paper-validation loop for investment research.

It does not:

- place broker orders
- route Alpaca or other real-money trades
- manage user funds
- promise investment returns
- make autonomous allocations

The user always chooses the paper allocation.

## Required Loop

```text
open /paper
  -> anonymous_id is generated locally
  -> fetch today's session
  -> read Macro / Research / Risk briefs
  -> allocate 100% paper capital
  -> submit allocation
  -> resolve simulated result
  -> review SPY benchmark, alpha, drawdown, and journal
```

## Backend Contract

Prefix:

```text
/v1/paper-desk
```

Endpoints:

```text
GET  /session/today?anonymous_id=...
POST /allocation
POST /resolve
GET  /history?anonymous_id=...
```

Server-controlled universe:

```text
NVDA, AMD, TSLA, BTCUSDT, SPY
```

Allocation validation:

- Symbols must be in the session universe.
- Weights must be numeric and non-negative.
- Total must equal 100 within a small tolerance.
- Duplicate submit for the same `(session_id, anonymous_id)` must be deterministic.

Resolve validation:

- Resolve must be idempotent.
- Missing market data must produce a labeled fallback or incomplete state, never an unlabeled fabricated result.
- Result must include portfolio return, benchmark return, alpha, drawdown, per-asset returns, and price/data source.

## Agent Brief Contract

Each session must have exactly one brief for each role:

```text
macro, research, risk
```

Each brief must include:

- `agent`
- `stance`
- `thesis`
- `confidence`
- `evidence`
- `invalidation`
- `source_quality`
- `allocation_guardrails`
- `generated_at`

The frontend must render enough of this structure that users can see why a thesis might fail.

## Frontend Contract

`/paper` is public and anonymous-first.

It is gated by:

```text
NEXT_PUBLIC_ENABLE_PAPER_DESK=true
```

The production default is disabled. Preview and hackathon deployments must opt in explicitly.

Required UI:

- one-person investment bank framing
- paper-only boundary
- three agent brief panels
- five-asset allocation controls
- allocation total and validation
- submit allocation
- resolve result
- journal/history preview

Do not build a marketing landing page as the first screen.

## Validation

Backend:

```bash
cd ai-service
pytest
```

Frontend:

```bash
cd trading-ui
npm run lint
npm run build
npm run test
```

Secret scan:

```bash
rg -l 'sk_live_|sk_test_|whsec_[A-Za-z0-9]{4,}|gho_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|hf_[A-Za-z0-9]{20,}|https://[^[:space:]]+:[^[:space:]@]+@|service_role[^[:space:]]{20,}|eyJ[A-Za-z0-9_-]{20,}' . || true
```
