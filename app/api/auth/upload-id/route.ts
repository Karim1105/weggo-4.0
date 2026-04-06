import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { getAuthUser } from '@/lib/auth'
import { NATIONAL_ID_GENERIC_ERROR, validateEgyptianNationalId } from '@/lib/validators'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const u = user as any
    if (u.banned) {
      return NextResponse.json(
        { success: false, error: 'Your account is banned.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)
    const nationalIdNumber = body?.nationalIdNumber

    if (typeof nationalIdNumber !== 'string') {
      return NextResponse.json(
        { success: false, error: NATIONAL_ID_GENERIC_ERROR },
        { status: 400 }
      )
    }

    const validation = validateEgyptianNationalId(nationalIdNumber)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: NATIONAL_ID_GENERIC_ERROR },
        { status: 400 }
      )
    }

    await connectDB()
    await User.findByIdAndUpdate(user._id, {
      nationalIdNumber: nationalIdNumber.trim(),
      idDocumentUrl: null,
      sellerVerified: true,
    })

    return NextResponse.json({
      success: true,
      message: 'National ID submitted. You are now a verified seller.',
      sellerVerified: true,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit National ID' },
      { status: 500 }
    )
  }
}
