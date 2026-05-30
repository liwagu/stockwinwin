import { test, expect } from '@playwright/test';

test.describe('Landing CTA funnel', () => {
  test('hero CTA navigates to signup', async ({ page }) => {
    await page.goto('/');

    const primaryCta = page.getByRole('button', { name: /get started free/i });
    await expect(primaryCta).toBeVisible();
    await primaryCta.click();

    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByText(/create your account/i)).toBeVisible();
  });

  test('secondary CTA scrolls to pricing section', async ({ page }) => {
    await page.goto('/');

    const secondaryCta = page.getByRole('link', { name: /see plans|explore pricing/i });
    await expect(secondaryCta).toBeVisible();
    await secondaryCta.click();

    await expect(page).toHaveURL(/#pricing$/);
    const pricingSection = page.locator('#pricing');
    await expect(pricingSection).toBeVisible();

    // Ensure the section actually scrolled into view
    const isNearViewport = await pricingSection.evaluate((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    });
    expect(isNearViewport).toBeTruthy();
  });
});
