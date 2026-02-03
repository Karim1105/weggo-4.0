import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import User, { IUser } from '@/models/User'
import connectDB from './db'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production')
  }
  // Only use fallback in development
  console.warn('[AUTH] Using development JWT secret. Set JWT_SECRET in .env.local for security.')
}

const JWT_SECRET_FINAL = JWT_SECRET || 'dev-secret-do-not-use-in-production'

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

export function generateToken(user: IUser): string {
  const payload: JWTPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  }
  return jwt.sign(payload, JWT_SECRET_FINAL, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET_FINAL) as JWTPayload
  } catch (error) {
    return null
  }
}

export async function getAuthUser(request: NextRequest): Promise<IUser | null> {
  try {
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    await connectDB()
    const user = await User.findById(payload.userId).select('-password')
    return user
  } catch (error) {
    return null
  }
}

export function requireAuth(handler: (req: NextRequest, user: IUser) => Promise<Response>) {
  return async (req: NextRequest) => {
    const user = await getAuthUser(req)
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    return handler(req, user)
  }
}

export function requireAdmin(handler: (req: NextRequest, user: IUser) => Promise<Response>) {
  return async (req: NextRequest) => {
    const user = await getAuthUser(req)
    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'admin') {
      return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    return handler(req, user)
  }
}


