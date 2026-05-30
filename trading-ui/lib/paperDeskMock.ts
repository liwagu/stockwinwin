type Allocation = {
  id: string;
  session_id: string;
  anonymous_id: string;
  allocations: Record<string, number>;
  submitted_at: string;
};

type Result = {
  id: string;
  allocation_id: string;
  session_id: string;
  returns: Record<string, number>;
  portfolio_return: number;
  benchmark_symbol: string;
  benchmark_return: number;
  alpha: number;
  drawdown: number;
  price_source: string;
  resolved_at: string;
};

type MockEntry = {
  allocation?: Allocation;
  result?: Result;
};

type MockStore = Record<string, MockEntry>;

const SUPPORTED_SYMBOLS = ["NVDA", "AMD", "TSLA", "BTCUSDT", "SPY"];
const MOCK_RETURNS: Record<string, number> = {
  NVDA: 0.018,
  AMD: 0.012,
  TSLA: -0.004,
  BTCUSDT: 0.009,
  SPY: 0.006,
};

function mockStore() {
  const globalStore = globalThis as typeof globalThis & {
    __stockwinPaperDeskMock?: MockStore;
  };
  globalStore.__stockwinPaperDeskMock ||= {};
  return globalStore.__stockwinPaperDeskMock;
}

export function isPaperDeskMockMode() {
  return process.env.PAPER_DESK_API_MODE === "mock";
}

export function getMockTodaySession(anonymousId: string) {
  return buildSession(anonymousId);
}

export function submitMockAllocation(payload: {
  session_id?: string;
  anonymous_id?: string;
  allocations?: Record<string, number>;
}) {
  if (!payload.session_id || !payload.anonymous_id || !payload.allocations) {
    return { status: 400, body: { detail: "session_id, anonymous_id, and allocations are required" } };
  }

  const validation = validateAllocations(payload.allocations);
  if (validation) {
    return { status: 400, body: { detail: validation } };
  }

  const allocation: Allocation = {
    id: stableId("allocation", payload.session_id, payload.anonymous_id),
    session_id: payload.session_id,
    anonymous_id: payload.anonymous_id,
    allocations: normalizeAllocations(payload.allocations),
    submitted_at: now(),
  };
  mockStore()[storeKey(payload.session_id, payload.anonymous_id)] = { allocation };

  return { status: 200, body: buildSession(payload.anonymous_id) };
}

export function resolveMockSession(payload: { session_id?: string; anonymous_id?: string }) {
  if (!payload.session_id || !payload.anonymous_id) {
    return { status: 400, body: { detail: "session_id and anonymous_id are required" } };
  }

  const key = storeKey(payload.session_id, payload.anonymous_id);
  const entry = mockStore()[key];
  if (!entry?.allocation) {
    return { status: 400, body: { detail: "Allocation is required before resolve" } };
  }

  const portfolioReturn = Object.entries(entry.allocation.allocations).reduce(
    (sum, [symbol, weight]) => sum + (weight / 100) * (MOCK_RETURNS[symbol] || 0),
    0
  );
  const benchmarkReturn = MOCK_RETURNS.SPY;
  entry.result ||= {
    id: stableId("result", entry.allocation.id),
    allocation_id: entry.allocation.id,
    session_id: payload.session_id,
    returns: MOCK_RETURNS,
    portfolio_return: round(portfolioReturn),
    benchmark_symbol: "SPY",
    benchmark_return: benchmarkReturn,
    alpha: round(portfolioReturn - benchmarkReturn),
    drawdown: round(Math.max(0, -portfolioReturn)),
    price_source: "fallback",
    resolved_at: now(),
  };

  return { status: 200, body: buildSession(payload.anonymous_id) };
}

export function getMockHistory(anonymousId: string) {
  const sessions = Object.values(mockStore())
    .filter(entry => entry.allocation?.anonymous_id === anonymousId)
    .map(() => buildSession(anonymousId));

  return { anonymous_id: anonymousId, sessions };
}

function buildSession(anonymousId: string) {
  const sessionId = todaySessionId();
  const entry = mockStore()[storeKey(sessionId, anonymousId)] || {};
  const status = entry.result ? "resolved" : entry.allocation ? "allocated" : "open";
  const generatedAt = `${today()}T13:30:00.000Z`;

  return {
    session_id: sessionId,
    trading_date: today(),
    status,
    paper_only: true,
    disclaimer: "Paper-only research workflow. No real-money orders are placed.",
    starting_cash: 100000,
    benchmark_symbol: "SPY",
    assets: [
      { symbol: "NVDA", display_name: "Nvidia", asset_type: "stock", current_price: 1024, price_source: "fallback" },
      { symbol: "AMD", display_name: "AMD", asset_type: "stock", current_price: 168, price_source: "fallback" },
      { symbol: "TSLA", display_name: "Tesla", asset_type: "stock", current_price: 184, price_source: "fallback" },
      { symbol: "BTCUSDT", display_name: "Bitcoin", asset_type: "crypto", current_price: 67000, price_source: "fallback" },
      { symbol: "SPY", display_name: "S&P 500 ETF", asset_type: "etf", current_price: 520, price_source: "fallback" },
    ],
    briefs: [
      {
        agent: "macro",
        stance: "Liquidity risk-on",
        thesis: "Rates are steady and growth beta remains supported.",
        confidence: 0.73,
        evidence: ["Dollar soft", "Credit spreads contained"],
        invalidation: "Hot inflation print resets duration risk.",
        source_quality: "fallback",
        allocation_guardrails: "Keep benchmark exposure unless evidence improves.",
        generated_at: generatedAt,
      },
      {
        agent: "research",
        stance: "AI infrastructure demand",
        thesis: "Cloud budgets still point toward GPU and memory demand.",
        confidence: 0.82,
        evidence: ["Capex cycle intact", "Semis leadership broadening"],
        invalidation: "Hyperscaler guidance rolls over.",
        source_quality: "fallback",
        allocation_guardrails: "Prefer diversified exposure across leaders.",
        generated_at: generatedAt,
      },
      {
        agent: "risk",
        stance: "Crowded long",
        thesis: "Upside is real, but bad guidance can punish position size.",
        confidence: 0.61,
        evidence: ["High momentum concentration", "Volatility can gap"],
        invalidation: "Breadth improves with lower realized volatility.",
        source_quality: "fallback",
        allocation_guardrails: "Avoid single-name concentration above 40%.",
        generated_at: generatedAt,
      },
    ],
    allocation: entry.allocation || null,
    result: entry.result || null,
    generated_at: generatedAt,
  };
}

function validateAllocations(allocations: Record<string, number>) {
  const normalized = normalizeAllocations(allocations);
  const unsupported = Object.keys(normalized).filter(symbol => !SUPPORTED_SYMBOLS.includes(symbol));
  if (unsupported.length) return `Unsupported paper symbols: ${unsupported.join(", ")}`;
  const total = Object.values(normalized).reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 100) > 0.01) return `Allocations must total 100, got ${total.toFixed(2)}`;
  return null;
}

function normalizeAllocations(allocations: Record<string, number>) {
  return Object.fromEntries(
    Object.entries(allocations).map(([symbol, weight]) => [symbol.toUpperCase(), Number(weight)])
  );
}

function storeKey(sessionId: string, anonymousId: string) {
  return `${sessionId}:${anonymousId}`;
}

function todaySessionId() {
  return `paper-${today()}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function now() {
  return new Date().toISOString();
}

function round(value: number) {
  return Number(value.toFixed(6));
}

function stableId(...parts: string[]) {
  return `mock-${parts.join("-")}`;
}
