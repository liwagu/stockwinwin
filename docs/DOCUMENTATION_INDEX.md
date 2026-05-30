# StockWin Documentation Index

This directory contains comprehensive documentation for the StockWin AI-powered cryptocurrency and stock prediction platform.

## Documentation Files

### 1. **ARCHITECTURE_SUMMARY.md** (START HERE)
**Quick Reference Guide** - Read this first for a high-level overview

- System overview and tech stack
- Key directories and components
- Core features overview
- API endpoints summary
- Data models and entities
- Authentication, prediction, and subscription flows
- Environment configuration
- Common development tasks
- Troubleshooting guide

**When to use**: Getting up to speed, quick lookups, understanding flow diagrams

---

### 2. **ARCHITECTURE.md** (COMPREHENSIVE)
**Detailed Technical Documentation** - Exhaustive reference (1174 lines)

- Executive summary
- Overall architecture with system diagrams
- Complete project directory structure
- Authentication flow deep-dive (Supabase integration)
- API structure (Next.js routes + FastAPI backend)
- Data flow patterns (5 detailed flow diagrams)
- Technology stack and dependencies
- Configuration management
- Deployment architecture
- Security considerations
- Development workflows
- Troubleshooting and common issues

**When to use**: Deep dives, implementation details, debugging, architecture decisions

---

### 3. **README.md** (ORIGINAL)
**Project Overview** - Features, quick start, configuration

- Features and highlights
- Quick start (Docker and local development)
- How it works (data collection, AI prediction, visualization, caching)
- Configuration options
- API reference with examples
- Project structure
- Testing instructions
- Roadmap and future enhancements
- Disclaimer and acknowledgments

**When to use**: Getting started, understanding features, API usage

---

### 4. **CI_CD_PIPELINE.md**
**Deployment and CI/CD Setup** - GitHub Actions, Railway, deployment workflow

**When to use**: Setting up deployment, understanding CI/CD pipeline

---

### 5. **PAYMENT_DEBUG_GUIDE.md**
**Stripe Payment System Debugging** - Troubleshooting payment flows, webhook testing

**When to use**: Debugging payment issues, testing Stripe integration

---

### 5.1 **SUBSCRIPTION_STATE_FLOW.md**
**Subscription State Machine** - Mermaid diagram and notes for how Stripe webhooks update `tier`, `status`, `cancel_at_period_end`, and period dates in `app_users`.

**When to use**: Understanding active/inactive transitions, async payment flows, cancel-at-period-end behavior, and renewal failure handling.

---

### 6. **DATABASE_SCHEMA.md**
**Database Schema Reference** - Complete database design documentation

- Tables: app_users, tickers (+ 4 planned tables)
- RLS policies and security model
- Indexes, functions, and triggers
- Foreign keys and constraints
- Environment-specific configurations
- Migration history and known issues
- Schema retention recommendations

**When to use**: Understanding data model, RLS policies, database queries, schema changes

---

### 7. **MIGRATION_GUIDE.md**
**Dev to Prod Migration** - Step-by-step migration instructions

- Prerequisites and preparation
- Schema migration steps
- Auth user migration
- Data import procedures
- Verification checklist
- Rollback plan

**When to use**: Deploying to production, syncing environments

---

### 8. **docs/DATABASE_SCHEMA_RETENTION_PLAN.md**
**Schema Retention Implementation** - Setup guide for version-controlled schema

- Problem statement and goals
- 6-phase implementation plan
- TypeScript type generation
- CI/CD integration
- Local development setup
- Team onboarding guide

**When to use**: Setting up schema version control, improving developer experience

---

### 9. **SENIOR_ENGINEER_ANALYSIS.md**
**Technical Analysis** - System evaluation, architecture assessment

**When to use**: Code review, system analysis, technical decisions

---

### 10. **WEBHOOK_FIX_SUMMARY.md**
**Webhook Integration Summary** - Stripe webhook fixes and improvements

