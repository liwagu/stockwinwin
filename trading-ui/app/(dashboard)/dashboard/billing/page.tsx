import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BillingClient } from "./BillingClient";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

type UserProfile = {
  tier?: string;
  status?: string;
  email?: string;
  current_period_end?: string;
};

/**
 * Fetch user profile from backend API using Supabase access token
 */
const REQUEST_TIMEOUT_MS = 4000;

async function fetchUserProfile(accessToken: string): Promise<UserProfile | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${AI_SERVICE_URL}/v1/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(`Failed to fetch user profile: ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      console.warn("User profile request timed out, proceeding without profile data");
    } else {
      console.error("Error fetching user profile:", error);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Billing Page - Server Component with server-side data fetching
 *
 * This page fetches user profile server-side using Supabase auth,
 * then passes the data to the BillingClient component for rendering and interactivity.
 */
export default async function BillingPage() {
  // Step 1: Create Supabase client (reads from HTTP cookies)
  const supabase = await createClient();

  // Step 2: Verify user authentication
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect('/login');
  }

  // Step 3: Get access token for backend API calls
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    redirect('/login');
  }

  // Step 4: Fetch user profile from backend
  const profile = await fetchUserProfile(session.access_token);

  // Step 5: Pass data to Client Component for rendering
  return <BillingClient profile={profile} />;
}
