import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const screenshotDir = path.resolve(__dirname, '..', 'screenshots')
const testLocation = { latitude: 40.7128, longitude: -74.006 }

const captureScreenshot = async (page, mode, name) => {
  await fs.mkdir(screenshotDir, { recursive: true })
  await page.emulateMedia({ colorScheme: mode })
  await page.context().setGeolocation(testLocation)
  await page.context().grantPermissions(['geolocation'])
  await page.goto('/')
  await page.waitForSelector('.day-card', { state: 'visible' })

  const filePath = path.join(screenshotDir, `${name}-${mode}.png`)
  await page.screenshot({ path: filePath, fullPage: true })

  const stats = await fs.stat(filePath)
  expect(stats.size).toBeGreaterThan(0)
}

test('renders light mode screenshot', async ({ page }, testInfo) => {
  await captureScreenshot(page, 'light', testInfo.project.name)
})

test('renders dark mode screenshot', async ({ page }, testInfo) => {
  await captureScreenshot(page, 'dark', testInfo.project.name)
})
