import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Product from '@/models/Product'

type ProductSummary = {
  title: string
  price: number
  location: string
}

const QUERY_CONFIG = [
  {
    matcher: (text: string) => text.includes('phone') || text.includes('mobile'),
    category: 'electronics',
    icon: '📱',
    label: 'phones',
    keywords: ['phone', 'mobile'],
    fallback: 'I could not find phone listings right now, but the electronics section is your best next stop.',
  },
  {
    matcher: (text: string) => text.includes('laptop') || text.includes('computer'),
    category: 'electronics',
    icon: '💻',
    label: 'laptops',
    keywords: ['laptop', 'computer'],
    fallback: 'I could not find laptop listings right now, but the electronics section should have the closest matches.',
  },
  {
    matcher: (text: string) => text.includes('furniture') || text.includes('sofa'),
    category: 'furniture',
    icon: '🛋️',
    label: 'furniture',
    keywords: ['furniture', 'sofa'],
    fallback: 'I could not find matching furniture right now, but the furniture section should help you browse more options.',
  },
]

function formatListings(icon: string, items: ProductSummary[]) {
  return items
    .map((item) => `${icon} ${item.title} - ${item.price.toLocaleString()} EGP (${item.location})`)
    .join('\n')
}

async function getMatchingListings(category: string, keywords: string[]) {
  const listings = await Product.find({ status: 'active', category })
    .select('title price location createdAt')
    .sort({ isBoosted: -1, createdAt: -1 })
    .limit(12)
    .lean()

  const normalized = listings.filter((listing: any) => {
    const title = typeof listing.title === 'string' ? listing.title.toLowerCase() : ''
    return keywords.some((keyword) => title.includes(keyword))
  })

  const picked = (normalized.length > 0 ? normalized : listings).slice(0, 3)
  return picked.map((listing: any) => ({
    title: listing.title,
    price: listing.price,
    location: listing.location,
  }))
}

function generateFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    return 'Pricing help is available from the sell flow. Add your item details and use the pricing suggestion tool to get a guided range.'
  }

  if (lowerMessage.includes('how') || lowerMessage.includes('كيف')) {
    return 'Weggo lets you browse listings, save favorites, message sellers directly, and list your own items once your seller account is verified.'
  }

  return 'I can help you browse items, point you to the right category, or explain how Weggo works. Try asking for phones, laptops, furniture, or selling help.'
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()
    const text = typeof message === 'string' ? message.trim() : ''

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    await connectDB()

    const lowerMessage = text.toLowerCase()
    const matchedQuery = QUERY_CONFIG.find((entry) => entry.matcher(lowerMessage))

    if (matchedQuery) {
      const listings = await getMatchingListings(matchedQuery.category, matchedQuery.keywords)
      const response = listings.length > 0
        ? `Here are a few ${matchedQuery.label} I found for you:\n\n${formatListings(matchedQuery.icon, listings)}\n\nIf you want more, head to Browse and filter the category further.`
        : matchedQuery.fallback

      return NextResponse.json({
        success: true,
        response,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      response: generateFallbackResponse(text),
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to process AI request' },
      { status: 500 }
    )
  }
}
