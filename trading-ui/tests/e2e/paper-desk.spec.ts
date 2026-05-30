import { expect, test } from '@playwright/test';

test('paper desk supports anonymous allocation and resolve flow', async ({ page }) => {
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

  await expect(page.getByText('+1.13%')).toBeVisible();
  await expect(page.getByText('+0.53%')).toBeVisible();
  await expect(page.getByText('0.00%')).toBeVisible();
});
