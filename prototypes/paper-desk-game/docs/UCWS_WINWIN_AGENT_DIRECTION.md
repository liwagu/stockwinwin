# UCWS WinWin Agent Direction

Date: 2026-05-30

Source inputs:

- Lark doc: `Winwin Agent.md`
- Existing hackathon game: `paper.stockwin.win`
- Current Paper Desk handoff: `docs/PAPER_DESK_GAME_HACKATHON_HANDOFF.md`
- Main StockWin pivot decision: `/Users/guliwa/_code/stockwin/docs/STOCKWIN_PAPER_DESK_PIVOT_DECISION.md`

## Decision

The UCWS Singapore Agent-track build should not be "Paper Desk v2" and should not be a plain Macro / Research / Risk chat demo.

The stronger direction is:

> **WinWin Agent: a one-person investment bank that turns any stock watchlist screenshot into an interactive world-model map, then tests the resulting thesis through paper trading.**

The front-stage demo is not paper trading. The front-stage demo is transformation:

```text
Watchlist screenshot
  -> extracted financial entities
  -> supply-chain intelligence map
  -> agent risk and opportunity reasoning
  -> paper-trade thesis and validation log
```

Paper Desk becomes the validation layer, not the main act.

## Why The Previous Ideas Were Too Flat

The previous options were too close to normal AI product shapes:

- "Agent IC" feels like agents talking in cards.
- "Daily Desk" feels useful but not visually memorable for a hackathon.
- "Game Arena" is fun but can look detached from serious finance.

The Lark document points at a better primitive:

> A user's watchlist is not a list. It is a compressed view of their market worldview.

That lets the product become more than a trading assistant. It becomes a visual financial intelligence system.

## New Product Frame

Use this name for the hackathon:

> **WinWin Agent**

Use this subtitle:

> **Your one-person investment bank for world-modeling the market.**

Use this screen name for the core interactive surface:

> **Supply Chain War Room**

The product promise:

> Drop in a stock watchlist screenshot. WinWin Agent extracts the tickers, expands them into a company-product-supply-chain-risk graph, and generates a paper-trade thesis with sources and failure conditions.

## Demo Story

Three-minute demo:

1. The user uploads a watchlist screenshot from Robinhood, TradingView, Longbridge, or the existing Paper Desk.
2. The Screen Agent extracts tickers, company names, prices, and uncertain OCR items.
3. The World Model Agent expands the watchlist into a supply-chain graph.
4. The graph shows relationships such as NVIDIA -> TSMC -> ASML -> HBM suppliers -> power and data-center exposure.
5. The Macro Agent labels regime risk.
6. The Research Agent explains catalysts and product exposure.
7. The Risk Agent marks concentration, dependency, valuation, and geopolitical failure points.
8. The Action Agent creates a paper-trade thesis: allocation, benchmark, horizon, stop condition, and what would invalidate the idea.
9. The user can run or inspect a paper-trading validation view based on the existing Paper Desk interaction model.

The "whoa" moment:

> A boring watchlist screenshot becomes a living map of the real-world economy behind the trade.

## Agent Roles

Do not present agents as chat personas. Present them as workers inside a pipeline.

### Screen Agent

Input:

- Screenshot.
- Optional user intent text.

Output:

- Extracted ticker list.
- Exchange guesses.
- Confidence scores.
- Uncertain OCR items.

### Entity Agent

Input:

- Tickers from Screen Agent.
- Existing StockWin supported-market metadata.

Output:

- Company names.
- Exchange.
- Sector and industry.
- Products.
- Basic identity fields such as CIK / ISIN / FIGI when available.

### World Model Agent

Input:

- Entity Agent output.
- Curated supply-chain seed data for the demo universe.
- Public filings, news, or manually prepared citations.

Output:

- Nodes: company, product, supplier, customer, competitor, country, event.
- Edges: supplier_to, customer_of, competes_with, exposed_to, catalyst_for.
- Confidence and evidence for each relationship.

### Risk Agent

Input:

- Graph.
- Market data.
- Recent news.

