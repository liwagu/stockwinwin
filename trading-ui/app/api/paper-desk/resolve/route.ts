import { NextRequest, NextResponse } from "next/server";
import { isPaperDeskMockMode, resolveMockSession } from "@/lib/paperDeskMock";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (isPaperDeskMockMode()) {
      const result = resolveMockSession(body);
      return NextResponse.json(result.body, { status: result.status });
    }

    const response = await fetch(`${AI_SERVICE_URL}/v1/paper-desk/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error resolving Paper Desk session:", error);
    return NextResponse.json(
      { detail: "Unable to resolve Paper Desk session." },
      { status: 503 }
    );
  }
}
