# Paper Desk — Demo-Readiness Backlog

Seeded 2026-05-30 from the Codex handoff "Recommended Next Work" plus the
`PAPER_DESK_V1_CONTRACT.md` required UI/validation. Driven by the
`paper-desk-push` workflow loop.

## Rules for the loop
- Work only in `/Users/guliwa/_code/stockwinwin`, branch `codex/paper-desk-v1`.
- Pick the FIRST unchecked `[ ]` task each iteration.
- Keep the deterministic committee as default; preserve the LLM-adapter fallback.
- Tests-first for any backend behavior change.
- Never change production defaults: `NEXT_PUBLIC_ENABLE_PAPER_DESK` stays off by default; previews use `PAPER_DESK_API_MODE=mock`.
- Preserve paper-only / simulation / no-real-money / no-guaranteed-returns language.
- No secrets in code, docs, logs, or commit messages. Run the secret scan before committing.
- Commit locally only. NEVER push.

## Tasks (priority order)

- [x] **T1 · docs** — Add `docs/DEMO_MODE.md` + `ops/demo/` runbook describing how to run: (a) backend deterministic mode, (b) frontend mock preview (`NEXT_PUBLIC_ENABLE_PAPER_DESK=true PAPER_DESK_API_MODE=mock`), (c) optional LLM mode via CliProxy using runtime-only env vars (never commit credentials). Acceptance: a new contributor can start each mode from the doc alone; no secrets present.
- [ ] **T2 · frontend** — `/paper` contract conformance + polish pass. Verify all required UI is present and high quality: one-person-investment-bank framing, paper-only boundary, three agent brief panels surfacing thesis/evidence/invalidation/allocation_guardrails/source_quality/confidence, five-asset allocation controls, live allocation total + validation, submit, resolve result, journal/history preview. Use the existing design system. Acceptance: every contract UI element present; lint+build green; verified by screenshot.
- [ ] **T3 · frontend** — Allocation UX: live running total with under/over-100 messaging, a "normalize to 100" helper, quick presets, and disabled submit until valid. Acceptance: cannot submit an invalid allocation; total feedback is immediate and clear.
- [ ] **T4 · frontend** — Resolve-result visualization: clearly surface portfolio return vs SPY benchmark, alpha, max drawdown, per-asset returns, and price/data source label (including labeled fallback when data is missing). Acceptance: all contract result fields rendered with source labeling; no unlabeled fabricated numbers.
- [ ] **T5 · backend** — Test-coverage hardening (tests-first): explicit tests for idempotent resolve, duplicate-submit determinism for the same `(session_id, anonymous_id)`, and labeled fallback on missing market data. Acceptance: new failing tests written first, then made green; deterministic fallback unchanged.
- [ ] **T6 · frontend** — Loading / empty / error states for the full loop, with consistent paper-only disclaimers. Acceptance: every async surface has a non-broken state; disclaimers visible at submit and resolve.
- [ ] **T7 · frontend** — Accessibility & responsiveness for `/paper`: keyboard operability of allocation controls, sufficient contrast, mobile layout. Acceptance: keyboard-only flow works end to end; layout holds at 375px width.

## Progress log
<!-- The loop appends one line per completed task: `- YYYY-MM-DD Tn <sha> summary` -->
- 2026-05-30 T1 (local) Added docs/DEMO_MODE.md + ops/demo/ runbook (deterministic, mock preview, opt-in LLM) — no secrets, production defaults unchanged.
- 2026-05-30 T1 <will-be-sha> Add docs/DEMO_MODE.md + ops/demo/ runbook for the three Paper Desk run modes
