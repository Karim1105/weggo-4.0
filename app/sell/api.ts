import { withCsrfHeader } from '@/lib/utils'
import type { ListingApiPayload, ListingResponse } from './types'

interface ApiResult<T> {
  status: number
  data: T
}

async function safeParseJson<T>(response: Response, fallback: T): Promise<T> {
  try {
    return (await response.json()) as T
  } catch {
    return fallback
  }
}

export async function uploadNationalIdRequest(nationalIdNumber: string): Promise<ApiResult<{ success?: boolean; error?: string }>> {
  const response = await fetch('/api/auth/upload-id', {
    method: 'POST',
    headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ nationalIdNumber: nationalIdNumber.trim() }),
  })

  return {
    status: response.status,
    data: await safeParseJson(response, {}),
  }
}

function createListingFormData(payload: ListingApiPayload, imageFiles: File[]): FormData {
  const formData = new FormData()
  formData.append('title', payload.title)
  formData.append('description', payload.description)
  formData.append('category', payload.category)
  if (payload.subcategory) formData.append('subcategory', payload.subcategory)
  formData.append('condition', payload.condition)
  formData.append('price', String(payload.price))
  formData.append('location', payload.location)
  imageFiles.forEach((file) => formData.append('images', file))
  return formData
}

export async function createListingRequest(payload: ListingApiPayload, imageFiles: File[]): Promise<ApiResult<ListingResponse>> {
  const formData = createListingFormData(payload, imageFiles)
  const response = await fetch('/api/listings', {
    method: 'POST',
    headers: withCsrfHeader({}),
    credentials: 'include',
    body: formData,
  })

  return {
    status: response.status,
    data: await safeParseJson<ListingResponse>(response, {}),
  }
}
