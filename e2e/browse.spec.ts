import { test, expect } from '@playwright/test'

const listingCard = {
  _id: 'test-1',
  id: 'test-1',
  title: 'Vintage Camera',
  description: 'A clean, working camera for testing.',
  price: 1500,
  location: 'Cairo',
  condition: 'Good',
  category: 'electronics',
  images: ['/uploads/camera.jpg'],
  createdAt: '2026-04-01T12:00:00.000Z',
  status: 'active',
  isBoosted: false,
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
    const cookie = route.request().headers()['cookie'] || ''
    const isAdmin = cookie.includes('adminView=')

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        isAdmin
          ? { success: true, user: { _id: 'admin-1', role: 'admin' } }
          : { success: false, error: 'Unauthorized' }
      ),
    })
  })

  await page.route('**/api/admin/listings/test-1', async (route) => {
    if (route.request().method() === 'PATCH' || route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { listingId: 'test-1', visible: false } }),
      })
      return
    }

    await route.fallback()
  })

  await page.route('**/api/admin/listings/test-1/boost', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { listingId: 'test-1', isBoosted: true } }),
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

test('admin browse card menu uses admin APIs and updates the UI', async ({ page, context }) => {
  await context.addCookies([
    {
      name: 'adminView',
      value: 'on',
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'token',
      value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbi0xIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzc4NjA0ODEwLCJleHAiOjE3Nzg2MzM2MTB9.VRNPVG5xkvQgTKCG7bE7C3bgXXiqEx2fmvOzt7CNyr0',
      domain: 'localhost',
      path: '/',
    }
  ])

  await page.goto('/browse')

  await page.getByLabel('Listing admin actions').first().click()
  await page.getByRole('button', { name: /Feature Listing/i }).click()
  await expect(page.getByText('Featured').first()).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByLabel('Listing admin actions').first().click()
  await page.getByRole('button', { name: /Delete Listing/i }).click()
  await expect(page.getByText('Vintage Camera')).toHaveCount(0)
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
