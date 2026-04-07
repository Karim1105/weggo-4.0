import { test, expect } from '@playwright/test'

test('login page shows invalid-credentials feedback', async ({ page }) => {
  await page.goto('/login?error=1')

  await expect(page.getByText('Invalid email or password.')).toBeVisible()
  await expect(page.getByText('Double-check your credentials and try again.')).toBeVisible()
})
