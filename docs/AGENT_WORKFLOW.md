# StockWinWin Agent Workflow

This repository uses a contract-first, multi-agent workflow for fast feature work.

## Operating Model

1. Orchestrator writes the implementation contract and owns integration.
2. Workers edit disjoint file scopes in parallel.
3. Claude Code runs as a cross-model reviewer or contract critic.
4. Validators run tests, secret scans, and safety reviews before merge.
5. Main branch stays releasable; feature work happens on `codex/*` branches.

## Current Mission

Branch:

```text
codex/paper-desk-v1
```

Goal:

```text
Build the first real /paper product loop:
deterministic Macro / Research / Risk briefs
-> user-confirmed paper allocation
-> internal paper ledger
-> SPY benchmark, alpha, drawdown, journal
```

## Agent Assignments

| Role | Tool | Write Scope | Responsibility |
| --- | --- | --- | --- |
| Orchestrator | Codex | Whole repo for integration only | Contract, branch, integration, final validation |
| Backend Worker | Codex subagent | `ai-service/**` | FastAPI routes, models, repository, paper ledger, tests |
| Frontend Worker | Codex subagent | `trading-ui/**` | `/paper` UI, proxy routes, types, client helpers, E2E |
| Cross-Model Reviewer | Claude Code | Read-only | Challenge safety, API shape, and agent contract |
| Validator | Codex or Claude Code | Read-only unless fixing assigned | Test coverage, secret scan, no-real-money language |

## Model Policy

- Coding orchestrator: Codex in this desktop session.
- Parallel code workers: Codex subagents with inherited model settings.
- Cross-model review: local Claude Code CLI, invoked with stripped MCP/plugin config for speed and reliability.
- Product runtime v1: deterministic rules, no LLM API call.
- Product runtime later: add an LLM only behind an auditable service boundary; for the hackathon path, prefer Gemini API because the competition framing already aligns with Gemini/GCP, but do not hard-code a model until implementation.

## Safety Rules

- No real-money execution in v1.
- No Alpaca order placement in v1.
- No tracked `.env` files except `.env.example`.
- No agent may claim the product provides financial advice or guaranteed returns.
- Every generated thesis must carry source quality, evidence, invalidation, and allocation guardrails.

## Validation Gates

Before merging:

```bash
rg -l 'sk_live_|sk_test_|whsec_[A-Za-z0-9]{4,}|gho_[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|hf_[A-Za-z0-9]{20,}|https://[^[:space:]]+:[^[:space:]@]+@|service_role[^[:space:]]{20,}|eyJ[A-Za-z0-9_-]{20,}' . || true
```

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
