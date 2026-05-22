import { test, expect } from '@playwright/test'
import { MOCK_SHIPMENT } from './helpers'

test.describe('Public Tracking Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/track')
  })

  test('renders the tracking page with search form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /track your shipment/i })).toBeVisible()
    await expect(page.getByPlaceholder(/LL-2025/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /track/i })).toBeVisible()
  })

  test('shows empty state before any search', async ({ page }) => {
    await expect(page.getByText(/enter a tracking number/i)).toBeVisible()
  })

  test('shows shipment details after a successful search', async ({ page }) => {
    await page.route('**/api/shipments/track/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SHIPMENT),
      })
    })

    await page.getByPlaceholder(/LL-2025/i).fill('LL-2025-AB3X9Z')
    await page.getByRole('button', { name: /track/i }).click()

    await expect(page.getByText('LL-2025-AB3X9Z')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/confirmed/i).first()).toBeVisible()
    await expect(page.getByText(/tracking history/i)).toBeVisible()
  })

  test('normalizes tracking number input to uppercase before search', async ({ page }) => {
    let capturedUrl = ''
    await page.route('**/api/shipments/track/**', async (route) => {
      capturedUrl = route.request().url()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SHIPMENT),
      })
    })

    await page.getByPlaceholder(/LL-2025/i).fill('ll-2025-ab3x9z')
    await page.getByRole('button', { name: /track/i }).click()

    await expect(page.getByText('LL-2025-AB3X9Z')).toBeVisible({ timeout: 5000 })
    expect(capturedUrl).toContain('LL-2025-AB3X9Z')
  })

  test('shows not found error for invalid tracking number', async ({ page }) => {
    await page.route('**/api/shipments/track/**', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'shipment not found' }),
      })
    })

    await page.getByPlaceholder(/LL-2025/i).fill('LL-2025-INVALID')
    await page.getByRole('button', { name: /track/i }).click()

    await expect(page.getByText(/shipment not found/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('LL-2025-INVALID')).toBeVisible()
  })

  test('tracking timeline shows tracking events', async ({ page }) => {
    await page.route('**/api/shipments/track/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SHIPMENT),
      })
    })

    await page.getByPlaceholder(/LL-2025/i).fill('LL-2025-AB3X9Z')
    await page.getByRole('button', { name: /track/i }).click()

    // Should show tracking events from MOCK_TRACKING_EVENTS
    await expect(page.getByText(/Shipment booking received/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/pickup scheduled/i)).toBeVisible()
  })

  test('shows shipment weight and bag count', async ({ page }) => {
    await page.route('**/api/shipments/track/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SHIPMENT),
      })
    })

    await page.getByPlaceholder(/LL-2025/i).fill('LL-2025-AB3X9Z')
    await page.getByRole('button', { name: /track/i }).click()

    await expect(page.getByText('2', { exact: true })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('80 lbs')).toBeVisible()
  })
})
