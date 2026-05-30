# StockWin GTM Growth Reset Plan

Date: 2026-05-21

## Executive Call

Do not pivot StockWin into a generic "agent trading" product yet. That market is crowded, trust is weak, and the product does not have proof that automated agents can make money. The safer near-term wedge is:

**A public AI market forecast workbench with daily forecast reports, transparent model scorecards, and ticker-specific pages that convert readers into email subscribers and paid users.**

The current product has a real asset: a working Kronos backend on MBP-b returning 20 symbols through `https://api.stockwin.win`. The current GTM problem is that the product does not expose that asset as a growth engine. The landing page should stay focused with 3 preview symbols, while the full 20-symbol universe is exposed through ticker SEO pages, sitemap coverage, and the dashboard. Interest capture was not persistent, there was no search/SEO surface, no real funnel analytics, and no repeatable content loop.

## Research Inputs

Sources reviewed:

- `awesome-openclaw-skills` Marketing & Sales category: current raw page has 98 listed links, grouped around analytics, content, outbound, paid ads, social, affiliate, CRM, and lead magnets.
- Relevant OpenClaw skill pages: `go-to-market`, `lead-magnets`, `solo-metrics-track`, `posthog`, `b2c-marketing`, `reef-copywriting`, `listing-swarm`.
- Alex Vacca / ColdIQ X profile and target post via local `browse.sh`: 53 visible status posts extracted from the logged-out X timeline, plus the specific paid-media-skills post.
- StockWin codebase: frontend landing, pricing, signup, dashboard, billing, Next API routes, backend prediction and interest endpoints, Supabase schema backup.

Important limitation: `browse.sh` local browser can extract visible public X posts. Browserbase cloud mode is not currently usable because `BROWSERBASE_API_KEY` is not configured. Full extraction of all 3,300 X posts requires login state, X API access, or a separate data provider.

## What Alex Vacca Is Doing

The extracted sample shows a repeatable content system:

- Most visible posts use strong narrative hooks, large numbers, recognizable entities, and controversy/history angles.
- Threads are built to be consumed as standalone educational stories, not product announcements.
- Lead magnet posts convert attention into a concrete asset. The target post offers a set of paid-media operating skills and asks for a keyword reply to trigger distribution.
- His GTM image frames growth as a flywheel: content builds trust, ads retarget/warm, outbound reaches named prospects, and measurement is tied to pipeline rather than platform vanity metrics.

StockWin translation:

- Do not post "our AI predicts stocks" as generic marketing.
- Post daily or weekly market artifacts that are useful even before signup.
- Convert attention into owned audience: email list, watchlist alerts, daily forecast digest.
- Only then ask for $15/month.

## Current Product Diagnosis

### What Works

- Public backend is alive: `https://api.stockwin.win/v1/health` returns healthy.
- Public backend and frontend proxy both return 20 predictions.
- Stripe price is now $15/month in the UI and backend checkout is subscription-based.
- Dashboard has a useful locked/pro structure for 20 configured assets.

### Growth Blockers

1. Homepage should stay focused, not become a 20-row scanner.

   File: `trading-ui/app/page.tsx`

   The public forecast desk is intentionally limited to 3 preview symbols. The full 20-symbol surface should live in ticker pages and the authenticated dashboard, otherwise the landing hero becomes visually heavy and conversion-hostile.

2. No durable lead capture.

   File: `ai-service/main.py`

   `/v1/interest` stores submissions in an in-memory Python list. Every backend restart loses leads. For a product with no user growth, this is a P0 issue.

3. Interest form does not match the 20-symbol product.

   File: `trading-ui/app/components/InterestForm.tsx`

   It only offers BTC, ETH, XRP. It does not capture source, UTM params, referring page, selected ticker, or user intent.

4. No real funnel analytics.

   File: `trading-ui/app/layout.tsx`

   Vercel Analytics is present, but there is no event funnel for prediction views, locked ticker clicks, signup starts, checkout starts, payment success, or returning usage.

5. No SEO acquisition surface.

   Live checks:

   - `https://www.stockwin.win/robots.txt` returns 404.
   - `https://www.stockwin.win/sitemap.xml` returns 404.
   - The site has one generic homepage title and no ticker-specific pages.

6. Signup flow does not preserve buying intent.

   File: `trading-ui/app/(auth)/signup/page.tsx`

   `/signup?plan=pro` does not create a direct path to checkout after Google auth. The user lands in dashboard, then must discover billing again.

7. Trust proof is missing.

   The product asks users to trust predictions, but there is no model scorecard, historical hit-rate, calibration chart, or public "predictions vs actual" archive.

## Positioning

Current positioning:

> AI-assisted market forecast curves, confidence bands, and asset coverage for research workflows.

Better near-term positioning:

> Daily AI forecast reports for 20 crypto, equity, ETF, and volatility tickers, with transparent confidence bands and public accuracy tracking.

Avoid:

