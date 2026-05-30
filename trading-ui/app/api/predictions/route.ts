import { NextResponse } from 'next/server';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/v1/predictions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Disable caching for fresh predictions
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'SERVICE_UNAVAILABLE' }));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json(
      {
        error: 'SERVICE_UNAVAILABLE',
        message: 'Unable to connect to prediction service. Please try again later.',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
