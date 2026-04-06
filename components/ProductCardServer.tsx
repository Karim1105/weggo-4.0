import { cookies } from 'next/headers'
import ProductCard from './ProductCard'

interface Product {
  id: string
  title: string
  price: number
  location: string
  condition: string
  image: string
  category: string
  postedAt: string
  isFavorite: boolean
  seller?: {
    name: string
    rating?: number
    totalSales?: number
    verified?: boolean
  }
}

interface ProductCardServerProps {
  product: Product
  index: number
  onToggleFavorite: (id: string) => void
}

async function getUser(): Promise<{ role: 'user' | 'admin' } | null> {
  try {
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.toString()

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
      },
    })

    const data = await res.json()
    if (data.success && data.user) {
      return { role: data.user.role }
    }
  } catch (error) {
    // Not authenticated
  }

  return null
}

export default async function ProductCardServer({ product, index, onToggleFavorite }: ProductCardServerProps) {
  const user = await getUser()
  const isAdmin = user?.role === 'admin' || false

  return (
    <ProductCard
      product={product}
      index={index}
      onToggleFavorite={onToggleFavorite}
      isAdmin={isAdmin}
    />
  )
}