- "Agent trading"
- "Guaranteed win"
- "Make money with AI"
- Claims that imply investment advice

Use:

- Forecast workbench
- Signal audit
- Model scorecard
- Prediction archive
- Research input
- Not financial advice

## Product Architecture To Support GTM

### P0: Make The Current Product Legible

Frontend:

- Show 3 preview symbols on the homepage.
- Expose the 20-symbol universe through `/markets/{symbol}`, sitemap, and dashboard.
- Keep some charts free, but show the full universe as locked or preview cards.
- Add a "Today's AI Market Board" section:
  - top upside forecast
  - top downside forecast
  - highest uncertainty
  - latest sync time
  - backend health state
- Add legal copy near forecast output: forecasts are research inputs, not financial advice.

Backend:

- Add `/v1/markets/summary` or compute summary from `/v1/predictions`.
- Return fields needed by the homepage:
  - `symbol`
  - `display_name`
  - `asset_type`
  - `current_price`
  - `forecast_24h_price`
  - `forecast_return_pct`
  - `confidence_score`
  - `volatility_score`
  - `generated_at`

### P0: Persist Leads And Attribution

Add Supabase table:

```sql
create table public.lead_submissions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text,
  source_page text,
  selected_symbol text,
  preferred_assets text[] default '{}',
  intent text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  user_agent text,
  consent_marketing boolean not null default false,
  created_at timestamptz not null default now()
);

create index lead_submissions_email_idx on public.lead_submissions(email);
create index lead_submissions_symbol_idx on public.lead_submissions(selected_symbol);
create index lead_submissions_created_at_idx on public.lead_submissions(created_at desc);
```

Then change `/v1/interest` to insert into this table instead of memory.

### P0: Instrument The Funnel

Either use PostHog or a simple Supabase `growth_events` table. PostHog is better for product analytics; Supabase is enough for a cheap start.

Track:

- `homepage_viewed`
- `prediction_board_loaded`
- `prediction_symbol_selected`
- `locked_symbol_clicked`
- `signup_started`
- `signup_completed`
- `checkout_started`
- `checkout_completed`
- `checkout_canceled`
- `interest_submitted`
- `dashboard_returned`
- `billing_page_viewed`

Minimum properties:

- `symbol`
- `tier`
- `source_page`
- `utm_source`
- `utm_campaign`
- `is_authenticated`
- `prediction_count`

Kill/iterate thresholds for the next 30 days:

- Homepage to signup: below 2% means messaging/value surface is weak.
- Signup to dashboard: below 60% means auth flow friction is too high.
- Dashboard to checkout start: below 5% means locked value is not compelling.
- Checkout start to paid: below 30% means pricing/trust/payment friction.
- 7-day return rate: below 10% means the product is not habit-forming.

### P1: Programmatic SEO Pages

Create one page per supported symbol:

- `/markets/btcusdt`
- `/markets/ethusdt`
- `/markets/nvda`
- `/markets/tsla`
- etc.

Each page needs unique value, not thin template text:

- 24h forecast chart
- current price
- forecast return
- confidence band
- sync timestamp
- model caveat
- recent prediction archive
- email capture for that symbol
- internal links to related tickers

Example title patterns:

- `BTCUSDT AI Forecast Today | StockWin`
- `NVDA 24h AI Price Forecast | StockWin`
- `TSLA Forecast Curve and Confidence Band | StockWin`

Also add:

- `app/robots.ts`
- `app/sitemap.ts`
- Open Graph metadata
- ticker-specific social preview images later

### P1: Daily Forecast Report

Create a daily generated report at:

- `/reports/today`
- `/reports/2026-05-21`

Report sections:

- 20-symbol market board
- biggest forecasted movers
- highest uncertainty names
- model failures or missing data
- "what changed since yesterday"
- email capture CTA

This becomes the main content asset for X, LinkedIn, Reddit, and email.

### P1: Fix Signup-To-Checkout Intent

Current path:

`Pricing -> Signup -> Google auth -> Dashboard -> Billing -> Checkout`

Better path:

`Pricing Professional -> Signup with plan=pro -> Google auth -> Billing -> Checkout`

Implementation:

- Preserve `plan=pro` in OAuth redirect/callback.
- After auth callback, if plan is pro, redirect to `/dashboard/billing?intent=upgrade`.
- Optionally auto-open checkout only after showing the billing page, not immediately, to avoid surprise.

### P1: Convert Locked Cards

Current dashboard lock is visually clear but not growth-optimized.

Improve each locked card:

- Show symbol and preview stats.
- Hide only the full chart/details.
- CTA: `Unlock all 20 forecasts`.
- Track `locked_symbol_clicked`.
- If unauthenticated on public pages, CTA goes to `/signup?plan=pro&symbol=NVDA`.
- If authenticated free user, CTA goes to `/dashboard/billing?symbol=NVDA`.

## GTM Flywheel

### Owned Channel

Build an email list around daily forecast reports.

Lead magnets:

