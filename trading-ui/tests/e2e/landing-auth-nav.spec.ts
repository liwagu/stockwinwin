import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

function readPublicSupabaseUrl() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  for (const envFile of ['.env.local', '.env', '.env.production']) {
    const envPath = path.join(process.cwd(), envFile);
    if (!fs.existsSync(envPath)) continue;

    const match = fs
      .readFileSync(envPath, 'utf8')
      .match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);

    if (match?.[1]) {
      return match[1].trim().replace(/^['"]|['"]$/g, '');
    }
  }

  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required to seed Supabase auth state');
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function createTestJwt(expiresAt: number, userId: string) {
  const header = encodeBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = encodeBase64Url(JSON.stringify({
    aud: 'authenticated',
    exp: expiresAt,
    role: 'authenticated',
    sub: userId,
  }));

  return `${header}.${payload}.signature`;
}

async function seedAuthenticatedSupabaseSession(page: Page) {
  const supabaseUrl = readPublicSupabaseUrl();
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 60 * 60;
  const userId = '11111111-1111-4111-8111-111111111111';
  const timestamp = new Date(now * 1000).toISOString();

  const session = {
    access_token: createTestJwt(expiresAt, userId),
    expires_at: expiresAt,
    expires_in: 60 * 60,
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    user: {
      app_metadata: {
        provider: 'email',
        providers: ['email'],
      },
      aud: 'authenticated',
      confirmed_at: timestamp,
      email: 'landing-nav-test@example.com',
      email_confirmed_at: timestamp,
      id: userId,
      identities: [],
      last_sign_in_at: timestamp,
      phone: '',
      role: 'authenticated',
      user_metadata: {},
    },
  };

  const cookieValue = `base64-${encodeBase64Url(JSON.stringify(session))}`;

  await page.addInitScript(
    ({ name, value }) => {
      document.cookie = `${name}=${value}; path=/; max-age=3600; SameSite=Lax`;
    },
    { name: cookieName, value: cookieValue }
  );
}

test.describe('Landing authenticated navigation', () => {
  test('shows Dashboard instead of Sign in when a Supabase session exists', async ({ page }) => {
    await seedAuthenticatedSupabaseSession(page);

    await page.route('**/api/predictions', async route => {
      await route.fulfill({
        contentType: 'application/json',
        status: 200,
        body: JSON.stringify({
          generated_at: new Date().toISOString(),
          predictions: [],
        }),
      });
    });

    await page.goto('/');

    const primaryNav = page.getByRole('navigation', { name: 'Primary' });
    const dashboardLink = primaryNav.getByRole('link', { name: 'Dashboard' });

    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    await expect(primaryNav.getByRole('link', { name: 'Sign in' })).toHaveCount(0);
  });
});