Output:

- Risk hotspots.
- Single-point dependencies.
- Crowding / valuation warnings.
- What invalidates the thesis.

### Action Agent

Input:

- Graph.
- Risk output.
- Paper Desk scoring model.

Output:

- Paper-trade thesis.
- Suggested paper allocation.
- Benchmark.
- Horizon.
- Validation log template.

## Hackathon Scope

The demo should use one deep vertical story, not broad market coverage.

Recommended demo universe:

- NVDA
- TSMC
- ASML
- SK Hynix
- AMD
- MSFT or GOOGL
- TSLA optional as contrast
- SPY as benchmark

Build one great chain:

```text
AI infrastructure
  -> GPUs
  -> foundries
  -> lithography
  -> HBM memory
  -> cloud capex
  -> energy / data centers
  -> geopolitical risk
```

Do not try to support every uploaded watchlist. For the hackathon, accept any screenshot visually, but map unknown tickers into a limited demo set or ask the user to confirm recognized tickers.

## What To Reuse From Paper Desk

Reuse:

- Visual confidence from the game.
- Allocation controls.
- Benchmark / alpha / drawdown language.
- Result journal.
- Paper-only boundary.

Do not reuse as-is:

- The deterministic `MARKET_DAYS` script as the main product.
- Fake Macro / Research / Risk cards as the main wow moment.
- Five-day game loop as the first screen.

Paper Desk should become:

> The "prove it" layer after the intelligence map forms a thesis.

## MVP Build Plan

### Day 1: Screenshot To Tickers

- Add upload or sample screenshot input.
- Use a VLM/OCR call if available.
- Keep a deterministic fallback parser for demo screenshots.
- Produce structured watchlist JSON.

Definition of done:

- A screenshot turns into editable ticker chips with confidence scores.

### Day 2: Ticker To Graph

- Build a curated demo graph around AI infrastructure.
- Render it with a force graph or React Flow style canvas.
- Click node -> show evidence, product exposure, risk.

Definition of done:

- NVDA visibly expands into a multi-hop supply-chain map.

### Day 3: Agents On The Graph

- Add Macro / Research / Risk / Action panels.
- Agent output must attach to graph nodes and edges.
- Every claim is either cited or marked as model inference.

Definition of done:

- The user can see agent reasoning directly on the map, not just in cards.

### Day 4: Paper Validation Layer

- Connect the thesis to a simplified Paper Desk allocation view.
- Show paper allocation, benchmark, horizon, and invalidation conditions.
- Use static or historical replay results if live data is too slow.

Definition of done:

- The demo ends with "we can test this thesis instead of trusting it."

### Day 5: Hackathon Polish

- Add a guided demo mode.
- Add one polished sample screenshot.
- Add a shareable report / export view.
- Prepare pitch script.

Definition of done:

- The project can be demoed in 3 minutes without explaining implementation details.

## What Not To Build

Do not build:

- Real brokerage connection.
- Real-money order execution.
- Full auth system.
- Generic ticker support.
- Deep backtesting engine.
- Video diffusion in the factual pipeline.
- A chat-first experience.

Diffusion can exist only as an ambient visualization layer, such as graph breathing, heat flow, or transition effects. It must not extract or invent financial facts.

## Judging Argument

This direction maps to likely judging criteria better than a pure trading game:

- **Agent track:** agents perform specialized roles in a real pipeline.
- **Usefulness:** investors already have watchlists; this makes them inspectable.
- **Scalability:** the primitive can expand to any domain where a user screenshot encodes intent.
- **Open-source story:** the graph pipeline, schema, and demo data can be open.
- **Long-term StockWin fit:** StockWin evolves from price forecast charts into a one-person investment-bank OS.

## Final Direction

Build:

> **WinWin Agent: Screenshot-to-Supply-Chain War Room with paper-trade validation.**

Not:

> A trading game with better agents.

Not:

> A financial chatbot with a chart.

The product should feel like opening a Bloomberg terminal from the future, but with one decisive interaction:

> "Here is my watchlist. Show me the world behind it."
