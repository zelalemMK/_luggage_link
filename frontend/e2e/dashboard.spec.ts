import { test, expect } from '@playwright/test'
import { MOCK_CUSTOMER, MOCK_SHIPMENT, MOCK_PENDING_SHIPMENT, MOCK_SHIPMENT_LIST } from './helpers'

test.describe('Customer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Set token and mock auth
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('luggage_link_token', 'mock-token'))

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CUSTOMER),
      })
    })
  })

  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('luggage_link_token'))
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('shows welcome message with user first name', async ({ page }) => {
    await page.route('**/api/shipments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SHIPMENT_LIST),
      })
    })

    await page.goto('/dashboard')
    await expect(page.getByText(/welcome back, abebe/i)).toBeVisible({ timeout: 5000 })
  })

  test('shows shipment stats cards', async ({ page }) => {
    await page.route('**/api/shipments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SHIPMENT_LIST),
      })
    })

    await page.goto('/dashboard')
    await expect(page.getByText(/total shipments/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/in transit/i)).toBeVisible()
    await expect(page.getByText(/delivered/i)).toBeVisible()
  })

  test('renders shipment list', async ({ page }) => {
    await page.route('**/api/shipments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SHIPMENT_LIST),
      })
    })

    await page.goto('/dashboard')
    await expect(page.getByText('LL-2025-AB3X9Z')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('LL-2025-XY1234')).toBeVisible()
  })

  test('shows empty state when no shipments', async ({ page }) => {
    await page.route('**/api/shipments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, per_page: 20 }),
      })
    })

    await page.goto('/dashboard')
    await expect(page.getByText(/no shipments yet/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('link', { name: /book shipment/i })).toBeVisible()
  })

  test('"Book Shipment" button navigates to /dashboard/shipments/new', async ({ page }) => {
    await page.route('**/api/shipments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, per_page: 20 }),
      })
    })

    await page.goto('/dashboard')
    await page.getByRole('link', { name: /book shipment/i }).first().click()
    await expect(page).toHaveURL('/dashboard/shipments/new')
  })
})

test.describe('Shipment Detail Page', () => {
  const SHIPMENT_ID = MOCK_SHIPMENT.id

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

    await page.route(`**/api/shipments/${SHIPMENT_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SHIPMENT),
      })
    })
  })

  test('shows shipment tracking number and status', async ({ page }) => {
    await page.goto(`/dashboard/shipments/${SHIPMENT_ID}`)
    await expect(page.getByText('LL-2025-AB3X9Z')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/confirmed/i).first()).toBeVisible()
  })

  test('shows pickup and delivery addresses', async ({ page }) => {
    await page.goto(`/dashboard/shipments/${SHIPMENT_ID}`)
    await expect(page.getByText(/Los Angeles/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Addis Ababa/i)).toBeVisible()
  })

  test('shows tracking timeline with events', async ({ page }) => {
    await page.goto(`/dashboard/shipments/${SHIPMENT_ID}`)
    await expect(page.getByText(/tracking history/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Shipment booking received/i)).toBeVisible()
  })

  test('shows bag count and weight', async ({ page }) => {
    await page.goto(`/dashboard/shipments/${SHIPMENT_ID}`)
    await expect(page.getByText(/2 bags/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/80.*lbs/i)).toBeVisible()
  })

  test('shows estimated price', async ({ page }) => {
    await page.goto(`/dashboard/shipments/${SHIPMENT_ID}`)
    await expect(page.getByText(/\$160/)).toBeVisible({ timeout: 5000 })
  })
})
