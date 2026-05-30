import { NextRequest, NextResponse } from 'next/server';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const referrer = request.headers.get('referer') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwardedBody = {
      ...body,
      referrer: body.referrer || referrer,
      user_agent: body.user_agent || userAgent,
    };

    // Validate required fields
    if (!body.email) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Email is required',
          details: [{ field: 'email', message: 'Email is required' }]
        },
        { status: 400 }
      );
    }

    if (!body.consent_marketing) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Marketing consent is required',
          details: [{ field: 'consent_marketing', message: 'You must consent to receive updates' }]
        },
        { status: 400 }
      );
    }

    // Forward to backend
    const response = await fetch(`${AI_SERVICE_URL}/v1/interest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(forwardedBody)
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        data,
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error('Error submitting interest:', error);
    return NextResponse.json(
      {
        error: 'SERVICE_UNAVAILABLE',
        message: 'Unable to submit your interest. Please try again later.',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
