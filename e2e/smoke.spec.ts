import { test, expect } from '@playwright/test'

const baseURL = process.env.E2E_BASE_URL

test.skip(!baseURL, 'E2E_BASE_URL not set')

test('home page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Weggo/i)
})
