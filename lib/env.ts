/**
 * Environment variable validation
 * Run this on application startup to ensure all required variables are set
 */

export function validateEnvironment() {
  const required = ['MONGODB_URI', 'JWT_SECRET']
  const recommendedInProduction = ['NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_APP_URL']
  const missing: string[] = []
  const warnings: string[] = []

  required.forEach((envVar) => {
    if (!process.env[envVar]) {
      missing.push(envVar)
    }
  })

  if (process.env.NODE_ENV === 'production') {
    recommendedInProduction.forEach((envVar) => {
      if (!process.env[envVar]) {
        warnings.push(envVar)
      }
    })
  }

  const smtpVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']
  const configuredSmtpVars = smtpVars.filter((envVar) => Boolean(process.env[envVar]))
  if (configuredSmtpVars.length > 0 && configuredSmtpVars.length < smtpVars.length) {
    const missingSmtpVars = smtpVars.filter((envVar) => !process.env[envVar])
    throw new Error(
      `Incomplete SMTP configuration. Missing: ${missingSmtpVars.join(', ')}.`
    )
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(
        ', '
      )}. Please check your .env.local file.`
    )
  }

  if (warnings.length > 0) {
    console.warn(
      `[env] Recommended production environment variables missing: ${warnings.join(', ')}`
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
    } else {
      const seedWarnings = ['SEED_ADMIN_SECRET', 'SEED_FEATURED_SECRET'].filter((envVar) => !process.env[envVar])
      if (seedWarnings.length > 0) {
        console.warn(`[env] Optional admin seed secrets missing: ${seedWarnings.join(', ')}`)
      }
    }
  }
}
