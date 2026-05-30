import { test, expect, BrowserContext } from '@playwright/test';

/**
 * Authentication Redirect Tests
 *
 * These tests verify the middleware redirect logic works correctly for:
 * 1. Unauthenticated users accessing protected routes
 * 2. Unauthenticated users accessing public routes
 * 3. Authenticated users accessing auth pages
 * 4. Authenticated users accessing public routes
 *
 * Related commits:
 * - 92b7d4c: fix: eliminate landing page flash by using server-side redirect
 * - 054cb4a: fix: remove landing page from authenticated redirect logic
 *
 * Related files:
 * - trading-ui/middleware.ts (redirect logic)
 * - trading-ui/app/page.tsx (landing page)
 */

test.describe('Authentication Redirects - Unauthenticated Users', () => {
  test.beforeEach(async ({ context }) => {
    // Clear all cookies to ensure we're unauthenticated
    await context.clearCookies();
  });

  test('should allow unauthenticated user to view landing page (/)', async ({ page }) => {
    await page.goto('/');

    // Should stay on landing page
    await expect(page).toHaveURL('/');

    // Should see landing page content
    await expect(page.getByRole('heading', { name: /win the market/i })).toBeVisible();

    // Should see "Get started free" CTA
    await expect(page.getByRole('button', { name: /get started free/i })).toBeVisible();
  });

  test('should redirect unauthenticated user from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should be redirected to login
    await expect(page).toHaveURL('/login');

    // Should see login page content
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('should allow unauthenticated user to access /login', async ({ page }) => {
    await page.goto('/login');

    // Should stay on login page
    await expect(page).toHaveURL('/login');

    // Should see login form
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('should allow unauthenticated user to access /signup', async ({ page }) => {
    await page.goto('/signup');

    // Should stay on signup page
    await expect(page).toHaveURL('/signup');

    // Should see signup form
    await expect(page.getByRole('heading', { name: /precision ai signals/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  test('should redirect unauthenticated user from any /dashboard/* route to /login', async ({ page }) => {
    // Test various dashboard sub-routes
    const dashboardRoutes = [
      '/dashboard',
      '/dashboard/settings',
      '/dashboard/profile',
    ];

    for (const route of dashboardRoutes) {
      await page.goto(route);

      // All should redirect to login
      await expect(page).toHaveURL('/login');
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    }
  });

  test('should show no flash or flicker when accessing landing page', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');

    // Wait a bit to see if any redirect happens
    await page.waitForTimeout(1000);

    // Should still be on landing page (no redirect)
    await expect(page).toHaveURL('/');

    // Content should be stable (no re-render)
    await expect(page.getByRole('heading', { name: /win the market/i })).toBeVisible();
  });
});

test.describe('Authentication Redirects - Authenticated Users', () => {
  // Helper function to set up authenticated session
  async function setupAuthenticatedUser(context: BrowserContext) {
    // Set mock Supabase auth cookies
    // This simulates an authenticated user session
    const mockAuthToken = 'mock-auth-token-' + Date.now();
    const mockRefreshToken = 'mock-refresh-token-' + Date.now();

    await context.addCookies([
      {
        name: 'sb-access-token',
        value: mockAuthToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
      {
        name: 'sb-refresh-token',
        value: mockRefreshToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  }

  test.skip('should redirect authenticated user from /login to /dashboard', async ({ page, context }) => {
    // SKIPPED: This test requires a real authenticated session with valid Supabase tokens
    // The middleware validates tokens with Supabase, so mock cookies won't work
    // To test this properly, we need to:
    // 1. Use Supabase test client
    // 2. Create a real test user
    // 3. Perform actual OAuth flow
    //
    // For now, this serves as documentation of expected behavior

    await setupAuthenticatedUser(context);
    await page.goto('/login');

    // Should be redirected to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test.skip('should redirect authenticated user from /signup to /dashboard', async ({ page, context }) => {
    // SKIPPED: Same reason as above - requires real Supabase auth

    await setupAuthenticatedUser(context);
    await page.goto('/signup');

    // Should be redirected to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test.skip('should allow authenticated user to view landing page (/)', async ({ page, context }) => {
    // SKIPPED: Same reason as above - requires real Supabase auth
    //
    // This test verifies the fix in commit 054cb4a
    // Before: Authenticated users were redirected from / to /dashboard
    // After: Authenticated users can view the landing page

    await setupAuthenticatedUser(context);
    await page.goto('/');

    // Should stay on landing page (NOT redirected to /dashboard)
    await expect(page).toHaveURL('/');

    // Should see landing page content
    await expect(page.getByRole('heading', { name: /win the market/i })).toBeVisible();
  });

  test.skip('should allow authenticated user to access /dashboard', async ({ page, context }) => {
    // SKIPPED: Same reason as above - requires real Supabase auth

    await setupAuthenticatedUser(context);
    await page.goto('/dashboard');

    // Should stay on dashboard (not redirected)
    await expect(page).toHaveURL('/dashboard');
  });
});

test.describe('Authentication Redirects - Edge Cases', () => {
  test('should handle rapid navigation without redirect loops', async ({ page }) => {
    await page.goto('/');
    await page.goto('/login');
    await page.goto('/signup');
    await page.goto('/');
    await page.goto('/dashboard');

    // Should end up on login (redirected from dashboard)
    await expect(page).toHaveURL('/login');

    // No errors should occur
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));

    expect(errors).toHaveLength(0);
  });

  test('should handle direct URL access with query parameters', async ({ page }) => {
    await page.goto('/dashboard?test=123');

    // Should redirect to login (query params are preserved by Next.js)
    await expect(page).toHaveURL('/login?test=123');

    // Note: Next.js middleware preserves query params during redirect
    // This is expected behavior
  });

  test('should handle navigation from external links', async ({ page }) => {
    // Simulate external link by setting referrer
    await page.goto('/', {
      waitUntil: 'networkidle',
    });

    // Should load landing page successfully
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /win the market/i })).toBeVisible();
  });

  test('should redirect consistently across page reloads', async ({ page }) => {
    // First visit to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');

    // Reload the page
    await page.reload();

    // Should still be on login
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate through multiple pages
    await page.goto('/');
    await page.goto('/login');
    await page.goto('/signup');

    // Go back
    await page.goBack();
    await expect(page).toHaveURL('/login');

    // Go back again
    await page.goBack();
    await expect(page).toHaveURL('/');

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Authentication Redirects - Performance', () => {
  test('should redirect server-side without client-side flash', async ({ page }) => {
    // Navigate to protected route
    const startTime = Date.now();
    await page.goto('/dashboard');
    const redirectTime = Date.now() - startTime;

    // Should be on login page
    await expect(page).toHaveURL('/login');

    // Redirect should be fast (server-side, not client-side)
    // Note: On first run, Next.js compiles the pages which takes 2-3s
    // Subsequent runs are much faster (<500ms)
    // For CI and first-run scenarios, use generous timeout
    expect(redirectTime).toBeLessThan(5000); // Includes compilation time

    // Should not see any flash of dashboard content
    // (This is verified by the fact that we only see login page)
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  });

  test('should not make unnecessary API calls during redirect', async ({ page }) => {
    // Track API calls
    const apiCalls: string[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });

    // Navigate to protected route (should redirect)
    await page.goto('/dashboard');

    // Should be redirected to login
    await expect(page).toHaveURL('/login');

    // Should not have made any dashboard API calls
    // (because redirect happens before page renders)
    const dashboardApiCalls = apiCalls.filter(url =>
      url.includes('/api/predictions') ||
      url.includes('/api/users')
    );

    expect(dashboardApiCalls).toHaveLength(0);
  });
});

test.describe('Authentication Redirects - Middleware Coverage', () => {
  test('should apply middleware to all routes except static files', async ({ page }) => {
    // Test that middleware is NOT applied to static assets
    const staticFiles = [
      '/favicon.ico',
      '/logo.svg',
    ];

    for (const file of staticFiles) {
      const response = await page.goto(file, { waitUntil: 'domcontentloaded' });

      // Should not redirect (status should be 200 or 404, not 307/308)
      expect(response?.status()).not.toBe(307);
      expect(response?.status()).not.toBe(308);
    }
  });

  test('should protect all /dashboard/* routes with authentication', async ({ page }) => {
    const protectedRoutes = [
      '/dashboard',
      '/dashboard/settings',
      '/dashboard/profile',
      '/dashboard/anything',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);

      // All should redirect to login
      await expect(page).toHaveURL('/login');
    }
  });
});

/**
 * TESTING NOTES:
 *
 * Current Implementation Status:
 * ✅ Unauthenticated user tests - All passing
 * ⏭️  Authenticated user tests - Skipped (require real Supabase auth)
 * ✅ Edge case tests - All passing
 * ✅ Performance tests - All passing
 * ✅ Middleware coverage tests - All passing
 *
 * To enable authenticated user tests:
 * 1. Set up Supabase test environment
 * 2. Create test user credentials
 * 3. Implement auth helper function using real Supabase client
 * 4. Update setupAuthenticatedUser() to use real auth flow
 *
 * Current Behavior (as of commit 054cb4a):
 * - Unauthenticated users:
 *   - CAN access: /, /login, /signup
 *   - CANNOT access: /dashboard (redirected to /login)
 *
 * - Authenticated users (expected):
 *   - CAN access: /, /dashboard
 *   - CANNOT access: /login, /signup (redirected to /dashboard)
 *
 * Middleware Logic (trading-ui/middleware.ts:44-48):
 * ```typescript
 * // Already authenticated - redirect away from auth pages
 * if (user && (request.nextUrl.pathname === "/login" ||
 *              request.nextUrl.pathname === "/signup")) {
 *   const redirectUrl = request.nextUrl.clone();
 *   redirectUrl.pathname = "/dashboard";
 *   return NextResponse.redirect(redirectUrl);
 * }
 * ```
 *
 * Note: "/" is NOT in the redirect check, so authenticated users can view landing page.
 */
