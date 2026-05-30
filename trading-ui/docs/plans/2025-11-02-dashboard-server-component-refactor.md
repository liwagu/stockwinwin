# Dashboard Server Component Refactor

**Date:** 2025-11-02
**Status:** Implementation
**Type:** Architecture Refactor

## Problem Statement

The dashboard page uses a Client Component that fetches user profile data via `/api/users/me`, which creates an unstable authentication flow:

1. Client Component → fetch("/api/users/me") → Next.js API Route → FastAPI Backend
2. Cookies are not reliably passed from Client → Next.js API Route
3. Results in 401 Unauthorized errors despite valid authentication
4. Users with `tier='professional'` in database see "FREE" tier in UI

## Root Cause

The architecture violates Supabase SSR best practices:
- ❌ Client Component using fetch() for authenticated data
- ❌ Extra API Route layer for authentication proxy
- ❌ Cookie passing issues between Client and Server
- ❌ Not following official Supabase Server Component pattern

## Solution: Server Component Pattern

Adopt the official Supabase SSR pattern: Server Component data fetching + Client Component interactivity.

### Architecture

```
┌─────────────────────────────────────────┐
│ app/(dashboard)/dashboard/page.tsx      │
│ [Server Component - async]              │
│                                          │
│ - await createClient()                  │
│ - await supabase.auth.getUser()        │
│ - await fetchUserProfile(token)        │
│ - await fetchPredictions()             │
│ - Pass data as props                   │
└────────────┬────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────┐
│ app/(dashboard)/dashboard/              │
│   DashboardClient.tsx                   │
│ [Client Component - "use client"]      │
│                                          │
│ Props: { user, profile, predictions }  │
│ - State management                      │
│ - User interactions                     │
│ - Animations & effects                  │
└─────────────────────────────────────────┘
```

### Token Extraction Flow

```typescript
// Server Component
const supabase = await createClient()  // ← Reads from HTTP cookies
const { data: { user } } = await supabase.auth.getUser()  // ← Validates token
const { data: { session } } = await supabase.auth.getSession()  // ← Extracts token

// Use token to call backend
const profile = await fetch(`${AI_SERVICE_URL}/v1/users/me`, {
  headers: { Authorization: `Bearer ${session.access_token}` }
})
```

**Key Points:**
- Middleware already refreshes tokens via `getUser()`
- Server Component reliably reads cookies from HTTP request
- No cookie passing issues between Client/Server
- Token never exposed to browser JavaScript

## Implementation Plan

### Step 1: Create DashboardClient Component

**File:** `app/(dashboard)/dashboard/DashboardClient.tsx`

**Content:**
- Extract all Client-side logic from page.tsx
- Move: useState, useEffect, useRouter, useSubscriptionStatus
- Accept data via props: `{ user, profile, predictions, searchParams }`
- Keep all UI components: BlurOverlay, CelebrationOverlay, etc.
- Preserve tier determination and asset count logic

**Commit:** `feat(dashboard): extract DashboardClient component for Server/Client split`

### Step 2: Convert page.tsx to Server Component

**File:** `app/(dashboard)/dashboard/page.tsx`

**Changes:**
1. Remove `"use client"` directive
2. Change to `async function DashboardPage({ searchParams })`
3. Add Server-side data fetching:
   - Create Supabase client
   - Get user and session
   - Fetch profile from backend
   - Fetch predictions from backend
4. Return `<DashboardClient />` with data props

**Commit:** `refactor(dashboard): convert page to Server Component with direct data fetching`

### Step 3: Remove API Route

**File:** `app/api/users/me/route.ts`

**Action:** Delete file (no longer needed)

**Commit:** `refactor(api): remove /api/users/me route (now using Server Component pattern)`

### Step 4: Test and Verify

**Manual Testing:**
- [ ] Free user sees "FREE" badge and 3+3 unblurred charts
- [ ] Pro user sees "PROFESSIONAL" badge and all 20 unblurred charts
- [ ] No `/api/users/me` calls in Network tab
- [ ] Upgrade flow with celebration overlay works
- [ ] Asset count displays correctly ("3 / 10 assets")
- [ ] Server-side rendering: view page source shows user data

## Benefits

✅ **Reliability:** Eliminates cookie passing issues permanently
✅ **Performance:** Server-side data fetching = faster initial load
✅ **Simplicity:** Removes unnecessary API route layer
✅ **Maintainability:** Follows official Supabase SSR patterns
✅ **Security:** Token handling stays server-side

## Trade-offs

⚠️ **One-time refactor cost:** Need to split 444-line component
✅ **Acceptable:** Clean separation of concerns improves long-term maintainability

⚠️ **No automatic data refresh:** Server Component data fetched once per page load
✅ **Acceptable:** Current useSubscriptionStatus polling handles post-upgrade refresh

## References

- [Supabase Next.js SSR Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Official Next.js User Management Example](https://github.com/supabase/supabase/tree/master/examples/user-management/nextjs-user-management)
- Commit: `46da294` - Previous security fix removing frontend DB access
- Commit: `bdb0e83` - getUser() vs getSession() fix

## Success Metrics

- ✅ Zero 401 errors on dashboard load
- ✅ Professional tier users see correct badge immediately
- ✅ No client-side `/api/users/me` requests
- ✅ Page source contains user data (SSR working)
