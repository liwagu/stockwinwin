# StockWin Paper Desk Pivot Decision

Date: 2026-05-30

Source context:

- Hackathon handoff: `/Users/guliwa/_code/stockwin-paper-desk-game/docs/PAPER_DESK_GAME_HACKATHON_HANDOFF.md`
- Live game: `https://paper.stockwin.win`
- UCWS direction update: `/Users/guliwa/_code/stockwin-paper-desk-game/docs/UCWS_WINWIN_AGENT_DIRECTION.md`
- Existing GTM reset plan: `docs/GTM_GROWTH_RESET_PLAN.md`
- Current main product: StockWin forecast desk with 20 supported markets, ticker pages, lead capture, and subscription plumbing.

## 2026-05-30 Revision: Watchlist-To-World-Model Is The Entry Point

After reviewing the WinWin Agent Lark document, the stronger long-term direction is broader than "daily Paper Desk".

New hierarchy:

```text
WinWin Agent / StockWin
  -> screenshot or watchlist intent capture
  -> financial entity extraction
  -> supply-chain intelligence map
  -> supply-chain and shock-propagation reasoning
  -> paper-trade thesis and validation log
```

This means Paper Desk should not be the whole product or the main entry point. It should become the "prove it" layer after StockWin builds a market world model from the user's watchlist.

Updated product promise:

> StockWin turns a user's watchlist into an interactive market world model, then paper-tests the resulting thesis before anyone risks real money.

UCWS hackathon direction:

> **WinWin: Watchlist-to-World-Model Agent**. A user uploads a watchlist screenshot; agents extract financial entities, build a company/product/supply-chain graph, simulate a market shock, and save the resulting paper thesis to an audit trail.

## Decision

StockWin should not pivot into autonomous agent trading yet.

The next real direction is:

> **StockWin / WinWin Agent: a one-person investment-bank OS that turns a user's watchlist into an interactive market world model, then paper-tests the resulting thesis before anyone risks real money.**

The hackathon game should stay alive as the playful proof that paper validation is engaging. The serious StockWin product should move one layer upstream:

1. Capture the user's watchlist or screenshot intent.
2. Extract tickers and financial entities.
3. Expand them into a company / product / supply-chain / risk graph.
4. Let Macro / Research / Risk agents reason on graph nodes and edges.
5. Convert the resulting thesis into a paper-trade validation plan.
6. Score PnL, benchmark return, alpha, drawdown, and thesis quality over time.

The core product is not "AI trades for you." It is:

> **Show me the world behind my watchlist, then prove the thesis in paper before real money is involved.**

## Why This Is The Right Wedge

This direction fits the actual founder/customer evidence:

- The founder personally wants a daily watchlist because research is the bottleneck.
- The founder is more motivated by building the technical research system than manually trading.
- The Berlin paid users likely bought because the price was trivial, not because retention was proven.
- The hackathon game revealed that scoring and paper validation create trust, but the next demo needs a stronger front-stage transformation than allocation sliders.
- The trader conversation pointed toward "one-person investment bank", which maps better to research process than to broker automation.
- The Winwin Agent Lark doc reframes the watchlist as a world-model entry point, which is sharper than another trading-agent interface.

It also avoids the traps in generic agent trading:

- No unproven claim that agents make money.
- No broker liability or execution-risk surface.
- No need to beat open-source trading-agent repos on agent complexity.
- Differentiation comes from auditability, daily scoring, and a memorable playable interface.

## Product Positioning

Use this positioning:

> StockWin turns a watchlist into a visual market world model: companies, products, suppliers, customers, risks, catalysts, and a paper-trade validation trail.

Avoid this positioning:

- Automated trading bot.
- Guaranteed profit.
- Financial advice.
- "Let the AI manage your money."
- Generic multi-agent hedge fund clone.

Branding:

- Public demo/game: **Paper Desk**
- UCWS hackathon product: **WinWin Agent**
- Core canvas: **Supply Chain War Room**
- Serious product direction: **StockWin World Model Desk**
- Optional tagline: **Show me the world behind my watchlist.**

## Target User For The Next 30 Days

Do not optimize for anonymous internet users first.

Primary user:

- The founder, using it five trading days a week.

Design partner:

- The trader already in conversation, if he will react to daily outputs and say what feels useful or fake.

Public audience:

