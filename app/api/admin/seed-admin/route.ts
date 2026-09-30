import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { validateEmail, validatePassword } from '@/lib/validators'

export const dynamic = 'force-dynamic'

const MIN_SECRET_LENGTH = 32

function secretMatches(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected || expected.length < MIN_SECRET_LENGTH) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  try {
    // Security: require a strong secret header to prevent unauthorized admin creation
    if (!secretMatches(request.headers.get('x-seed-admin-secret'), process.env.SEED_ADMIN_SECRET)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Credentials come from the environment; never ship a default password.
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase() || ''
    const password = process.env.SEED_ADMIN_PASSWORD || ''
    const name = process.env.SEED_ADMIN_NAME?.trim() || 'Admin'

    if (!validateEmail(email) || !validatePassword(password).valid || password.length < 12) {
      return NextResponse.json(
        {
          success: false,
          error: 'Set SEED_ADMIN_EMAIL and a strong SEED_ADMIN_PASSWORD (12+ chars, upper, lower, digit).',
        },
        { status: 400 }
      )
    }

    await connectDB()

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' }).select('_id').lean()
    if (existingAdmin) {
      return NextResponse.json(
        { success: false, error: 'Admin user already exists' },
        { status: 400 }
      )
    }

    const adminUser = await User.create({
      name,
      email,
      password, // Will be hashed by User model
      role: 'admin',
      sellerVerified: true,
      isVerified: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      admin: {
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
    })
  } catch (error: any) {
    console.error('Seed admin error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create admin user' },
      { status: 500 }
    )
  }
}
