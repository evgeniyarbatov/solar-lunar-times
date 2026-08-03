import { test, expect } from '@playwright/test'

test('shows a denied message when geolocation is blocked', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Location required' })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})

test('shows an unsupported message when geolocation is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
    })
  })

  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'Location not supported' })
  ).toBeVisible()
})

test('shows an error when position is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, error) => {
      error({
        code: 2,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'Position update is unavailable',
      })
    }
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Unable to load data' })).toBeVisible()
  await expect(page.getByText(/could not get a position/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
})
