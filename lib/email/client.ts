import { Resend } from 'resend'
import { logger } from '@/lib/logger'

let cachedClient: Resend | null = null

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) return null
  if (!cachedClient) cachedClient = new Resend(apiKey)
  return cachedClient
}

export function getFromAddress(): string {
  const explicit = process.env.EMAIL_FROM?.trim()
  if (explicit) return explicit
  // Sensible default for the marketplace. Domain must be verified in Resend
  // before this address can actually send; otherwise Resend will reject.
  return 'Weggo <noreply@weggo.org>'
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

export interface SendEmailResult {
  delivered: boolean
  provider: 'resend' | 'noop'
  id?: string
  error?: string
}

/**
 * Send a transactional email. Returns a result object — the caller decides
 * whether a failure should be visible to the user. Password reset never
 * leaks failure to the requester (anti-enumeration); we log it server-side
 * instead.
 *
 * Behaviour when RESEND_API_KEY is unset:
 *   - dev: logs the would-be payload to the console with provider='noop'
 *   - prod: logs a warning and returns delivered=false, provider='noop'
 * That keeps the app usable without email creds while making it loud that
 * mail isn't actually going out.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getResendClient()

  if (!client) {
    const message = 'RESEND_API_KEY not configured — email not sent'
    if (process.env.NODE_ENV === 'development') {
      console.info(`[email:noop] ${message}`, {
        to: input.to,
        subject: input.subject,
        textPreview: input.text.slice(0, 140),
      })
    } else {
      logger.warn(message, { to: input.to, subject: input.subject })
    }
    return { delivered: false, provider: 'noop', error: message }
  }

  try {
    const { data, error } = await client.emails.send({
      from: getFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    })

    if (error) {
      logger.error('Resend rejected email', undefined, {
        to: input.to,
        subject: input.subject,
        error: error.message,
        name: error.name,
      })
      return { delivered: false, provider: 'resend', error: error.message }
    }

    return { delivered: true, provider: 'resend', id: data?.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email send error'
    logger.error('Email send threw', error as Error, { to: input.to, subject: input.subject })
    return { delivered: false, provider: 'resend', error: message }
  }
}
