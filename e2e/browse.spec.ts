import { test, expect } from '@playwright/test'

const listingCard = {
  _id: 'test-1',
  title: 'Vintage Camera',
  description: 'A clean, working camera for testing.',
  price: 1500,
  location: 'Cairo',
  condition: 'Good',
  category: 'electronics',
  images: ['/uploads/camera.jpg'],
  createdAt: '2026-04-01T12:00:00.000Z',
  seller: {
    _id: 'seller-1',
    name: 'Seller One',
    avatar: null,
    isVerified: true,
    rating: 4.8,
    totalSales: 12,
  },
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/wishlist', async (route) => {
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

  await page.route('**/api/reviews?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, reviews: [], averageRating: 0, totalReviews: 0 }),
    })
  })

  await page.route('**/api/listings/test-1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        product: listingCard,
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
          listings: [listingCard],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            pages: 1,
          },
        },
      }),
    })
  })
})

test('favorite clicks on product cards do not navigate away from browse', async ({ page }) => {
  await page.goto('/browse')

  await page.getByLabel('Add to favorites').first().click()

  await expect(page).toHaveURL(/\/browse/)
})

test('list view still lets users open the listing detail page', async ({ page }) => {
  await page.goto('/browse')

  await page.getByLabel('List view').click()
  await page.getByRole('link', { name: /Vintage Camera/ }).click()

  await expect(page).toHaveURL(/\/listings\/test-1$/)
  await expect(page.getByText('Vintage Camera')).toBeVisible()
})
