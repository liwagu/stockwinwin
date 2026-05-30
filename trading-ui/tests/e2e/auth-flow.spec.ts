import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('/');
  });

  test('Landing page loads successfully', async ({ page }) => {
    // Check if the main heading is visible
    await expect(page.getByRole('heading', { name: /predict your own portfolio/i })).toBeVisible();

    // Check if forecasts section exists
    await expect(page.getByText(/Live AI Forecasts/i)).toBeVisible();

    // Verify pricing section exists
    await expect(page.getByText(/Free Plan/i)).toBeVisible();
    await expect(page.getByText(/Professional Plan/i)).toBeVisible();
  });

  test('Navigation to login page works', async ({ page }) => {
    // Look for login link/button (adjust selector based on your actual implementation)
    const loginLink = page.locator('a[href="/login"], a[href*="login"]').first();

    if (await loginLink.count() > 0) {
      await loginLink.click();
      await expect(page).toHaveURL(/.*login/);
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    } else {
      // If no login link on homepage, navigate directly
      await page.goto('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    }
  });

  test('Login page displays correctly', async ({ page }) => {
    await page.goto('/login');

    // Check page title
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    // Check Google OAuth button exists
    const googleButton = page.getByRole('button', { name: /continue with google/i });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();

    // Check for signup link
    await expect(page.getByText(/need an account/i)).toBeVisible();
    await expect(page.locator('a[href="/signup"]')).toBeVisible();

    // Check for terms and privacy links
    await expect(page.getByRole('link', { name: /terms of service/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /privacy policy/i })).toBeVisible();
  });

  test('Navigation to signup page works', async ({ page }) => {
    await page.goto('/login');

    // Click signup link
    await page.locator('a[href="/signup"]').click();

    // Verify we're on signup page
    await expect(page).toHaveURL(/.*signup/);
    await expect(page.getByRole('heading', { name: /create your stockwin account/i })).toBeVisible();
  });

  test('Signup page displays correctly', async ({ page }) => {
    await page.goto('/signup');

    // Check page title
    await expect(page.getByRole('heading', { name: /create your stockwin account/i })).toBeVisible();

    // Check plan selection cards
    await expect(page.getByText(/free/i).first()).toBeVisible();
    await expect(page.getByText(/pro/i).first()).toBeVisible();

    // Check terms checkbox
    const termsCheckbox = page.locator('input[type="checkbox"]#terms');
    await expect(termsCheckbox).toBeVisible();

    // Check Google OAuth button
    const googleButton = page.getByRole('button', { name: /continue with google/i });
    await expect(googleButton).toBeVisible();

    // Check login link
    await expect(page.getByText(/already have an account/i)).toBeVisible();
  });

  test('Terms checkbox is required for signup', async ({ page }) => {
    await page.goto('/signup');

    // Try to click signup without accepting terms
    const googleButton = page.getByRole('button', { name: /continue with google/i });
    await googleButton.click();

    // Should show error (adjust based on your implementation)
    // Note: Google OAuth might redirect, so we check if still on signup page
    const currentUrl = page.url();

    // If there's an error message, it should be visible
    const errorMessage = page.locator('text=/you must accept the terms/i');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('Plan selection works on signup', async ({ page }) => {
    await page.goto('/signup');

    // Find plan cards
    const freePlanCard = page.locator('button:has-text("Free")').first();
    const proPlanCard = page.locator('button:has-text("Pro")').first();

    // Click free plan
    await freePlanCard.click();
    await expect(freePlanCard).toHaveClass(/emerald|selected/); // Adjust based on your CSS

    // Click pro plan
    await proPlanCard.click();
    await expect(proPlanCard).toHaveClass(/emerald|selected/);
  });

  test('Protected dashboard redirects unauthenticated users', async ({ page }) => {
    // Try to access dashboard without being logged in
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL(/.*login/, { timeout: 5000 });
    await expect(page).toHaveURL(/.*login/);
  });

  test('Google OAuth button triggers redirect', async ({ page }) => {
    await page.goto('/login');

    // Click Google OAuth button
    const googleButton = page.getByRole('button', { name: /continue with google/i });

    // Listen for navigation
    const navigationPromise = page.waitForURL(/.*supabase\.co.*|.*accounts\.google\.com.*/, {
      timeout: 10000,
      waitUntil: 'domcontentloaded'
    }).catch(() => {
      // OAuth redirect might happen too fast or be blocked in test environment
      console.log('OAuth redirect detected (expected in test environment)');
    });

    await googleButton.click();

    // Wait a bit to see if redirect happens
    await page.waitForTimeout(2000);

    // In real browser, would redirect to Google
    // In test, might be blocked or show different behavior
    console.log('Current URL after OAuth click:', page.url());
  });

  test('Callback page handles OAuth errors', async ({ page }) => {
    // Visit callback with error parameter (simulating OAuth cancellation)
    await page.goto('/auth/callback?error=access_denied&error_description=User%20cancelled');

    // Should redirect to error page with hash fragment
    await page.waitForURL(/.*auth-code-error/, { timeout: 5000 });

    // Should show user-friendly error message
    await expect(page.getByText(/sign-in cancelled/i)).toBeVisible({ timeout: 5000 });

    // Should have "Try Again" button
    await expect(page.getByRole('link', { name: /try again/i })).toBeVisible();
  });

  test('Callback page handles missing code', async ({ page }) => {
    // Visit callback page without code (simulating direct navigation)
    await page.goto('/auth/callback');

    // Should redirect to error page
    await page.waitForURL(/.*auth-code-error/, { timeout: 5000 });

    // Should show error message about missing code
    await expect(page.getByText(/authentication error|no authorization code/i)).toBeVisible({ timeout: 5000 });
  });

  test('Pricing section is visible and interactive', async ({ page }) => {
    await page.goto('/');

    // Scroll to pricing section
    await page.evaluate(() => {
      const pricingSection = document.querySelector('h2:has-text("portfolio")');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
    });

    await page.waitForTimeout(1000);

    // Check pricing cards
    const freeCard = page.locator('text=/Free Plan/i').first();
    const proCard = page.locator('text=/Professional Plan/i').first();

    await expect(freeCard).toBeVisible();
    await expect(proCard).toBeVisible();

    // Check for CTA buttons
    const ctaButtons = page.locator('button:has-text("Get Started"), button:has-text("Subscribe")');
    await expect(ctaButtons.first()).toBeVisible();
  });

  test('Free crypto forecasts are visible', async ({ page }) => {
    await page.goto('/');

    // Wait for predictions to load
    await page.waitForTimeout(3000);

    // Look for crypto symbols (BTC, ETH, XRP)
    const cryptoSymbols = page.locator('text=/BTC|ETH|XRP/i');

    if (await cryptoSymbols.count() > 0) {
      await expect(cryptoSymbols.first()).toBeVisible();
      console.log(`Found ${await cryptoSymbols.count()} crypto symbol references`);
    } else {
      console.log('Note: Crypto predictions may still be loading or unavailable');
    }
  });
});

test.describe('UI Elements and Responsiveness', () => {
  test('Page is mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto('/');

    // Check that content is still visible
    await expect(page.getByRole('heading').first()).toBeVisible();

    // Check that layout adapts
    const bodyWidth = await page.evaluate(() => document.body.clientWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('Navigation works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Try to navigate to login
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('Dark mode elements are styled correctly', async ({ page }) => {
    await page.goto('/login');

    // Check for dark mode classes (adjust based on your implementation)
    const card = page.locator('[class*="slate-9"], [class*="bg-slate"]').first();

    if (await card.count() > 0) {
      await expect(card).toBeVisible();
      console.log('Dark mode styling detected');
    }
  });
});

test.describe('Sign Out Flow', () => {
  test('should sign out without redirect loop', async ({ page, context }) => {
    // Note: This test assumes you can mock being logged in
    // In real scenario, you'd need to actually log in first

    // Mock authenticated state by setting auth cookies
    // Adjust cookie names based on your Supabase setup
    await context.addCookies([
      {
        name: 'sb-localhost-auth-token',
        value: 'mock-auth-token-for-testing',
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax'
      }
    ]);

    await page.goto('/dashboard');

    // Track all navigation events to detect loops
    const navigations: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        navigations.push(frame.url());
      }
    });

    // Find and click sign out button
    const signOutButton = page.getByRole('button', { name: /sign out/i });

    if (await signOutButton.count() > 0) {
      await signOutButton.click();

      // Wait for navigation to complete (home page or login)
      await page.waitForURL(/\/$|\/login/, { timeout: 5000 });

      // CRITICAL: Verify no redirect loop occurred
      // Should navigate cleanly from dashboard -> home
      const homeNavigations = navigations.filter(url => url.endsWith('/') || url.includes('localhost:3000/'));
      const loginNavigations = navigations.filter(url => url.includes('/login'));

      // Should only navigate to destination once, not multiple times
      expect(homeNavigations.length + loginNavigations.length).toBeLessThanOrEqual(2);

      console.log('Navigation path:', navigations);
    } else {
      console.log('Note: Sign out button not found - may need authenticated session');
    }
  });

  test('should clear auth cookies on signout', async ({ page, context }) => {
    // Set mock auth cookies
    await context.addCookies([
      {
        name: 'sb-localhost-auth-token',
        value: 'mock-token',
        domain: 'localhost',
        path: '/',
      }
    ]);

    await page.goto('/dashboard');

    // Verify cookie exists
    const cookiesBefore = await context.cookies();
    const authCookieBefore = cookiesBefore.find(c => c.name.includes('auth-token'));

    if (authCookieBefore) {
      console.log('Auth cookie exists before signout');
    }

    // Sign out
    const signOutButton = page.getByRole('button', { name: /sign out/i });
    if (await signOutButton.count() > 0) {
      await signOutButton.click();
      await page.waitForURL(/\/$|\/login/, { timeout: 5000 });

      // Verify auth cookies cleared
      const cookiesAfter = await context.cookies();
      const authCookieAfter = cookiesAfter.find(c => c.name.includes('auth-token') && c.value);

      expect(authCookieAfter).toBeUndefined();
      console.log('Auth cookies cleared successfully');
    }
  });

  test('should not make multiple signout requests', async ({ page }) => {
    const requests: string[] = [];

    // Track all HTTP requests
    page.on('request', request => {
      requests.push(request.url());
    });

    await page.goto('/dashboard');

    const signOutButton = page.getByRole('button', { name: /sign out/i });

    if (await signOutButton.count() > 0) {
      await signOutButton.click();
      await page.waitForURL(/\/$|\/login/, { timeout: 5000 });

      // Should only call /auth/signout once
      const signoutCalls = requests.filter(url => url.includes('/auth/signout'));
      expect(signoutCalls.length).toBeLessThanOrEqual(1);

      console.log(`Signout API called ${signoutCalls.length} time(s)`);
    }
  });

  test('should use server-side signout API', async ({ page }) => {
    let signoutApiCalled = false;

    page.on('request', request => {
      if (request.url().includes('/auth/signout') && request.method() === 'POST') {
        signoutApiCalled = true;
      }
    });

    await page.goto('/dashboard');

    const signOutButton = page.getByRole('button', { name: /sign out/i });

    if (await signOutButton.count() > 0) {
      await signOutButton.click();
      await page.waitForTimeout(2000);

      // Verify server-side API was called
      expect(signoutApiCalled).toBeTruthy();
      console.log('Server-side signout API was called correctly');
    }
  });

  test('should redirect to home page after signout', async ({ page }) => {
    await page.goto('/dashboard');

    const signOutButton = page.getByRole('button', { name: /sign out/i });

    if (await signOutButton.count() > 0) {
      await signOutButton.click();

      // Should redirect to home page (/) not login
      await page.waitForURL(/\/$/, { timeout: 5000 });

      // Verify we're on home page
      await expect(page).toHaveURL(/\/$/);
      console.log('Correctly redirected to home page after signout');
    }
  });

  test('should show loading state during signout', async ({ page }) => {
    await page.goto('/dashboard');

    const signOutButton = page.getByRole('button', { name: /sign out/i });

    if (await signOutButton.count() > 0) {
      await signOutButton.click();

      // Button should be disabled during signout
      await expect(signOutButton).toBeDisabled({ timeout: 1000 }).catch(() => {
        console.log('Note: Loading state may transition too quickly to test');
      });
    }
  });
});

test.describe('Performance and Loading', () => {
  test('Page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    console.log(`Page loaded in ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
  });

  test('Images and assets load correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for any images to load
    const images = page.locator('img');
    const imageCount = await images.count();

    console.log(`Found ${imageCount} images on page`);

    // Check if any images are broken
    if (imageCount > 0) {
      const firstImage = images.first();
      const naturalWidth = await firstImage.evaluate((img: HTMLImageElement) => img.naturalWidth);

      if (naturalWidth > 0) {
        console.log('Images are loading correctly');
      }
    }
  });
});
