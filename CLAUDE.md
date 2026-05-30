# StockWin

AI-powered stock and crypto price prediction platform. Delivers 24-hour forecasts with confidence bands, hourly refreshes, and actionable context for individual investors.

## Architecture

```
stockwin/
├── ai-service/          # Python FastAPI backend — ML predictions, Stripe billing, Supabase auth
│   ├── main.py          # FastAPI app entrypoint
│   ├── config.py        # Environment config
│   ├── kronos_integration/  # Kronos ML model for price prediction
│   ├── routers/         # API routes: users, subscriptions, webhooks
│   ├── services/        # Stripe, Supabase, webhook idempotency
│   ├── repositories/    # Data access layer (Supabase)
│   ├── middleware/       # Auth middleware (JWT validation)
│   └── migrations/      # SQL migrations
├── trading-ui/          # Next.js 15 frontend (App Router, shadcn/ui, Tailwind CSS 4)
│   ├── app/
│   │   ├── page.tsx             # Landing page with live prediction charts
│   │   ├── layout.tsx           # Root layout (fonts, providers)
│   │   ├── globals.css          # CSS variables, theme, animations
│   │   ├── (auth)/              # Login, signup flows
│   │   ├── (dashboard)/         # Authenticated dashboard, billing, watchlist
│   │   ├── api/                 # Next.js API routes (proxy to ai-service)
│   │   ├── components/          # Shared components (charts, overlays, footer)
│   │   ├── hooks/               # Custom hooks (subscription status, etc.)
│   │   └── providers/           # Auth provider (Supabase)
│   ├── components/ui/           # shadcn/ui primitives
│   ├── types/                   # TypeScript types
│   ├── tests/e2e/               # Playwright e2e tests
│   └── middleware.ts            # Supabase auth middleware
├── supabase/                    # Supabase config and migration backups
└── docker-compose.yml           # Local dev: ai-service container
```

## Dev Commands

### Frontend (trading-ui/)
```bash
cd trading-ui
npm run dev          # Start Next.js dev server (Turbopack) on :3000
npm run build        # Production build (Turbopack)
npm run lint         # ESLint
npx playwright test  # Run e2e tests (starts dev server automatically)
```

### Backend (ai-service/)
```bash
cd ai-service
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Full stack (docker)
```bash
docker compose up    # Starts ai-service
```

## Tech Stack

- **Frontend:** Next.js 15 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion, Recharts
- **Backend:** Python, FastAPI, Kronos ML model
- **Auth:** Supabase (SSR client via @supabase/ssr)
- **Payments:** Stripe (subscriptions, webhooks, customer portal)
- **Testing:** Playwright (e2e), tests in `trading-ui/tests/e2e/`
- **Deployment:** Railway (ai-service), Vercel (trading-ui)

## Environment Variables

### Frontend (.env in trading-ui/)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `NEXT_PUBLIC_API_URL` — AI service URL (default: http://localhost:8000)

### Backend (.env in ai-service/)
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` — Supabase service access
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID` — Stripe billing
- `FRONTEND_URL` — For CORS and redirects

Never commit `.env` files. Use `.env.example` as reference.

## Code Conventions

- **Imports:** Use `@/` path alias for all imports from project root (configured in tsconfig.json)
- **Components:** React Server Components by default. Add `"use client"` only when needed (hooks, event handlers, browser APIs)
- **Styling:** Tailwind utility classes. CSS variables for theme tokens in `globals.css`. No inline style objects unless dynamic
- **Types:** Strict TypeScript. Types in `trading-ui/types/`. No `any` without justification
- **Testing:** Playwright for e2e. Test files in `tests/e2e/*.spec.ts`. Tests run against `localhost:3000`

## Branch Strategy

- `main` — production (all work merged here via fast-forward from dev)
- `dev` — integration branch, all feature work merges here first
- `feature/*` — short-lived feature branches off dev, PR back to dev

### Workflow
1. `git checkout dev && git pull`
2. `git checkout -b feature/my-feature`
3. Work, commit, push feature branch
4. PR feature → dev (squash or rebase merge)
5. When dev is stable: PR dev → main (fast-forward merge)
6. Deploy from main

### Legacy branches (pending cleanup, DO NOT DELETE until production deploy is verified)
- `001-transform-broker-trading` — original dev branch, 215 commits behind main
- `002-stripe-subscription-system`, `003-branch`, `004-branch` — merged into main
- `feature/*`, `release/*`, `keep-backup-*` — stale, verify before deleting

## Design System

**STATUS: Needs formalization.** Run `/design-consultation` to create DESIGN.md.

Current state has known issues that should be resolved:
- 9 Google Fonts loaded, only 3 used (Space Grotesk, Geist, Geist Mono). Remove unused: Cormorant Garamond, Poppins, Kalam, PT Serif, Old Standard TT, Noto Serif, Swansea
- Purple/cyan palette reads as generic "AI SaaS" rather than financial intelligence platform
- Background gradient blobs and triple-gradient hero text are AI slop patterns

When DESIGN.md exists, always read it before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