**When to use**: Understanding webhook implementation, payment system details

---

## Quick Navigation

### By Role

**Frontend Developer**
- Start with: ARCHITECTURE_SUMMARY.md → "Frontend Routes" section
- Then read: ARCHITECTURE.md → "Frontend API Routes" section
- Key files: `/trading-ui/app/page.tsx`, `AuthProvider.tsx`, `middleware.ts`

**Backend Developer**
- Start with: ARCHITECTURE_SUMMARY.md → "Backend Routes" section
- Then read: ARCHITECTURE.md → "Backend API Routes" section
- Key files: `/ai-service/main.py`, `routers/`, `middleware/auth.py`

**DevOps Engineer**
- Start with: ARCHITECTURE_SUMMARY.md → "Deployment" section
- Then read: CI_CD_PIPELINE.md
- Key files: `docker-compose.yml`, `Dockerfile.railway`, `nixpacks.toml`

**Full-Stack Developer**
- Read: ARCHITECTURE_SUMMARY.md (complete)
- Reference: ARCHITECTURE.md (sections as needed)
- Explore: Code in `/trading-ui/` and `/ai-service/`

**Product Manager / Tech Lead**
- Read: README.md for features
- Read: ARCHITECTURE_SUMMARY.md sections 1-3
- Reference: ARCHITECTURE.md sections 1-2 for system overview

### By Topic

**Authentication**
- ARCHITECTURE_SUMMARY.md → "Authentication Flow"
- ARCHITECTURE.md → Section 3 "Authentication Flow (Supabase Integration)"
- Code: `/ai-service/middleware/auth.py`, `/trading-ui/app/providers/AuthProvider.tsx`

**API Structure**
- ARCHITECTURE_SUMMARY.md → "API Endpoints Summary"
- ARCHITECTURE.md → Section 4 "API Structure"
- Code: `/ai-service/routers/`, `/trading-ui/app/api/`

**Predictions**
- ARCHITECTURE_SUMMARY.md → "Prediction Generation Flow"
- ARCHITECTURE.md → Section 5.1 "Prediction Generation Flow"
- Code: `/ai-service/crypto_prediction_engine.py`, `kronos_backend.py`

**Payments**
- ARCHITECTURE_SUMMARY.md → "Subscription Flow"
- PAYMENT_DEBUG_GUIDE.md
- SUBSCRIPTION_STATE_FLOW.md → State machine and enforcement rules
- Code: `/ai-service/routers/subscriptions.py`, `services/stripe_service.py`

**Database**
- DATABASE_SCHEMA.md → Complete schema reference (START HERE)
- MIGRATION_GUIDE.md → Dev to Prod migration instructions
- docs/DATABASE_SCHEMA_RETENTION_PLAN.md → Schema retention setup
- ARCHITECTURE_SUMMARY.md → "Database Tables"
- ARCHITECTURE.md → Section 5.5 "Database Schema Overview"
- Code: `/supabase/migrations/`

**Security**
- ARCHITECTURE_SUMMARY.md → "Security" section
- ARCHITECTURE.md → Section 9 "Security Considerations"
- Code: `/ai-service/middleware/auth.py`

**Deployment**
- ARCHITECTURE_SUMMARY.md → "Deployment" section
- CI_CD_PIPELINE.md
- Code: `docker-compose.yml`, `Dockerfile.railway`

## System Diagrams

Key diagrams are included in the documentation:

1. **High-Level Architecture** - ARCHITECTURE.md Section 1
2. **Authentication Flow** - ARCHITECTURE.md Section 3
3. **Prediction Generation** - ARCHITECTURE.md Section 5.1
4. **User Authentication** - ARCHITECTURE.md Section 5.2
5. **Subscription Purchase** - ARCHITECTURE.md Section 5.3
6. **Prediction Data Flow** - ARCHITECTURE.md Section 5.4

## Development Workflow

