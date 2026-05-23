import { test, expect } from '@playwright/test'
import { MOCK_CUSTOMER, MOCK_SHIPMENT, MOCK_PRICING } from './helpers'

test.describe('Booking Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('luggage_link_token', 'mock-token'))

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CUSTOMER),
      })
    })

    await page.route('**/api/pricing/estimate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PRICING),
      })
    })

    await page.goto('/dashboard/shipments/new')
  })

  test('renders step 1 with airport selection', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /book a shipment/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/select route/i)).toBeVisible()
    await expect(page.getByText(/departure airport/i)).toBeVisible()
    await expect(page.getByText(/arrival airport/i)).toBeVisible()
  })

  test('step 1 shows validation error when no departure airport selected', async ({ page }) => {
    await page.getByRole('button', { name: /next: luggage details/i }).click()
    await expect(page.getByText(/select a departure airport/i)).toBeVisible()
  })

  test('completes step 1 and advances to step 2', async ({ page }) => {
    await page.locator('select').first().selectOption('JFK')
    await page.getByRole('button', { name: /next: luggage details/i }).click()
    await expect(page.getByText(/luggage details/i).first()).toBeVisible({ timeout: 3000 })
  })

  test('step 2 shows luggage fields', async ({ page }) => {
    await page.locator('select').first().selectOption('JFK')
    await page.getByRole('button', { name: /next: luggage details/i }).click()

    await expect(page.getByText(/number of bags/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/total weight/i)).toBeVisible()
    await expect(page.getByText(/notes/i)).toBeVisible()
  })

  test('step 2 back button returns to step 1', async ({ page }) => {
    await page.locator('select').first().selectOption('JFK')
    await page.getByRole('button', { name: /next: luggage details/i }).click()

    await page.getByRole('button', { name: /back/i }).click()
    await expect(page.getByText(/select route/i)).toBeVisible()
  })

  test('step 3 shows pricing estimate', async ({ page }) => {
    await page.locator('select').first().selectOption('JFK')
    await page.getByRole('button', { name: /next: luggage details/i }).click()
    await page.getByRole('button', { name: /next: review/i }).click()

    await expect(page.getByText(/pricing estimate/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/\$160/)).toBeVisible()
  })

  test('step 3 shows booking summary', async ({ page }) => {
    await page.locator('select').first().selectOption('JFK')
    await page.getByRole('button', { name: /next: luggage details/i }).click()
    await page.getByRole('button', { name: /next: review/i }).click()

    await expect(page.getByText(/booking summary/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/john f\. kennedy international/i)).toBeVisible()
    await expect(page.getByText(/addis ababa bole international/i)).toBeVisible()
  })

  test('successful booking navigates to shipment detail', async ({ page }) => {
    await page.route('**/api/shipments', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_SHIPMENT),
        })
      }
    })
    await page.route(`**/api/shipments/${MOCK_SHIPMENT.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SHIPMENT),
      })
    })

    await page.locator('select').first().selectOption('JFK')
    await page.getByRole('button', { name: /next: luggage details/i }).click()
    await page.getByRole('button', { name: /next: review/i }).click()
    await page.getByRole('button', { name: /book shipment/i }).click()

    await expect(page).toHaveURL(`/dashboard/shipments/${MOCK_SHIPMENT.id}`, { timeout: 5000 })
  })
})
