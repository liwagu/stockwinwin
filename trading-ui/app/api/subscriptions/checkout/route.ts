import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export async function POST() {
  try {
    const supabase = await createClient();

    // IMPORTANT: Use getUser() not getSession() in server-side code
    // getUser() validates the JWT with Supabase, getSession() only reads from cookies
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get fresh session for access token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.log("[CHECKOUT] Authentication failed - no session");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Call AI service to create checkout session
    const response = await fetch(
      `${AI_SERVICE_URL}/v1/subscriptions/checkout-session`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      }
    );

    console.log("[CHECKOUT] AI service response:", {
      status: response.status,
      ok: response.ok
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log("[CHECKOUT] AI service error:", errorData);
      return NextResponse.json(
        { error: errorData.detail || "Failed to create checkout session" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
