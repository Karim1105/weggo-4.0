# API Optimization - Implementation Guide

This guide provides specific code examples for optimizing each API endpoint.

---

## 1. Standardize List View Response Format

### Create a DTO (Data Transfer Object) Helper

**File:** `lib/dto/listing.ts`

```typescript
export interface MinimalListingDTO {
  _id: string
  title: string
  price: number
  image: string | null  // Single image, not array
  category: string
  location: string
  condition: string
  description: string  // Truncated
  seller: {
    _id: string
    name: string
  }
}

export function toMinimalListingDTO(product: any): MinimalListingDTO {
  // Get first valid image (filter out data URIs)
  const images = Array.isArray(product.images) 
    ? product.images.filter((img: string) => typeof img === 'string' && !img.startsWith('data:')) 
    : []
  const image = images.length > 0 ? images[0] : null

  // Truncate description
  const description = typeof product.description === 'string' && product.description.length > 200
    ? product.description.slice(0, 200) + '...'
    : product.description

  return {
    _id: product._id.toString(),
    title: product.title,
    price: product.price,
    image,
    category: product.category,
    location: product.location,
    condition: product.condition,
    description,
    seller: {
      _id: product.seller?._id?.toString() || product.seller,
      name: product.seller?.name || 'Unknown'
    }
  }
}
```

---

## 2. Fix `/api/wishlist`

### BEFORE (Current Code):
```typescript
const [wishlist, total] = await Promise.all([
  Wishlist.find({ user: user._id })
    .populate('product')  // ❌ Full population
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean(),
  Wishlist.countDocuments({ user: user._id }),
])

const products = wishlist.map((w: any) => w.product).filter(Boolean)

return NextResponse.json({
  success: true,
  wishlist: products,  // ❌ Full product objects
  page, limit, total, totalPages: Math.ceil(total / limit),
})
```

### AFTER (Optimized):
```typescript
const [wishlist, total] = await Promise.all([
  Wishlist.find({ user: user._id })
    .populate({
      path: 'product',
      select: '_id title price images category location condition description seller',
      populate: {
        path: 'seller',
        select: 'name'  // ✅ Only name, no avatar
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean(),
  Wishlist.countDocuments({ user: user._id }),
])

const products = wishlist
  .map((w: any) => w.product)
  .filter(Boolean)
  .filter((p: any) => p.status === 'active')
  .map(toMinimalListingDTO)  // ✅ Convert to minimal DTO

return NextResponse.json({
  success: true,
  wishlist: products,  // ✅ Minimal data
  page, limit, total, totalPages: Math.ceil(total / limit),
})
```

**Savings:** ~65-70% per item

---

## 3. Fix `/api/recommendations`

### BEFORE:
```typescript
const recommendations = await Product.find(query)
  .select('_id title price images category location condition description subcategory createdAt seller')
  .populate('seller', 'name avatar')  // ❌ Including avatar
  .sort({ views: -1, createdAt: -1 })
  .limit(12)
  .lean()

return NextResponse.json({
  success: true,
  recommendations,  // ❌ Full objects with all images
})
```

### AFTER:
```typescript
const recommendations = await Product.find(query)
  .select('_id title price images category location condition description seller')
  .populate('seller', 'name')  // ✅ Only name
  .sort({ views: -1, createdAt: -1 })
  .limit(12)
  .lean()

return NextResponse.json({
  success: true,
  recommendations: recommendations.map(toMinimalListingDTO),  // ✅ Minimal DTOs
})
```

**Savings:** ~60-65% per item

---

## 4. Fix `/api/recently-viewed`

### BEFORE:
```typescript
const recentViews = await ViewHistory.find({ user: user._id })
  .sort({ viewedAt: -1 })
  .limit(20)
  .populate('product')  // ❌ Full population
  .lean()

const products = recentViews
  .map((v: any) => v.product)
  .filter((p: any) => p && p.status === 'active')

return NextResponse.json({
  success: true,
  products,  // ❌ Full objects
})
```

### AFTER:
```typescript
const recentViews = await ViewHistory.find({ user: user._id })
  .sort({ viewedAt: -1 })
  .limit(20)
  .populate({
    path: 'product',
    select: '_id title price images category location condition description seller',
    populate: {
      path: 'seller',
      select: 'name'
    }
  })
  .lean()

const products = recentViews
  .map((v: any) => v.product)
  .filter((p: any) => p && p.status === 'active')
  .map(toMinimalListingDTO)  // ✅ Convert to minimal DTO

return NextResponse.json({
  success: true,
  products,
})
```

**Savings:** ~65-70% per item

---

## 5. Fix `/api/listings/nearby`

### BEFORE:
```typescript
const nearbyProducts = /* ...filtered products... */
  .map((product: any) => ({
    ...product,
    distance,
    isFavorite: wishlistIds.has(product._id.toString())
  }))

return successResponse({
  listings: nearbyProducts,  // ❌ Full objects
  // ...
})
```

