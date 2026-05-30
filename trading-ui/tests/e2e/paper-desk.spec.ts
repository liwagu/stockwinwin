import { expect, test } from '@playwright/test';

const assets = [
  { symbol: 'NVDA', display_name: 'Nvidia', asset_type: 'stock', current_price: 1024, price_source: 'fallback' },
  { symbol: 'AMD', display_name: 'AMD', asset_type: 'stock', current_price: 168, price_source: 'fallback' },
  { symbol: 'TSLA', display_name: 'Tesla', asset_type: 'stock', current_price: 184, price_source: 'fallback' },
  { symbol: 'BTCUSDT', display_name: 'Bitcoin', asset_type: 'crypto', current_price: 67000, price_source: 'fallback' },
  { symbol: 'SPY', display_name: 'S&P 500 ETF', asset_type: 'etf', current_price: 520, price_source: 'fallback' },
];

const briefs = [
  {
    agent: 'macro',
    stance: 'Liquidity risk-on',
    thesis: 'Rates are steady and growth beta remains supported.',
    confidence: 0.73,
    evidence: ['Dollar soft', 'Credit spreads contained'],
    invalidation: 'Hot inflation print resets duration risk.',
    source_quality: 'fallback',
    allocation_guardrails: 'Keep benchmark exposure unless evidence improves.',
    generated_at: '2026-05-30T00:00:00Z',
  },
  {
    agent: 'research',
    stance: 'AI infrastructure demand',
    thesis: 'Cloud budgets still point toward GPU and memory demand.',
    confidence: 0.82,
    evidence: ['Capex cycle intact', 'Semis leadership broadening'],
    invalidation: 'Hyperscaler guidance rolls over.',
    source_quality: 'fallback',
    allocation_guardrails: 'Prefer diversified exposure across leaders.',
    generated_at: '2026-05-30T00:00:00Z',
  },
  {
    agent: 'risk',
    stance: 'Crowded long',
    thesis: 'Upside is real, but bad guidance can punish position size.',
    confidence: 0.61,
    evidence: ['High momentum concentration', 'Volatility can gap'],
    invalidation: 'Breadth improves with lower realized volatility.',
    source_quality: 'fallback',
    allocation_guardrails: 'Avoid single-name concentration above 40%.',
    generated_at: '2026-05-30T00:00:00Z',
  },
];

const baseSession = {
  session_id: 'paper-session-e2e',
  trading_date: '2026-05-30',
  status: 'open',
  paper_only: true,
  disclaimer: 'Paper trading simulation only. This is not financial advice.',
  starting_cash: 100000,
  benchmark_symbol: 'SPY',
  assets,
  briefs,
  allocation: null,
  result: null,
  generated_at: '2026-05-30T00:00:00Z',
};

const allocation = {
  id: 'paper-allocation-e2e',
  session_id: 'paper-session-e2e',
  anonymous_id: 'paper_e2e',
  allocations: {
    NVDA: 40,
    AMD: 20,
    TSLA: 10,
    BTCUSDT: 10,
    SPY: 20,
  },
  submitted_at: '2026-05-30T01:00:00Z',
};

const result = {
  id: 'paper-result-e2e',
  allocation_id: 'paper-allocation-e2e',
  session_id: 'paper-session-e2e',
  returns: {
    NVDA: 0.018,
    AMD: 0.012,
    TSLA: -0.004,
    BTCUSDT: 0.009,
    SPY: 0.006,
  },
  portfolio_return: 0.0119,
  benchmark_symbol: 'SPY',
  benchmark_return: 0.006,
  alpha: 0.0059,
  drawdown: 0.004,
  price_source: 'fallback',
  resolved_at: '2026-05-30T02:00:00Z',
};

test('paper desk supports anonymous allocation and resolve flow', async ({ page }) => {
  let currentSession = baseSession;

  await page.route('**/api/paper-desk/**', async route => {
    const request = route.request();
    const { pathname } = new URL(request.url());

    if (pathname.endsWith('/allocation')) {
      currentSession = { ...baseSession, status: 'allocated', allocation };
      await route.fulfill({ json: currentSession });
      return;
    }

    if (pathname.endsWith('/resolve')) {
      currentSession = { ...baseSession, status: 'resolved', allocation, result };
      await route.fulfill({ json: currentSession });
      return;
    }

    if (pathname.endsWith('/history')) {
      await route.fulfill({ json: { anonymous_id: 'paper_e2e', sessions: [currentSession] } });
      return;
    }

    await route.fulfill({ json: currentSession });
  });

  await page.goto('/paper');

  await expect(page.getByRole('heading', { name: 'One-person investment bank' })).toBeVisible();
  await expect(page.getByText('Paper-only research log. No orders.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Allocation' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Committee' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Journal' })).toBeVisible();
  await expect(page.getByText('fallback').first()).toBeVisible();

  const anonymousId = await page.evaluate(() => window.localStorage.getItem('stockwin_paper_anonymous_id'));
  expect(anonymousId).toMatch(/^paper_/);

  await page.getByLabel('NVDA allocation percent').fill('40');
  await page.getByLabel('AMD allocation percent').fill('20');
  await page.getByLabel('TSLA allocation percent').fill('10');
  await page.getByLabel('BTCUSDT allocation percent').fill('10');
  await page.getByLabel('SPY allocation percent').fill('20');

  await page.getByRole('button', { name: 'Submit' }).click();

  await expect(page.getByRole('button', { name: 'Submitted' })).toBeVisible();
  await expect(page.getByLabel('NVDA allocation percent')).toBeDisabled();
  await expect(page.getByText('Ready to score')).toBeVisible();

  await page.getByRole('button', { name: 'Resolve' }).click();

  await expect(page.getByText('+1.19%')).toBeVisible();
  await expect(page.getByText('+0.59%')).toBeVisible();
  await expect(page.getByText('-0.40%')).toBeVisible();
});
