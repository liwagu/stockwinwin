# Paper Desk Game Hackathon Handoff

Last updated: 2026-05-30

This document summarizes the Game Hackathon prototype built during the StockWin pivot exploration. It is written for the next coding agents who will continue turning the playful demo into real StockWin / StockleWin functionality.

## Current Product

The hackathon product is a standalone browser game called **Paper Desk: One-Person Investment Bank**.

The player starts with `$100,000` of simulated capital. Each round represents one market day. The player reads three agent briefings, allocates capital across five assets, then runs the market day and sees whether the portfolio beat SPY.

The game is intentionally not connected to StockWin's old Kronos prediction backend, not connected to a broker, and not connected to real trading APIs. It is a paper-trading strategy game and a prototype for the larger idea:

> AI market theses should be tracked, scored, and audited in a paper environment before anyone trusts them with real money.

## Repository And Files

Worktree:

```text
/Users/guliwa/_code/stockwin-paper-desk-game
```

Main game folder:

```text
/Users/guliwa/_code/stockwin-paper-desk-game/codebuddy-paper-desk
```

Important files:

```text
codebuddy-paper-desk/index.html
codebuddy-paper-desk/README.md
docs/PAPER_DESK_GAME_HACKATHON_HANDOFF.md
```

The game is currently a single static HTML file. It contains all CSS, DOM markup, game state, scripted market scenarios, and UI logic.

## Live Deployment

Public URL:

```text
https://paper.stockwin.win
```

Current deployment chain:

```text
paper.stockwin.win
  -> Cloudflare DNS
  -> Cloudflare Worker route paper.stockwin.win/*
  -> Worker paper-stockwin-win
  -> CodeBuddy Cloud Studio origin
```

Cloudflare Worker:

```text
paper-stockwin-win
```

CodeBuddy Cloud Studio origin:

```text
http://f92b9d2ce704471c84615ddd0ad2fe6e.ap-singapore.myide.io/
```

Important deployment caveat: the current Worker proxies the CodeBuddy Cloud Studio page. This was chosen to submit quickly for the hackathon. For a long-lived production version, replace this with one of these:

1. Cloudflare Pages static deployment.
2. Worker serving bundled static assets directly.
3. Vercel or the existing StockWin frontend deployment pipeline.

The CodeBuddy origin may not be permanent. Do not treat it as stable infrastructure.

## How To Run Locally

```bash
cd /Users/guliwa/_code/stockwin-paper-desk-game/codebuddy-paper-desk
python3 -m http.server 4187
```

Open:

```text
http://127.0.0.1:4187
```

No environment variables are required.

## Game Loop

1. Player starts with `$100,000`.
2. Player reads a market headline and tape summary.
3. Three fake agent cards appear:
   - Macro Agent
   - Research Agent
   - Risk Agent
4. Player allocates capital across:
   - NVDA
   - AMD
   - TSLA
   - BTC
   - SPY
5. Player clicks **Run market day**.
6. The game calculates portfolio return from weighted asset returns.
7. The game updates:
   - Portfolio Value
   - Total PnL
   - Benchmark
   - Alpha
   - Max Drawdown
   - Desk Score
   - Journal
8. After five days, the desk closes and the final score is visible.

## Current Controls

Mouse:

- Adjust allocation sliders or plus/minus steppers.
- Click **Run market day**.
- Click **How to play**, **Pitch story**, and **Restart**.

Keyboard:

- `Enter` or `Space`: start from the intro; after the intro, run the current market day when allocations are valid.
- `1-5`: select `NVDA`, `AMD`, `TSLA`, `BTC`, or `SPY`.
- Arrow keys: adjust the selected asset allocation.
- `R`: restart.
- `Escape`: close modals.

## Current Metrics

The top cards show these metrics:

- **Portfolio Value**: current simulated account value.
- **Total PnL**: total return from the starting `$100,000`.
- **Benchmark**: SPY baseline return over the same game days.
- **Alpha**: portfolio return minus SPY benchmark return. Positive alpha means the player beat SPY. Negative alpha means the player underperformed SPY.
- **Max Drawdown**: worst peak-to-trough loss during the run. In trader language, this is the largest observed drop from a previous high-water mark.

Score formula in `index.html`:

```js
const score = Math.round(100 + alpha * 900 - state.drawdown * 120);
```

This rewards benchmark outperformance and penalizes drawdown.

## Current Implementation Model

The prototype is deterministic. There is no backend call and no LLM call.

Core constants:

```js
const STARTING_CASH = 100000;
const MAX_DAYS = 5;
const ASSETS = [...]
const MARKET_DAYS = [...]
```

`MARKET_DAYS` is the current fake data source. Each day includes:

- `headline`
- `tape`
- `benchmark`
- `agents`
- `returns`

Example shape:

