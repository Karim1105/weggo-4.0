import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import User, { IUser } from '@/models/User'
import { createAdminActivityLog } from '@/features/admin/db/activity-log'
import connectDB from './db'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production. Set it in your environment variables.')
  }
  console.warn('[AUTH] JWT_SECRET not set. Using development fallback secret. Set JWT_SECRET in .env.local for security.')
}

const JWT_SECRET_FINAL = JWT_SECRET || 'dev-secret-do-not-use-in-production'

export interface JWTPayload {
  userId: string
  email: string
  role: string
  iat?: number
}

const JWT_ALGORITHM = 'HS256' as const

export function generateToken(user: IUser): string {
  const payload: JWTPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  }
  // 7 days for regular users, 8 hours for admins
  const expiresIn = user.role === 'admin' ? '8h' : '7d'
  return jwt.sign(payload, JWT_SECRET_FINAL, { expiresIn, algorithm: JWT_ALGORITHM })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET_FINAL, { algorithms: [JWT_ALGORITHM] }) as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * A token issued before the user's last password change is no longer valid,
 * so resetting a password logs out every existing session.
 */
function isTokenStale(payload: JWTPayload, user: IUser | null): boolean {
  const changedAt = user?.passwordChangedAt ? new Date(user.passwordChangedAt).getTime() : 0
  if (!changedAt) return false
  if (typeof payload.iat !== 'number') return true
  // iat has second precision; allow for the truncation.
  return payload.iat * 1000 < changedAt - 1000
}

async function loadUserForToken(payload: JWTPayload | null): Promise<IUser | null> {
  if (!payload?.userId) return null
  await connectDB()
  const user = await User.findById(payload.userId).select('-password')
  if (!user || isTokenStale(payload, user)) return null
  return user
}

export async function getServerAuthUser(): Promise<IUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value
    if (!token) return null

    return await loadUserForToken(verifyToken(token))
  } catch {
    return null
  }
}

export async function getServerViewerRole(): Promise<'user' | 'admin' | null> {
  try {
    const user = await getServerAuthUser()
    if (!user) return null
    return user.role === 'admin' ? 'admin' : 'user'
  } catch {
    return null
  }
}

export async function getAuthUser(request: NextRequest): Promise<IUser | null> {
  try {
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return null

    return await loadUserForToken(verifyToken(token))
  } catch (error) {
    return null
  }
}

export function requireAuth(handler: (req: NextRequest, user: IUser, context?: any) => Promise<Response>) {
  return async (req: NextRequest, context?: any) => {
    const user = await getAuthUser(req)
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    return handler(req, user, context)
  }
}

export function requireAdmin(handler: (req: NextRequest, user: IUser, context?: any) => Promise<Response>) {
  return async (req: NextRequest, context?: any) => {
    const user = await getAuthUser(req)
    if (!user) {
      // For admin-only APIs, behave as if the route does not exist when unauthenticated
      return Response.json({ success: false, error: 'Not found' }, { status: 404 })
    }
    if (user.role !== 'admin') {
      // Hide the existence of admin APIs from non-admin users
      return Response.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    const actor = user.name || user.email || user._id?.toString() || 'admin'
    const path = req.nextUrl.pathname
    const method = req.method
    const pathParts = path.split('/').filter(Boolean)
    const apiName = pathParts[0] === 'api' && pathParts[1] === 'admin' ? (pathParts[2] || 'admin') : (pathParts[1] || 'admin')

    const buildLogMessage = (statusCode: number) => {
      const timestamp = new Date().toISOString()
      return `${timestamp}(${apiName}): admin requested ${method}, got (${statusCode})`
    }

    try {
      const response = await handler(req, user, context)

      try {
        await createAdminActivityLog({
          action: `${method} ${apiName}`,
          details: buildLogMessage(response.status),
          actor,
        })
      } catch (logError) {
        console.error('Admin API activity log error:', logError)
      }

      return response
    } catch (error) {
      try {
        await createAdminActivityLog({
          action: `${method} ${apiName}`,
          details: buildLogMessage(500),
          actor,
        })
      } catch (logError) {
        console.error('Admin API activity log error:', logError)
      }

      throw error
    }
  }
}

export function requireAuthNotBanned(handler: (req: NextRequest, user: IUser) => Promise<Response>) {
  return async (req: NextRequest) => {
    const user = await getAuthUser(req)
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if ((user as any).banned) {
      return Response.json({ success: false, error: 'Your account is banned.' }, { status: 403 })
    }
    return handler(req, user)
  }
}

