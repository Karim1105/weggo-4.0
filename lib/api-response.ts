import { NextResponse } from 'next/server'

/**
 * Standardized API Response Format
 * All API endpoints should use these functions for consistent responses
 */

export interface ApiSuccessResponse<T = any> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  code?: string
  details?: Record<string, any>
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  )
}

/**
 * Error response
 */
export function errorResponse(
  error: string,
  status: number = 400,
  code?: string,
  details?: Record<string, any>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(code && { code }),
      ...(details && { details }),
    },
    { status }
  )
}

/**
 * Common error responses
 */
export const ApiErrors = {
  unauthorized: () =>
    errorResponse('Unauthorized', 401, 'UNAUTHORIZED'),

  forbidden: () =>
    errorResponse('Forbidden', 403, 'FORBIDDEN'),

  notFound: () =>
    errorResponse('Not found', 404, 'NOT_FOUND'),

  conflict: (message = 'Resource already exists') =>
    errorResponse(message, 409, 'CONFLICT'),

  validationError: (details: Record<string, string>) =>
    errorResponse('Validation failed', 400, 'VALIDATION_ERROR', details),

  serverError: () =>
    errorResponse('An error occurred. Please try again.', 500, 'SERVER_ERROR'),

  rateLimitExceeded: () =>
    errorResponse('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED'),

  badRequest: (message: string) =>
    errorResponse(message, 400, 'BAD_REQUEST'),

  errorResponse: errorResponse, // Export the function itself
}
