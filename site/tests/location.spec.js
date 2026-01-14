import { test, expect } from '@playwright/test'

test('shows a denied message when geolocation is blocked', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Location permission denied' })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})

test('shows an unsupported message when geolocation is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true
    })
  })

  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Location not supported' })
  ).toBeVisible()
})