### AFTER:
```typescript
const nearbyProducts = /* ...filtered products... */
  .map((product: any) => ({
    ...toMinimalListingDTO(product),  // ✅ Minimal DTO
    distance,
    isFavorite: wishlistIds.has(product._id.toString())
  }))

return successResponse({
  listings: nearbyProducts,
  // ...
})
```

**Savings:** ~50-55% per item

---

## 6. Fix `/api/listings/trending`

### BEFORE:
```typescript
const trendingProducts = await Product.find({ /* ... */ })
  .populate('seller', 'name avatar averageRating totalSales')  // ❌ Too many fields
  .sort({ views: -1, createdAt: -1, averageRating: -1 })
  .limit(limit)
  .lean()

const listings = trendingProducts.map((product: any) => ({
  ...product,  // ❌ All fields
  _id: product._id.toString(),
  seller: product.seller ? {
    _id: product.seller._id.toString(),
    name: product.seller.name,
    avatar: product.seller.avatar,
    rating: product.seller.averageRating,
    totalSales: product.seller.totalSales,
  } : null,
  isFavorite: wishlistIds.has(product._id.toString())
}))
```

### AFTER:
```typescript
const trendingProducts = await Product.find({ /* ... */ })
  .populate('seller', 'name')  // ✅ Only name
  .sort({ views: -1, createdAt: -1, averageRating: -1 })
  .limit(limit)
  .lean()

const listings = trendingProducts.map((product: any) => ({
  ...toMinimalListingDTO(product),  // ✅ Minimal DTO
  isFavorite: wishlistIds.has(product._id.toString())
}))
```

**Savings:** ~50-60% per item

---

## 7. Fix `/api/messages` - Conversations List

### BEFORE:
```typescript
const messages = await Message.find({ conversationId: { $in: conversationIds } })
  .populate('sender', 'name email avatar')  // ❌ Including email
  .populate('receiver', 'name email avatar')  // ❌ Including email
  .populate('product', 'title price images')  // ❌ All images
  .sort({ createdAt: -1 })
  .lean()

return NextResponse.json({
  success: true,
  conversations: conversations.map((conv) => ({
    // ❌ Full message objects and populated data
  }))
})
```

### AFTER:
```typescript
const messages = await Message.find({ conversationId: { $in: conversationIds } })
  .populate('sender', 'name avatar')  // ✅ No email
  .populate('receiver', 'name avatar')  // ✅ No email
  .populate('product', 'title price images')
  .sort({ createdAt: -1 })
  .lean()

return NextResponse.json({
  success: true,
  conversations: conversations.map((conv) => {
    const lastMsg = messages.find((m: any) => m.conversationId === conv._id)
    const product = lastMsg?.product
    
    return {
      conversationId: conv._id,
      otherUser: {
        _id: /* ... */,
        name: /* ... */,
        avatar: /* ... */,
        // ✅ No email
      },
      lastMessage: {
        text: lastMsg?.text || '',
        createdAt: lastMsg?.createdAt,
        // ✅ Minimal message data
      },
      product: product ? {
        _id: product._id,
        title: product.title,
        price: product.price,
        image: Array.isArray(product.images) ? product.images[0] : null,  // ✅ First image only
      } : null,
      unreadCount: conv.unreadCount
    }
  })
})
```

**Savings:** ~40-50% per conversation

---

## 8. Fix `/api/reviews`

### BEFORE:
```typescript
$project: {
  rating: 1,
  comment: 1,
  createdAt: 1,
  'reviewer.name': 1,
  'reviewer.avatar': 1,
  'product.title': 1,
  'product.images': 1,  // ❌ All images
}
```

### AFTER:
```typescript
$project: {
  rating: 1,
  comment: 1,
  createdAt: 1,
  'reviewer.name': 1,
  'reviewer.avatar': 1,
  'product.title': 1,
  'product.image': { $arrayElemAt: ['$product.images', 0] },  // ✅ First image only
}
```

**Savings:** ~30-40% per review

---

## 9. Fix `/api/admin/reports`

### BEFORE:
```typescript
const reports = await Report.find(query)
  .populate('listing', 'title images status seller')  // ❌ All images + seller
  .populate('reporter', 'name email')  // ❌ Including email
  .populate('reviewedBy', 'name email')  // ❌ Including email
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean()
```

### AFTER:
```typescript
const reports = await Report.find(query)
  .populate('listing', 'title images status')  // ✅ No seller
  .populate('reporter', 'name')  // ✅ No email
  .populate('reviewedBy', 'name')  // ✅ No email
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean()

// Transform to include only first image
const transformedReports = reports.map((report: any) => ({
  ...report,
  listing: report.listing ? {
    _id: report.listing._id,
    title: report.listing.title,
    image: Array.isArray(report.listing.images) ? report.listing.images[0] : null,  // ✅ First only
    status: report.listing.status
  } : null
}))

return NextResponse.json({
  success: true,
  data: {
    reports: transformedReports,  // ✅ Optimized
    pagination: { /* ... */ },
    stats: { /* ... */ }
  }
})
```

