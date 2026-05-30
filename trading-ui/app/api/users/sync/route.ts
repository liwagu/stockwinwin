import { NextResponse } from "next/server";

/**
 * DEPRECATED: This endpoint previously allowed frontend to write directly to database.
 *
 * Security Issue: Frontend should NEVER write directly to database with anon key.
 * Users could bypass business logic and modify their tier/subscription.
 *
 * New Architecture:
 * - All user sync happens through backend API: POST /v1/users/sync
 * - Backend validates auth token and applies business logic
 * - Backend has service account with proper permissions
 *
 * This endpoint now returns 410 Gone to indicate it's deprecated.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "deprecated",
      message: "This endpoint has been deprecated for security reasons. User sync now happens through backend API."
    },
    { status: 410 }
  );
}