### Setting Up for the First Time
1. Read: ARCHITECTURE_SUMMARY.md (entire document)
2. Run: `docker-compose up --build`
3. Explore: Frontend at http://localhost:3000, API docs at http://localhost:8000/docs
4. Read: Relevant sections from ARCHITECTURE.md

### Adding a New Feature
1. Check: ARCHITECTURE.md Section 10 "Common Development Workflows"
2. Understand: The data flow patterns from Section 5
3. Implement: Following the patterns used in existing code
4. Test: Using the health check and API docs endpoints

### Debugging Issues
1. Check: ARCHITECTURE_SUMMARY.md "Common Issues" section
2. Review: ARCHITECTURE.md Section 11 "Troubleshooting"
3. Enable: Debug logging in relevant services
4. Inspect: Database state via Supabase dashboard

## Key Concepts

### Kronos AI Model
- Tsinghua University foundation model for financial prediction
- 4.1M parameters (mini variant) with 2048 token context
- Transformer-based decoder architecture
- Generates 24-hour hourly predictions with confidence intervals
- Uses Monte Carlo sampling (30 samples) for uncertainty quantification

### Supabase Integration
- PostgreSQL database with built-in auth
- OAuth 2.0 providers (Google, etc.)
- JWT token generation and management
- User management and role-based access control

### Stripe Integration
- Checkout sessions for payment collection
- Customer portal for subscription management
- Webhook handling for payment events
- Subscription status tracking in database

### APScheduler
- Background task scheduler
- Hourly job for prediction refresh
- Cron trigger at :00 UTC each hour
- Automatic retry on failures

## Important Patterns

### Protected Routes
Frontend: `middleware.ts` redirects unauthenticated users
Backend: `Depends(get_current_user)` or `Depends(require_active_subscription)`

### Caching Strategy
- Market data: TTL cache (55 minutes) in Binance API client
- Predictions: In-memory dict refreshed hourly
- Auth sessions: Secure HTTP-only cookies
- Models: Disk cache via HuggingFace

### Error Handling
- Frontend: Error boundaries and try-catch with user feedback
- Backend: HTTPException with appropriate status codes
- Database: Transaction rollback on errors
- Webhooks: HMAC signature verification

## Testing

### Manual Testing
- Frontend: Browser DevTools Network tab for API calls
- Backend: Swagger UI at http://localhost:8000/docs
- Database: Supabase dashboard direct query
- Payments: Stripe test mode and webhook testing

### Automated Testing
- Backend: `pytest` for unit tests in `/ai-service/tests/`
- Frontend: Playwright E2E tests in `/trading-ui/tests/e2e/`

## Deployment

### Development
```bash
docker-compose up --build
```

### Production
- Frontend: Deployed to Vercel
- Backend: Deployed to Railway
- Database: Supabase Cloud
- See: CI_CD_PIPELINE.md for detailed setup

## Resources

- **Kronos GitHub**: https://github.com/shiyu-coder/Kronos
- **Kronos Paper**: https://arxiv.org/abs/2508.02739
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Stripe Docs**: https://stripe.com/docs

## Support & Questions

For questions about specific areas:

1. **Frontend/React**: Check ARCHITECTURE_SUMMARY.md "Frontend Routes" → ARCHITECTURE.md Section 4
2. **Backend/FastAPI**: Check ARCHITECTURE_SUMMARY.md "Backend Routes" → ARCHITECTURE.md Section 4
3. **Authentication**: Check ARCHITECTURE.md Section 3 with code examples
4. **Payments**: Check PAYMENT_DEBUG_GUIDE.md
5. **AI Model**: Check ARCHITECTURE.md Section 5.1 "Prediction Generation Flow"
6. **Database**: Check ARCHITECTURE.md Section 5.5 "Database Schema Overview"

---

**Last Updated**: November 2025
**Documentation Version**: 2.0
**Status**: Current (as of branch 002-stripe-subscription-system)