**Savings:** ~40-50% per report

---

## 10. Fix `/api/admin/sellers`

### BEFORE:
```typescript
const sellers = await User.find({
  $or: [
    { sellerVerified: true },
    { role: 'seller' },
  ],
})
  .select('-password -resetPasswordToken -resetPasswordExpires')  // ❌ Still many fields
  .sort({ createdAt: -1 })
  .lean()

// ❌ N+1 query
const sellersWithCounts = await Promise.all(
  sellers.map(async (seller) => {
    const listingCount = await Product.countDocuments({ seller: seller._id })
    return { ...seller, listingCount }
  })
)
```

### AFTER:
```typescript
// Get pagination params
const { searchParams } = new URL(request.url)
const page = parseInt(searchParams.get('page') || '1')
const limit = parseInt(searchParams.get('limit') || '20')
const skip = (page - 1) * limit

// ✅ Use aggregation to get counts efficiently
const [sellers, total] = await Promise.all([
  User.aggregate([
    {
      $match: {
        $or: [
          { sellerVerified: true },
          { role: 'seller' },
        ],
      }
    },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: 'seller',
        as: 'listings'
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        location: 1,
        sellerVerified: 1,
        createdAt: 1,
        listingCount: { $size: '$listings' }
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit }
  ]),
  User.countDocuments({
    $or: [
      { sellerVerified: true },
      { role: 'seller' },
    ],
  })
])

return NextResponse.json({
  success: true,
  data: {
    sellers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  }
})
```

**Savings:** ~80-90% (pagination + aggregation)

---

## 11. Split `/api/admin/analytics`

### BEFORE:
One massive endpoint returning everything.

### AFTER:
Create multiple focused endpoints:

#### `/api/admin/analytics/overview`
```typescript
export async function GET(request: NextRequest) {
  // Just the summary numbers
  const [
    totalUsers,
    totalProducts,
    activeProducts,
    soldProducts,
    totalMessages,
    totalReviews,
  ] = await Promise.all([
    User.countDocuments(),
    Product.countDocuments(),
    Product.countDocuments({ status: 'active' }),
    Product.countDocuments({ status: 'sold' }),
    Message.countDocuments(),
    Review.countDocuments(),
  ])

  return NextResponse.json({
    success: true,
    data: {
      totalUsers,
      totalProducts,
      activeProducts,
      soldProducts,
      totalMessages,
      totalReviews,
    }
  })
}
```

#### `/api/admin/analytics/recent-activity`
```typescript
export async function GET(request: NextRequest) {
  const [recentUsers, recentProducts] = await Promise.all([
    User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email createdAt')
      .lean(),
    Product.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('seller', 'name')  // ✅ Only name
      .select('title price category createdAt seller')
      .lean(),
  ])

  return NextResponse.json({
    success: true,
    data: { recentUsers, recentProducts }
  })
}
```

#### `/api/admin/analytics/trends`
```typescript
export async function GET(request: NextRequest) {
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const usersByMonth = await User.aggregate([
    { $match: { createdAt: { $gte: twelveMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ])

  return NextResponse.json({
    success: true,
    data: { usersByMonth }
  })
}
```

**Savings:** From ~100KB to ~10KB per endpoint

---

## 12. Fix `/api/blocks`

### BEFORE:
```typescript
const me = await User.findById(user._id)
  .populate('blockedUsers', 'name email avatar')  // ❌ Including email
  .lean()

return NextResponse.json({
  success: true,
  blockedUsers: me?.blockedUsers ?? [],
})
```

### AFTER:
```typescript
const me = await User.findById(user._id)
  .populate('blockedUsers', 'name avatar')  // ✅ No email
  .lean()

return NextResponse.json({
  success: true,
  blockedUsers: me?.blockedUsers ?? [],
})
```

**Savings:** ~15-20% per blocked user

---

## Summary Checklist

Use this checklist when optimizing endpoints:

- [ ] Remove unused fields from population (`.populate('field', 'only needed')`)
- [ ] Limit images to first one in list views
- [ ] Truncate descriptions to 150-200 chars in list views
- [ ] Remove email addresses unless absolutely necessary
- [ ] Add pagination for unbounded lists
- [ ] Use aggregation instead of N+1 queries
- [ ] Split large endpoints into focused ones
- [ ] Create and use DTO helper functions
- [ ] Test response sizes before and after
- [ ] Update frontend to handle new response format

---

## Measuring Impact

Add this helper to measure response sizes:

```typescript
// lib/response-size.ts
export function logResponseSize(data: any, endpoint: string) {
  const size = JSON.stringify(data).length
  const kb = (size / 1024).toFixed(2)
  console.log(`[Response Size] ${endpoint}: ${kb}KB`)
  return data
}

// Usage:
return NextResponse.json(logResponseSize({
  success: true,
  data: optimizedData
}, '/api/wishlist'))
```