```js
{
  headline: "AI capex cycle accelerates after cloud guidance",
  tape: "Semis catch a bid while high-beta growth trades choppy.",
  benchmark: 0.006,
  agents: [
    ["Macro", "Risk-on liquidity", "Rates steady, dollar soft, growth beta favored.", 73, "var(--blue)"],
    ["Research", "Own AI infra", "Cloud budgets point to GPU and memory demand.", 82, "var(--accent)"],
    ["Risk", "Crowded long", "Upside is real, but bad guidance can punish size.", 61, "var(--warn)"]
  ],
  returns: { NVDA: 0.041, AMD: 0.027, TSLA: -0.012, BTC: 0.016, SPY: 0.006 }
}
```

The fake agents are not intelligent. They are hand-written flavor text. They exist to prove the interaction pattern:

```text
Read theses -> allocate capital -> observe result -> compare with benchmark -> learn from journal
```

## Product Insight From The Hackathon

The strongest part of the prototype is not stock prediction. The strongest part is the **decision-training loop**.

Most AI trading demos jump directly to "the agent trades for you." That is risky, hard to trust, legally sensitive, and hard to differentiate from existing open-source projects.

This game suggests a better wedge:

> Make AI-generated market theses playable, inspectable, and scoreable before making them executable.

This fits the user's original StockWin problem:

- The user wants to trade but does not have time or energy to research daily.
- The user is more interested in building technical systems than manually trading every day.
- Existing StockWin paid users were low-signal and likely churned after curiosity.
- A daily paper-trading loop can create repeat engagement without promising real profit.

The game can become a serious product if it moves from fake scripted agents to real thesis generation, historical replay, scoring, and paper-trading logs.

## What Is Fake Today

Be explicit with future work. These parts are fake today:

1. Agent intelligence
   - Macro, Research, and Risk agents are hard-coded strings.
   - Trust percentages are arbitrary.

2. Market data
   - Returns are scripted.
   - No live quotes.
   - No historical data lookup.

3. Paper trading
   - No broker or Alpaca integration.
   - No persistent portfolio.
   - No order model, positions, fills, slippage, fees, or timestamps.

4. Evaluation
   - Score is a toy formula.
   - There is no statistically meaningful backtest.
   - There is no source citation or thesis audit trail.

5. Persistence
   - No login.
   - No Supabase persistence.
   - Refreshing loses session state.

These limitations are acceptable for a hackathon game but must not be hidden in the next product iteration.

## What Is Real Today

These parts are useful and should be preserved:

1. Game metaphor
   - "One-person investment bank" is more memorable than another dashboard.

2. Paper-only boundary
   - The product avoids claims of real trading profit.

3. Multi-agent framing
   - Macro / Research / Risk is understandable to non-experts.
   - The agents disagree in useful ways, which is better than a single magic answer.

4. Scoreboard
   - Benchmark, alpha, and drawdown make the product feel like a trading discipline tool.

5. Five-day loop
   - Short enough for a demo.
   - Long enough to show compounding and drawdown.

6. Visual style
   - Arcade / pixel / neon treatment made the demo stand out at a game hackathon.

## Recommended Next Product Direction

Do not jump directly to autonomous trading.

Recommended next version:

**StockleWin: AI Paper Trading Arena**

Core promise:

> Every morning, AI agents produce trade theses. The user allocates paper capital. The system tracks outcomes, alpha, drawdown, and thesis quality over time.

The product should be positioned as:

- Paper trading.
- Thesis tracking.
- Research discipline.
- Benchmark comparison.
- Agent evaluation.

It should not be positioned as:

- Guaranteed profit.
- Real-money agent trading.
- Financial advice.
- Broker automation first.

## Next Architecture

Split the single-file prototype into a real app only when needed. The next agent can start with a minimal API-backed version.

Suggested components:

```text
Frontend
  - Game UI
  - Allocation controls
  - Briefing cards
  - Result journal
  - Leaderboard / run history later

Backend
  - Scenario generation endpoint
  - Market data endpoint
  - Paper portfolio endpoint
  - Evaluation endpoint

Data
  - daily_sessions
  - agent_briefs
  - paper_allocations
  - market_results
  - thesis_scores
```

Suggested first backend endpoints:

```text
GET  /api/paper-desk/session/today
POST /api/paper-desk/allocation
POST /api/paper-desk/run-day
GET  /api/paper-desk/history
```

Suggested session object:

```json
{
  "session_id": "2026-05-29-user-demo",
  "day": 1,
  "starting_cash": 100000,
  "assets": ["NVDA", "AMD", "TSLA", "BTC", "SPY"],
  "briefs": [
    {
      "agent": "macro",
      "stance": "Risk-on liquidity",
      "thesis": "Rates steady, dollar soft, growth beta favored.",
      "confidence": 0.73,
      "sources": []
    }
  ],
  "allocations": {
    "NVDA": 0,
    "AMD": 0,
    "TSLA": 0,
    "BTC": 0,
    "SPY": 100
  }
}
```

