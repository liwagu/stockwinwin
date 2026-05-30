# StockWin x Build with Gemini XPRIZE Alignment

Date: 2026-05-30

Sources:

- Official site: `https://www.geminixprize.com/`
- Official rules: `https://www.geminixprize.com/rules`

## Competition Facts That Matter

Build with Gemini XPRIZE is not a normal demo hackathon. It is framed as a 90-day business-building competition:

- Build window: May 19, 2026 to August 17, 2026, 1:00 PM PT.
- Total cash prize pool: $2,000,000.
- Winners announced around September 25, 2026.
- The product must be a business that operates with AI.
- The project must use at least one Google Cloud product.
- If the project includes LLM functionality, it must use the Gemini API for at least one LLM call in the deployed application.
- Submissions must provide evidence of real users, revenue, costs, marketing spend, agent execution logs, API usage records, and product screenshots.
- Judging criteria are equally weighted:
  - Business viability.
  - AI-native operations.
  - Category impact.

This means StockWin should not submit a clever finance demo. It should submit a small but real AI-native business with revenue and operating logs.

## Strategic Read

StockWin can fit, but only if it is reframed.

Do not submit:

> Old StockWin: AI stock price prediction dashboard.

Submit:

> **StockWin Paper Desk: an AI-native investment research desk that generates daily market theses, lets users paper-trade them, and audits the results before anyone risks real money.**

The old StockWin backend can be disclosed as pre-existing infrastructure. The XPRIZE project should be the new Paper Desk product created during the competition window.

## Best Category

Primary category:

> **Professional Services Access**

Reason:

- Paper Desk gives everyday people access to a workflow that looks like an analyst/research desk.
- It avoids claiming to provide financial advice or money management.
- It is more defensible than "agent trading" because the product is research process, scoring, and accountability.

Secondary category angle:

> **Money & Financial Access**

Use this only as supporting narrative: Paper Desk lowers the barrier to disciplined market research and financial learning. Do not frame it as automated wealth creation.

## Competition-Ready Product Shape

The product should become:

> A daily AI investment committee for paper trading.

User-facing loop:

1. Gemini-powered Macro / Research / Risk agents generate a daily watchlist.
2. User allocates simulated capital.
3. StockWin resolves results with real market data.
4. Gemini writes a post-market thesis audit.
5. The user sees alpha, drawdown, thesis quality, and a saved journal.

Business-facing loop:

1. AI Market Editor decides what public report to publish today.
2. AI Trust Auditor checks claims, source labels, and "not financial advice" language.
3. AI Growth Agent generates daily email/social/poster copy from the public report.
4. AI Ops Dashboard records agent runs, API usage, conversion events, and revenue.

This is important because the judging criteria include AI-native operations, not only AI features.

## Required Gemini Usage

Use Gemini in production, not just in the pitch.

Minimum Gemini calls:

1. `daily_brief_generation`
   - Inputs: existing StockWin forecast data, market prices, selected assets, prior thesis outcomes.
   - Output: structured Macro / Research / Risk briefs.

2. `post_market_audit`
   - Inputs: submitted allocation, actual returns, benchmark return, original theses.
   - Output: concise audit: what was right, what failed, what to watch tomorrow.

3. `growth_artifact_generation`
   - Inputs: best public thesis audit and scorecard.
   - Output: email digest, LinkedIn/X post draft, poster copy.

These calls should be logged with:

- prompt_version
- model_name
- input hashes or summaries
- output JSON
- user/session id
- timestamp
- cost estimate if available

## Required Google Cloud Usage

Use at least one Google Cloud product in the deployed product.

Lowest-friction option:

- Deploy the Paper Desk API or Gemini worker on Google Cloud Run.
- Store agent run logs in Firestore or BigQuery.
- Keep the existing Vercel/Supabase/Cloudflare pieces if useful, but make Google Cloud a real production dependency.

Better XPRIZE evidence option:

- Cloud Run: `paper-desk-agent-worker`.
- Firestore: daily sessions and agent run logs.
- BigQuery: analytics table for user events, revenue, agent runs, and paper results.
- Cloud Scheduler: daily morning brief generation and post-market audit jobs.

## Product Scope To Build Before Submission

### Week 1: Make It Eligible

- Create a new Paper Desk worktree/repo path with clear commit history after May 19, 2026.
- Add `/paper` in the main StockWin frontend.
- Add Gemini-powered daily brief generation.
- Deploy one production component on Google Cloud.
- Add visible "paper trading only, not financial advice" labels.

### Week 2: Make It A Business

- Add a paid "Paper Desk Founder Pass".
- Suggested price: $9/month or $29 for a 30-day paper trading challenge.
- Do not rely on old $3 users as prize evidence. Competition revenue should be earned during the May 19 to Aug 17 window.
- Start collecting testimonials from arms-length users.

### Week 3: Make It AI-Native

- Add agent execution logs.
- Add an internal evidence dashboard:
  - total users
  - active paper sessions
  - revenue
  - costs
  - Gemini calls
  - daily reports generated
  - thesis audit count
- Let AI choose the daily public report and draft the outbound/email copy.

### Week 4: Make It Submittable

- Write the Devpost description in English.
- Record a sub-3-minute demo video.
- Export revenue/user/cost evidence.
- Prepare a short live-demo path with test credentials.
- Prepare a "pre-existing code disclosure" explaining that StockWin existed before the competition, while Paper Desk was newly created during the competition.

## Revenue Strategy

The competition rewards real revenue, not theoretical willingness to pay.

Recommended offer:

> **30-Day AI Paper Trading Challenge**

Price:

- $29 one-time for the challenge, or
- $9/month founder pass.

What buyers get:

- Daily Gemini-generated watchlist.
- Personal paper allocation journal.
- Post-market audit.
- Weekly scorecard.
- Access to a private report archive.

Why this is better than $3:

- It is still cheap enough for Berlin/US users.
- It produces more meaningful revenue evidence.
- It gives users a reason to return for 30 days.
- It is framed as education/research discipline, not profit promise.

## What To Avoid

- Do not claim StockWin helps users make money.
- Do not connect real brokerage execution.
- Do not make Gemini "trade for users".
- Do not submit the old forecast dashboard as if it were newly created.
- Do not hide that some infrastructure existed before the competition.
- Do not optimize for a beautiful demo while ignoring revenue evidence.

## Submission Story

Short pitch:

> StockWin Paper Desk makes institutional-style market research accessible to everyday investors. Gemini agents create daily Macro, Research, and Risk briefs, users allocate paper capital, and the system audits every thesis against real market outcomes. The business sells a 30-day AI Paper Trading Challenge, proving trust through paper results before real money is ever involved.

Why it fits the XPRIZE:

- Business viability: paid 30-day challenge, measurable revenue, recurring subscription path.
- AI-native operations: Gemini agents generate briefs, audits, public reports, and growth assets; agent runs are logged in production.
- Category impact: gives non-professionals access to an investment research desk workflow without crossing into automated financial advice.

## Immediate Next Build

Build this first:

> `/paper` with Gemini-generated daily briefs, paper allocation, persisted journal, and post-market audit.

Definition of done:

- One real user can pay for or join the 30-day challenge.
- Gemini generates a daily brief in production.
- The user submits a paper allocation.
- The system resolves results and generates a Gemini audit.
- The evidence dashboard can show users, revenue, costs, Gemini calls, and agent logs.

