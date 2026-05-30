import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") ? nextParam : "/dashboard";

  // Handle OAuth errors (e.g., user cancelled, access denied)
  if (error) {
    const errorParams = new URLSearchParams({
      error,
      ...(errorDescription && { error_description: errorDescription }),
    });
    return NextResponse.redirect(`${origin}/auth/auth-code-error#${errorParams.toString()}`);
  }

  // Handle missing authorization code
  if (!code) {
    const errorParams = new URLSearchParams({
      error: "missing_code",
      error_description: "No authorization code was provided",
    });
    return NextResponse.redirect(`${origin}/auth/auth-code-error#${errorParams.toString()}`);
  }

  // Exchange code for session
  const supabase = await createClient();
  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !data.session) {
    const errorParams = new URLSearchParams({
      error: "exchange_failed",
      error_description: exchangeError?.message || "Failed to exchange authorization code for session",
    });
    return NextResponse.redirect(`${origin}/auth/auth-code-error#${errorParams.toString()}`);
  }

  // Sync user profile through backend API (secure, with business logic)
  try {
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

    const syncResponse = await fetch(`${AI_SERVICE_URL}/v1/users/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${data.session.access_token}`,
      },
    });

    if (syncResponse.ok) {
      await syncResponse.json();
      console.log("✅ Successfully synced OAuth user via backend");
    } else {
      console.error("Failed to sync user via backend:", syncResponse.status);
      // Continue anyway - user is authenticated, backend /me endpoint will auto-create
    }
  } catch (syncError) {
    console.error("Failed to sync user profile:", syncError);
    // Continue anyway - user is authenticated, backend /me endpoint will auto-create
  }

  return NextResponse.redirect(`${origin}${next}`);
}
