import { NextRequest, NextResponse } from "next/server";
import { isPaperDeskMockMode, submitMockAllocation } from "@/lib/paperDeskMock";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (isPaperDeskMockMode()) {
      const result = submitMockAllocation(body);
      return NextResponse.json(result.body, { status: result.status });
    }

    const response = await fetch(`${AI_SERVICE_URL}/v1/paper-desk/allocation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error submitting Paper Desk allocation:", error);
    return NextResponse.json(
      { detail: "Unable to submit Paper Desk allocation." },
      { status: 503 }
    );
  }
}
