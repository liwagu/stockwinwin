import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Debug endpoint to check session state
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Use getUser() for proper server-side validation
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    return NextResponse.json({
      // User from getUser() (validated)
      hasUser: !!user,
      userError: userError?.message,
      userId: user?.id,
      userEmail: user?.email,

      // Session from getSession() (local only)
      hasSession: !!session,
      sessionError: sessionError?.message,
      expiresAt: session?.expires_at,
      tokenPresent: !!session?.access_token,

      // Diagnosis
      diagnosis: !user && !session
        ? "No auth - please sign in"
        : !user && session
        ? "Session exists but invalid - cookies may be corrupted"
        : user && !session
        ? "User valid but no session - unexpected state"
        : "All good",
    });
  } catch (error) {
    return NextResponse.json({
      error: "Failed to check session",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
