/**
 * Health check and diagnostic information
 * Used for monitoring and load balancer health checks
 */

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  services: {
    database: 'up' | 'down' | 'unknown'
    cache: 'up' | 'down' | 'unknown'
  }
  version: string
}

let startTime = Date.now()

export function getHealthStatus(): HealthStatus {
  const uptime = Math.floor((Date.now() - startTime) / 1000)

  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime,
    services: {
      database: 'unknown', // Would be checked if DB health endpoint exists
      cache: 'unknown', // Would be checked if cache health endpoint exists
    },
    version: '1.0.0',
  }
}
