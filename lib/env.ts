/**
 * Environment variable validation
 * Run this on application startup to ensure all required variables are set
 */

export function validateEnvironment() {
  const required = ['MONGODB_URI', 'JWT_SECRET']
  const missing: string[] = []

  required.forEach((envVar) => {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  })

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(
        ', '
      )}. Please check your .env.local file.`
    )
  }
}

/**
 * Call this in your application entry point (e.g., in a top-level layout or middleware)
 * Only validate in production or when explicitly enabled
 */
export function initializeEnv() {
  if (typeof window === 'undefined') {
    // Server-side only
    if (process.env.NODE_ENV === 'production') {
      validateEnvironment()
    }
  }
}
