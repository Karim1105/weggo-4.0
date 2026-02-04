import { NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { getHealthStatus } from '@/lib/health'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const health = getHealthStatus()
    
    // Try to connect to database to verify it's accessible
    try {
      await connectDB()
      health.services.database = 'up'
    } catch (dbError) {
      logger.warn('Database health check failed', { error: dbError })
      health.services.database = 'down'
      health.status = 'degraded'
    }

    const status = health.status === 'healthy' ? 200 : 503
    return NextResponse.json(health, { status })
  } catch (error: any) {
    logger.error('Health check endpoint error', error)
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    )
  }
}