## How To Replace Fake Agents With Real Agents

Start with three deterministic agent roles. Do not build a complex autonomous swarm first.

### Macro Agent

Inputs:

- Index movement.
- Rates / yields.
- Dollar.
- Major macro headlines.
- Sector breadth.

Output:

- Market regime.
- Risk-on / risk-off stance.
- 2-4 cited bullets.
- Confidence.

### Research Agent

Inputs:

- Ticker news.
- Earnings summaries.
- Analyst notes if available.
- StockWin/Kronos signal if available.
- Recent price action.

Output:

- Bull case.
- Bear case.
- Catalyst.
- Suggested watchlist.
- Confidence.

### Risk Agent

Inputs:

- Volatility.
- Concentration.
- Correlation.
- Recent drawdown.
- Event risk.

Output:

- What could invalidate the thesis.
- Sizing warning.
- Max recommended allocation.
- Confidence.

Important: each agent output must include sources or clearly mark "model inference". This is central to trust.

## Minimal Real Version

The next coding agent should build the smallest useful real version:

1. Keep the current game UI.
2. Replace `MARKET_DAYS` with API-loaded scenarios.
3. Generate one daily watchlist with LLM agents.
4. Use real market data for end-of-day scoring.
5. Persist the user's paper allocation and daily result.
6. Show a 7-day or 30-day journal.

This is enough to test whether the user personally returns every day.

Do not start with:

- Broker login.
- Real order execution.
- Complex user permissions.
- Payment.
- Multi-tenant admin systems.
- Large backtesting infrastructure.

## Possible Data Providers

For paper trading, consider:

- Alpaca Market Data / Paper Trading.
- Polygon.io.
- Twelve Data.
- Yahoo Finance only for prototypes, not a reliable product dependency.
- Existing StockWin market data modules if still usable.

If Alpaca is used, start with paper-only:

- No live brokerage orders.
- No real-money account flow.
- Paper account ID and API keys must stay server-side.
- Store only the paper portfolio state needed for the game.

## Suggested Development Plan

Phase 1: stabilize the game artifact

- Move from CodeBuddy proxy deployment to durable hosting.
- Keep `paper.stockwin.win` working.
- Add a short README warning that agents are currently scripted.
- Add screenshot-based smoke tests if practical.

Phase 2: real daily thesis generation

- Add backend endpoint for today's generated brief.
- Use one LLM call per role or one structured call producing three roles.
- Require JSON schema output.
- Store prompt, model, output, sources, and timestamp.

Phase 3: real paper result tracking

- Persist allocation.
- Resolve market returns from real close prices.
- Compute PnL, benchmark, alpha, and drawdown.
- Show a journal of prior runs.

Phase 4: retention test

- Use the founder as the first daily user.
- Run it 5 trading days.
- Track whether the product is actually opened every morning.
- If ignored, the product still lacks pull.

Phase 5: public positioning

- Pitch as "AI paper trading arena" or "one-person investment bank simulator".
- Use the game as top-of-funnel.
- Promote StockWin as the serious backend: thesis generation, scoring, and audit logs.

## Implementation Warnings

1. Do not mix this hackathon game with the old Kronos backend unless there is a clear interface.
2. Do not promise the AI can make users money.
3. Do not hide that the current agents are scripted.
4. Do not build broker automation until the paper loop proves retention.
5. Keep the no-auth playable version available. It is useful for demos.
6. If adding auth later, make it optional after first play.

## Useful Pitch

Short version:

```text
Paper Desk turns AI trading research into a playable paper-trading loop.
You run a one-person investment bank, read Macro / Research / Risk agents,
allocate simulated capital, and see whether your thesis beats SPY without
taking too much drawdown.

The hackathon version is playful. The StockWin version is the serious next step:
real AI-generated theses, real source links, real paper-trading results, and
an audit trail before anyone risks real money.
```

More direct StockWin bridge:

```text
Most AI trading products ask for trust too early. StockWin should do the opposite:
paper-test every thesis first. This game is the training surface. The product
behind it is a daily AI research desk that proves whether its ideas beat the
benchmark over time.
```

## Immediate Next Tasks For A Coding Agent

Start here:

1. Open `/Users/guliwa/_code/stockwin-paper-desk-game/codebuddy-paper-desk/index.html`.
2. Extract `MARKET_DAYS` into a JSON-compatible data contract.
3. Add a thin loader so the UI can use either static fallback data or API data.
4. Add a backend route that returns one structured daily scenario.
5. Add persistence for allocation and result history.
6. Keep `https://paper.stockwin.win` playable throughout.

Definition of done for the next serious iteration:

- The game still works without login.
- At least one agent briefing is generated by a real model or real backend routine.
- At least one market result is computed from real market data or a clearly labeled historical replay.
- The UI tells the truth about what is simulated, generated, and real.
- The user can replay or inspect the result journal.
