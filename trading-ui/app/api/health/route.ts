import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Basic health check
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      services: {
        supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        stripe: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        ai_service: !!process.env.AI_SERVICE_URL,
      }
    }

    return NextResponse.json(healthData, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
