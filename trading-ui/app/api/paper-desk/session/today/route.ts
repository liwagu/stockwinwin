import { NextRequest, NextResponse } from "next/server";
import { getMockTodaySession, isPaperDeskMockMode } from "@/lib/paperDeskMock";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  const anonymousId = request.nextUrl.searchParams.get("anonymous_id");
  if (!anonymousId) {
    return NextResponse.json({ detail: "anonymous_id is required" }, { status: 400 });
  }

  if (isPaperDeskMockMode()) {
    return NextResponse.json(getMockTodaySession(anonymousId));
  }

  try {
    const response = await fetch(
      `${AI_SERVICE_URL}/v1/paper-desk/session/today?${new URLSearchParams({ anonymous_id: anonymousId })}`,
      { cache: "no-store" }
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error fetching Paper Desk session:", error);
    return NextResponse.json(
      { detail: "Unable to connect to Paper Desk service." },
      { status: 503 }
    );
  }
}
