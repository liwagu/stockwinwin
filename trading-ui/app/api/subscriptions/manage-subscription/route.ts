import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

/**
 * POST /api/subscriptions/manage-subscription
 *
 * Creates a Stripe Customer Portal session for subscription management.
 * Allows users to update payment method, view invoices, and cancel subscription.
 */
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
      console.log("[MANAGE_SUBSCRIPTION] Authentication failed - no session");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Call backend to create portal session
    const response = await fetch(`${AI_SERVICE_URL}/v1/subscriptions/portal-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    console.log("[MANAGE_SUBSCRIPTION] Backend response:", {
      status: response.status,
      ok: response.ok
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log("[MANAGE_SUBSCRIPTION] Backend error:", errorData);
      return NextResponse.json(
        { error: errorData.detail || "Failed to create portal session" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      url: data.url,
      message: "Redirect to Stripe Customer Portal",
    });

  } catch (error) {
    console.error("[MANAGE_SUBSCRIPTION] Error creating portal session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