- People who are curious about AI trading but do not yet trust it.
- They should be able to play the no-login demo and subscribe to the daily paper report.

The product passes the first gate only if the founder voluntarily opens it every market morning for at least two weeks.

## What To Keep

Keep these from the hackathon game:

- One-person investment bank metaphor.
- No-login playable demo.
- Macro / Research / Risk agent roles.
- Allocation-first interaction.
- Benchmark, alpha, drawdown, and journal.
- Explicit paper-only boundary.

Keep these from the current StockWin product:

- Existing 20-symbol forecast backend.
- Ticker pages and SEO surface.
- Lead capture and attribution.
- Supabase and subscription plumbing.
- Existing market data modules for early scoring.

## What To Cut For Now

Do not build these in the next sprint:

- Alpaca broker login.
- Real-money orders.
- Autonomous execution.
- Complex user roles or permission systems.
- A full backtesting platform.
- A large agent swarm.
- Another generic landing page.
- Payment changes before retention is visible.

Alpaca can be revisited later for paper account order simulation, but it is not required for the first useful version. The first version can compute paper allocations from market close prices.

## Minimum Real Product

The smallest serious version is:

1. A daily paper session for a fixed market universe.
2. Three structured agent briefs: Macro, Research, Risk.
3. Source links or explicit "model inference" labels.
4. A paper allocation form that totals 100%.
5. End-of-day or replay scoring from real price data.
6. A 7-day journal.
7. Public honesty about which parts are generated, simulated, and real.

The first tradable universe should be small:

- NVDA
- TSLA
- BTCUSDT
- SPY
- One additional high-interest asset from the existing 20-symbol set

Do not start with all 20 markets in the Paper Desk loop. The user experience gets blurry too quickly.

## Product Loop

Morning:

- Open `/paper` or `paper.stockwin.win`.
- See today's headline, market regime, and 3-5 asset watchlist.
- Read Macro / Research / Risk cards.
- Allocate paper capital.
- Submit allocation.

Market close or next morning:

- System resolves returns.
- Shows PnL, benchmark, alpha, drawdown.
- Explains which thesis was supported or invalidated.
- Adds the result to the journal.

Weekly:

- Show a scorecard: hit rate, average alpha, worst drawdown, best thesis, worst thesis.
- Publish one public artifact for content distribution.

## Recommended Architecture

Keep the hackathon artifact separate as a stable demo, but build the real loop in the main StockWin app.

Recommended surfaces:

- `https://paper.stockwin.win`: playable no-login demo and funnel.
- `https://www.stockwin.win/paper`: serious daily Paper Desk product inside the main Next app.
- `https://www.stockwin.win/reports/today`: public daily artifact later.

Backend should live in `ai-service` because it already owns market data, predictions, Supabase repositories, and public API routing.

Frontend should live in `trading-ui` because it already owns StockWin auth, analytics, ticker pages, and product navigation.

## API Contract

Start with these endpoints:

```text
GET  /v1/paper-desk/session/today
POST /v1/paper-desk/allocation
POST /v1/paper-desk/resolve
GET  /v1/paper-desk/history
```

For no-auth usage, the frontend can generate an `anonymous_id` in localStorage and pass it to the backend. Auth can be added later without changing the product loop.

Session shape:

```json
{
  "session_id": "2026-05-30-default",
  "trading_date": "2026-05-30",
  "status": "open",
  "starting_cash": 100000,
  "benchmark_symbol": "SPY",
  "assets": [
    { "symbol": "NVDA", "display_name": "NVIDIA", "asset_type": "stock" }
  ],
  "briefs": [
    {
      "agent": "macro",
      "stance": "Risk-on but narrow",
      "thesis": "Index strength is concentrated in AI infrastructure.",
      "confidence": 0.72,
      "sources": [],
      "inference_label": "model_inference"
    }
  ]
}
```

## Data Model

Add Supabase-backed storage:

```text
paper_sessions
  id
  trading_date
  status
  market_universe
  benchmark_symbol
  generated_at

paper_agent_briefs
  id
  session_id
  agent
  stance
  thesis
  confidence
  sources_json
  prompt_version
  model_name
  generated_at

paper_allocations
  id
  session_id
  anonymous_id
  user_id nullable
  allocations_json
  submitted_at

paper_results
  id
  allocation_id
  returns_json
  portfolio_return
  benchmark_return
  alpha
  drawdown
  resolved_at
```