- Daily 20-symbol AI Forecast Report
- Weekly "Kronos Forecast Scorecard"
- "AI forecast vs actual: this week's winners and misses"
- "How I run a stock forecasting backend on a 24GB MacBook"
- "StockWin public model audit archive"

### Rented Channels

Primary:

- X
- LinkedIn
- Reddit cautiously

Content formats:

- Daily market board screenshot
- Weekly model scorecard
- Build-in-public infrastructure posts
- Forecast postmortems
- "We predicted X, actual was Y" transparency posts

Alex-inspired post structure:

1. Hook with specific entity, number, or contradiction.
2. Explain the mechanism.
3. Show the artifact.
4. Offer the asset.
5. Route to email/signup.

Do not copy his topics. Copy the mechanics.

### Borrowed Channels

Submit to:

- AI tool directories
- finance tool directories
- indie hacker communities
- AI trading/quant GitHub lists where allowed
- Berlin/student/founder communities

The OpenClaw `listing-swarm` idea is relevant because directory submission is a cheap, structured distribution motion for a solo founder.

### Paid Ads

Do not start broad paid acquisition yet.

Use only:

- retargeting visitors who viewed predictions
- small experiments against X/LinkedIn engagers after content starts working
- maybe Berlin-local retargeting if poster traffic continues

Budget rule:

- No paid scaling until funnel analytics show signup and checkout conversion.

## 30-Day Execution Plan

### Week 1: Measurement And Product Surface

- Add persistent `lead_submissions`.
- Add analytics events.
- Add robots and sitemap.
- Change homepage to expose all 20 symbols.
- Add market summary cards.
- Verify all 20 predictions on public and frontend proxy routes.

### Week 2: SEO And Reports

- Create `/markets/[symbol]` pages.
- Create `/reports/today`.
- Add internal links from homepage to symbol pages.
- Add email capture tied to selected symbol.
- Generate first daily report manually if automation is not ready.

### Week 3: Content And Email

- Publish 5 X/LinkedIn posts based on daily reports.
- Send a founder reactivation email to existing users:
  - backend is back
  - now 20 symbols
  - $15/month pro
  - ask which ticker they want next
- Start a weekly "forecast scorecard" email.

### Week 4: Distribution Expansion

- Submit StockWin to relevant AI/finance directories.
- Post transparent build-in-public thread about replacing Azure with MBP-b + Cloudflare Tunnel.
- Test one tiny retargeting campaign only after analytics are live.
- Review funnel data and decide whether to push pricing, free tier, or feature depth.

## Concrete Engineering Backlog

### P0

- `ai-service`: persist `/v1/interest` to Supabase.
- `trading-ui`: add tracking helper and funnel events.
- `trading-ui`: add `robots.ts` and `sitemap.ts`.
- `trading-ui`: homepage should show all 20 supported symbols, not only BTC/ETH/XRP.
- `trading-ui`: make `/signup?plan=pro` preserve upgrade intent.

### P1

- `trading-ui`: implement `/markets/[symbol]`.
- `trading-ui`: implement `/reports/today`.
- `ai-service`: add market summary endpoint or forecast summary fields.
- `ai-service`: persist hourly forecasts for historical scorecards.
- `trading-ui`: add symbol-specific email capture.

### P2

- Add forecast-vs-actual scorecard.
- Add daily email automation.
- Add social preview images for market reports.
- Add directory submission checklist.
- Add retargeting audiences after consent and privacy review.

## Business Decision Rules

Continue if, after 30 days:

- At least 100 email subscribers or 20 new registered users.
- At least 5 users return to dashboard more than twice.
- At least 2 users start checkout at $15/month.

Change offer if:

- People view reports but do not sign up.
- Signup happens but dashboard return rate is low.
- Checkout starts but payment does not complete.

Stop pushing paid until fixed if:

- Forecast accuracy cannot be measured.
- Backend uptime is unreliable.
- Lead capture remains non-persistent.

## Immediate Recommendation

The next implementation sprint should not be "agent trading." It should be:

1. Persistent leads.
2. Funnel analytics.
3. 20-symbol homepage.
4. Ticker SEO pages.
5. Daily forecast report.
6. Forecast scorecard.

That gives StockWin a reason to exist publicly, a reason for people to come back, and a way to learn whether $15/month is viable.

## Changes Started In This Pass

Implemented immediately:

- Homepage forecast desk now requests/displays the current 20-symbol universe instead of filtering to BTC, ETH, and XRP.
- Pricing copy now reflects the public 20-symbol board and positions Professional around private dashboard/search/early tooling.
- Interest form symbol options now include all 20 current symbols.
- Backend `InterestSubmission` validation now accepts the same 20 symbols.
- Added Next metadata routes for `robots.txt` and `sitemap.xml`.

Still not implemented:

- Persistent `lead_submissions` table and repository.
- Funnel analytics events.
- `/markets/[symbol]` SEO pages.
- Daily report pages.
- Forecast-vs-actual scorecard.
