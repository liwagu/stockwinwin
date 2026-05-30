# Paper Desk: One-Person Investment Bank

A standalone HTML/CSS/JavaScript paper-trading strategy game for the CodeBuddy / Cloud Studio mini hackathon.

The game is intentionally independent from StockWin's production prediction backend. It uses no login, no broker connection, no API keys, and no real trading.

Hackathon note: this version uses scripted demo agents and deterministic market scenarios. It does not call an LLM, broker, or live market-data backend.

## Run Locally

```bash
cd /Users/guliwa/_code/stockwin-paper-desk-game/codebuddy-paper-desk
python3 -m http.server 4187
```

Open:

```text
http://127.0.0.1:4187
```

## Deploy In CodeBuddy / Cloud Studio

This project is a static one-file web game:

```text
codebuddy-paper-desk/index.html
```

Recommended Cloud Studio setup:

1. Create or open a CodeBuddy / Cloud Studio workspace.
2. Upload or copy the `codebuddy-paper-desk` folder.
3. Make sure `index.html` is at the web root or inside the folder selected for deployment.
4. Start a static preview with `python3 -m http.server 8080` if Cloud Studio asks for a run command.
5. Deploy the static preview URL before the hackathon submission deadline.

No environment variables are required.

## Controls

- Mouse: click allocation buttons, then run the market day.
- Keyboard: `Enter` or `Space` to start / continue.
- Keyboard: `1-5` selects `NVDA`, `AMD`, `TSLA`, `BTC`, `SPY`.
- Keyboard: arrow keys adjust the selected asset.
- Keyboard: `R` restarts the desk.

## Game Loop

1. Start with `$100,000` simulated capital.
2. Read briefings from Macro, Research, and Risk agents.
3. Allocate capital across five assets.
4. Run one market day.
5. Review PnL, benchmark, alpha, and drawdown.
6. Repeat for five days and receive a final score.

## Safe Pitch Boundary

This is paper trading as a game, not financial advice. It does not claim to predict real returns or automate real brokerage activity.

For the hackathon demo, the agent briefings are scripted to communicate the product loop. The intended StockWin follow-up is real source-linked thesis generation and paper-trading audit logs.

## English Pitch

### 30 seconds

Most trading apps show charts. Paper Desk turns trading research into a game loop.

You run a one-person investment bank with $100,000 in simulated capital. Every round, three AI agents brief you: Macro, Research, and Risk. You allocate across five assets, run the market day, and see whether your thesis beats the S&P benchmark without taking too much drawdown.

The point is not to promise profit. The point is to train decision discipline before real money is involved.

### 60 seconds

Paper Desk is a playable paper-trading strategy game about running a one-person investment bank.

You start with $100,000 in simulated capital. Each market day, three AI agents brief you: a Macro Agent explains the market regime, a Research Agent gives the bull case, and a Risk Agent challenges the trade. Then you allocate across Nvidia, AMD, Tesla, Bitcoin, and SPY.

After each round, the market resolves. You see PnL, benchmark performance, alpha, and drawdown. After five days, the game tells you whether your investment process beat the benchmark or just took unnecessary risk.

This came from my work on StockWin, an AI market research project. The broader vision is simple: before AI ever touches real trading, it should prove that its theses can be tracked, scored, and audited in a paper environment.

## Taglines

- Build your one-person investment bank.
- Test the thesis before risking the money.
- AI trading, scored before it gets serious.
