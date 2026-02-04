import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { getAuthUser } from '@/lib/auth'
import { saveIdDocument } from '@/lib/imageUpload'

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

    const formData = await request.formData()
    const file = formData.get('idDocument') as File
    if (!file || file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Please upload your government-issued ID' },
        { status: 400 }
      )
    }

    const url = await saveIdDocument(file, user._id.toString())

    await connectDB()
    await User.findByIdAndUpdate(user._id, {
      idDocumentUrl: url,
      sellerVerified: true,
    })

    return NextResponse.json({
      success: true,
      message: 'ID uploaded. You are now a verified seller.',
      sellerVerified: true,
    })
  } catch (error: any) {
    if (error instanceof Error) {
      const message = error.message || 'Upload failed'
      const uploadErrors = [
        'Invalid file type',
        'File size exceeds',
        'File content does not match',
      ]
      if (uploadErrors.some((fragment) => message.includes(fragment))) {
        return NextResponse.json(
          { success: false, error: message },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}
