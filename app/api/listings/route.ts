import { NextRequest } from 'next/server'
import { createListingController, getListingsController } from '@/app/api/listings/controller'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return getListingsController(request)
}

export async function POST(request: NextRequest) {
  return createListingController(request)
}

