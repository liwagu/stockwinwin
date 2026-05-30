-- Paper Desk deterministic committee and paper ledger.

CREATE TABLE IF NOT EXISTS paper_sessions (
    id TEXT PRIMARY KEY,
    trading_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'allocated', 'resolved')),
    paper_only BOOLEAN NOT NULL DEFAULT TRUE,
    starting_cash INTEGER NOT NULL DEFAULT 100000,
    benchmark_symbol TEXT NOT NULL DEFAULT 'SPY',
    assets JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paper_agent_briefs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES paper_sessions(id) ON DELETE CASCADE,
    agent TEXT NOT NULL CHECK (agent IN ('macro', 'research', 'risk')),
    stance TEXT NOT NULL,
    thesis TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
    invalidation TEXT NOT NULL,
    source_quality TEXT NOT NULL CHECK (
        source_quality IN ('market_data', 'prediction_cache', 'fallback', 'model_inference')
    ),
    allocation_guardrails TEXT NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, agent)
);

CREATE TABLE IF NOT EXISTS paper_allocations (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES paper_sessions(id) ON DELETE CASCADE,
    anonymous_id TEXT NOT NULL,
    allocations JSONB NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, anonymous_id)
);

CREATE TABLE IF NOT EXISTS paper_results (
    id TEXT PRIMARY KEY,
    allocation_id TEXT NOT NULL REFERENCES paper_allocations(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL REFERENCES paper_sessions(id) ON DELETE CASCADE,
    returns JSONB NOT NULL,
    portfolio_return DOUBLE PRECISION NOT NULL,
    benchmark_symbol TEXT NOT NULL DEFAULT 'SPY',
    benchmark_return DOUBLE PRECISION NOT NULL,
    alpha DOUBLE PRECISION NOT NULL,
    drawdown DOUBLE PRECISION NOT NULL CHECK (drawdown >= 0),
    price_source TEXT NOT NULL CHECK (price_source IN ('prediction_cache', 'fallback')),
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (allocation_id)
);

CREATE INDEX IF NOT EXISTS idx_paper_allocations_anonymous_id
    ON paper_allocations(anonymous_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_paper_results_session_id
    ON paper_results(session_id);
