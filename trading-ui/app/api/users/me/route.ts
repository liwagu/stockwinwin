import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export async function GET() {
  const supabase = await createClient();

  // Use getUser() for server-side auth validation
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  // Get session for access token
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  try {
    const response = await fetch(`${AI_SERVICE_URL}/v1/users/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });

    const body = await response.json().catch(() => ({}));

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error("Failed to fetch user profile", error);
    return NextResponse.json(
      {
        error: "profile_unavailable",
        message: "Unable to reach StockWin API. Please try again.",
      },
      { status: 502 }
    );
  }
}