## Agent Implementation

Start deterministic, then add LLM.

Phase 1 agent generation:

- Macro brief from index movement, SPY/QQQ proxy data, and volatility if available.
- Research brief from existing Kronos forecast direction and recent price action.
- Risk brief from concentration, volatility, and event-risk templates.

Phase 2 agent generation:

- One structured LLM call that emits all three briefs as JSON.
- Inputs include existing Kronos prediction fields, market data, and source snippets.
- Store prompt, model, output, timestamp, and sources.

Do not let the LLM choose real orders. It can create theses and warnings. The user allocates.

## Development Plan

### Sprint 1: Make Paper Desk Durable And Honest

Goal: preserve the hackathon win and remove fragile infrastructure.

- Move `paper.stockwin.win` off the CodeBuddy proxy to durable static hosting.
- Keep the no-login game playable.
- Add an explicit note that current agents are scripted.
- Add a CTA from the game to the serious StockWin waitlist or `/paper`.
- Add a simple smoke test for the page loading and one full game run.

Definition of done:

- `paper.stockwin.win` works without CodeBuddy Cloud Studio being alive.
- The demo clearly says paper/simulated/scripted where appropriate.
- The demo links to the next StockWin Paper Desk surface.

### Sprint 2: Build The Real Daily Paper Loop

Goal: create something the founder can use every morning.

- Add `paper_sessions`, `paper_agent_briefs`, `paper_allocations`, and `paper_results` migrations.
- Add `ai-service` paper-desk routes.
- Generate one daily session for a five-asset universe.
- Add `trading-ui/app/paper/page.tsx`.
- Let anonymous users allocate via localStorage `anonymous_id`.
- Persist allocation and show today's submitted state.
- Resolve results from existing market data modules or a clearly labeled historical replay.

Definition of done:

- A user can open `/paper`, read today's briefs, allocate 100%, submit, and later see a result.
- At least one brief uses real StockWin/Kronos or market-data input, not only hard-coded copy.
- Results show portfolio return, SPY benchmark, alpha, and drawdown.

### Sprint 3: Add The Journal And Founder Habit Test

Goal: test retention before monetization.

- Add 7-day journal.
- Add weekly scorecard.
- Add event tracking for open, allocation submitted, result viewed, and return visit.
- Send the founder a daily reminder manually or via a simple scheduled job.
- Ask the trader design partner to review three daily sessions.

Definition of done:

- The founder uses it for 10 market days or admits it still lacks pull.
- The trader gives concrete feedback on briefs, risk framing, and scoring.
- There is enough journal data to publish one honest public scorecard.

### Sprint 4: Public Growth Surface

Goal: turn usage into distribution.

- Add `/reports/today`.
- Publish daily or weekly "AI thesis vs market result" posts.
- Connect lead capture to paper reports.
- Link ticker pages to relevant paper sessions.
- Keep price/payment unchanged until usage data says people come back.

Definition of done:

- Public visitors can understand the system without creating an account.
- Interested visitors can leave email tied to a report or asset.
- StockWin has one repeatable content artifact per week.

## Success Metrics

Founder retention:

- Opened on 8 of the next 10 market days.
- Allocation submitted on at least 6 of those days.
- Result viewed on at least 5 days.

Design partner signal:

- Trader asks to see the next day's desk at least twice.
- Trader corrects or challenges the system with specific comments.

Public signal:

- 20 new email leads in 30 days.
- 5 users return to Paper Desk more than once.
- 1 user explicitly says the scorecard/journal made them trust the product more.

Do not optimize payment before these signals exist.

## Immediate Engineering Tasks

Start here:

1. Create durable static deployment for `paper.stockwin.win`.
2. Add a main-app `/paper` route in `trading-ui`.
3. Add paper-desk Pydantic models and FastAPI routes in `ai-service`.
4. Add Supabase migrations for sessions, briefs, allocations, and results.
5. Use current StockWin predictions as the first Research Agent input.
6. Use market close prices for result scoring before integrating Alpaca.
7. Add analytics events for the paper loop.

The first coding milestone should be:

> "I can open StockWin Paper Desk in the morning, read three real-ish briefs, allocate paper capital, and come back later to see whether I beat SPY."

That is the product. Everything else is secondary until this loop proves it has pull.
