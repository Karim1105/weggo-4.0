import { test, expect } from '@playwright/test'

function makeListing(id: string, title: string, category = 'electronics') {
  return {
    _id: id,
    title,
    description: `${title} description`,
    price: 1500,
    location: 'cairo',
    condition: 'Good',
    category,
    subcategory: category === 'electronics' ? 'smartphones' : 'other-home',
    images: ['/uploads/test-image.jpg'],
    createdAt: '2026-04-01T12:00:00.000Z',
    seller: {
      _id: `seller-${id}`,
      name: `Seller ${id}`,
      avatar: null,
      isVerified: true,
      rating: 4.8,
      totalSales: 12,
    },
    status: 'active',
  }
}

test('home discovery shows live category counts and honest recommendation fallback', async ({ page }) => {
  const fallbackListings = [
    makeListing('fallback-1', 'Fallback Phone'),
    makeListing('fallback-2', 'Fallback Chair', 'furniture'),
  ]
  const trendingListings = [makeListing('trending-1', 'Trending Console', 'gaming')]

  await page.route('**/api/wishlist**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, wishlist: [] }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Unauthorized' }),
    })
  })

  await page.route('**/api/categories/counts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          counts: {
            electronics: 24,
            furniture: 8,
            vehicles: 5,
            fashion: 10,
            home: 3,
            sports: 2,
            books: 1,
            toys: 4,
            music: 0,
            gaming: 7,
          },
        },
      }),
    })
  })

  await page.route('**/api/recommendations', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Unauthorized' }),
    })
  })

  await page.route('**/api/recently-viewed', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, products: [] }),
    })
  })

  await page.route('**/api/listings/trending?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          listings: trendingListings,
        },
      }),
    })
  })

  await page.route('**/api/listings?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          listings: fallbackListings,
          total: fallbackListings.length,
          nextCursor: null,
          hasMore: false,
        },
      }),
    })
  })

  await page.goto('/')

  await expect(page.getByText('Sign in to personalize', { exact: true })).toBeVisible()
  await expect(
    page.getByText('You need to be logged in for recommendation signals. Showing fresh listings for now.')
  ).toBeVisible()
  await expect(page.getByText('24 items')).toBeVisible()
  await expect(page.getByText('Fallback Phone').first()).toBeVisible()

  await page.getByRole('button', { name: /Switch to Trending/i }).click()

  await expect(page.getByText('See the listings getting the most attention right now.')).toBeVisible()
  await expect(page.getByText('Trending Console').first()).toBeVisible()
})

test('browse shows total count separately from loaded items and can load more', async ({ page }) => {
  const firstPage = [makeListing('browse-1', 'Vintage Camera'), makeListing('browse-2', 'Desk Lamp', 'home')]
  const secondPage = [makeListing('browse-3', 'Road Bike', 'sports')]

  await page.route('**/api/wishlist**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, wishlist: [] }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    })
  })

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Unauthorized' }),
    })
  })

  await page.route('**/api/listings?*', async (route) => {
    const url = new URL(route.request().url())
    const cursor = url.searchParams.get('cursor')

    if (cursor === 'cursor-2') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            listings: secondPage,
            nextCursor: null,
            hasMore: false,
          },
        }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          listings: firstPage,
          total: 3,
          nextCursor: 'cursor-2',
          hasMore: true,
        },
      }),
    })
  })

  await page.goto('/browse')

  await expect(page.getByRole('heading', { name: '3 items found' })).toBeVisible()
  await expect(page.getByText('Showing 2 loaded items so far')).toBeVisible()
  await expect(page.getByText('Vintage Camera')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load more' })).toBeVisible()

  await page.getByRole('button', { name: 'Load more' }).click()

  await expect(page.getByText('Road Bike')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0)
})
