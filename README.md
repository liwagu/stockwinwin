# StockWinWin

**A one-person investment bank for turning a watchlist into a market world model, then testing the thesis in paper before risking real money.**

StockWinWin is an open-source hackathon project and product prototype for AI-assisted investing research. The system is deliberately **paper-only**: agents can produce theses, risk checks, evidence, invalidation conditions, and paper-trade plans, but they do not place real-money trades or promise returns.

## Product Idea

Most investing tools start with a ticker chart or a chatbot. StockWinWin starts with the investor's actual context:

```text
watchlist or screenshot
  -> extracted financial entities
  -> company / product / supply-chain / risk graph
  -> Macro / Research / Risk agent reasoning
  -> paper thesis
  -> benchmarked validation log
```

The wedge is not "AI trades for you." The wedge is:

> Show me the world behind my watchlist, then prove the thesis in paper before real capital is involved.

## Current Prototype

This repository contains two layers:

- **StockWin app**: a Next.js frontend and FastAPI backend for market forecasts, users, subscriptions, and future Paper Desk work.
- **Paper Desk prototype**: a no-login browser game preserved under `prototypes/paper-desk-game/`, originally deployed at [paper.stockwin.win](https://paper.stockwin.win).

Paper Desk proves the habit loop:

1. Read Macro / Research / Risk briefs.
2. Allocate simulated capital.
3. Resolve the paper day.
4. Compare against SPY.
5. Review alpha, drawdown, and the thesis journal.

## Agent Model

StockWinWin uses agents as pipeline workers, not as magic portfolio managers.

| Agent | Job | Output |
| --- | --- | --- |
| Screen Agent | Read a watchlist screenshot or user intent | Tickers, company names, uncertain items |
| Entity Agent | Normalize financial entities | Company metadata and identity fields |
| World Model Agent | Expand entities into a market map | Companies, products, suppliers, customers, risks |
| Macro Agent | Read market regime | Risk-on/risk-off context and benchmark framing |
| Research Agent | Explain catalysts and exposure | Thesis, evidence, source quality |
| Risk Agent | Challenge the thesis | Concentration, invalidation, drawdown constraints |
| Action Agent | Convert reasoning into a paper test | Paper allocation, benchmark, horizon, validation log |

For the first build, the product is intentionally deterministic and auditable: Macro, Research, and Risk produce structured recommendations, and the user decides the paper allocation.

## Repository Layout

```text
ai-service/                  FastAPI backend, market data, predictions, Supabase repositories
trading-ui/                  Next.js app, auth, dashboard, market pages, future /paper surface
prototypes/paper-desk-game/  Preserved static Paper Desk hackathon prototype
docs/                        Product direction, cleanup notes, competition alignment
```

## Quick Start

Backend:

```bash
cd ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env.development
uvicorn main:app --reload --port 8000
```

Frontend:

```bash
cd trading-ui
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:3000
```

Static Paper Desk prototype:

```bash
cd prototypes/paper-desk-game/codebuddy-paper-desk
python3 -m http.server 4187
```

Open:

```text
http://127.0.0.1:4187
```

## Safety Boundary

StockWinWin is an investing research and paper-validation system.

It is not:

- a broker
- a registered investment adviser
- a real-money trading bot
- a guarantee of profit
- a product that manages customer funds

The open-source version should keep execution paper-only unless a future contributor adds a properly reviewed broker sandbox adapter.

## Roadmap

- Build `/paper` in the main app with anonymous paper sessions.
- Add deterministic Macro / Research / Risk committee briefs.
- Persist paper allocations and results in Supabase.
- Add a seven-day paper journal and weekly scorecard.
- Build the watchlist-to-world-model graph for the AI infrastructure universe.
- Add source citations and explicit model-inference labels to every claim.
- Keep Alpaca or other broker integrations paper-only and behind a separate adapter.

## License

This project is open source under the license in `LICENSE`.
