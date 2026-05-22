import { test, expect } from '@playwright/test'
import {
  MOCK_ADMIN,
  MOCK_CUSTOMER,
  MOCK_ADMIN_STATS,
  MOCK_ADMIN_SHIPMENT_LIST,
  MOCK_SHIPMENT,
  MOCK_USERS_LIST,
} from './helpers'

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('luggage_link_token', 'mock-admin-token'))

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ADMIN),
      })
    })

    await page.route('**/api/admin/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ADMIN_STATS),
      })
    })

    await page.route('**/api/admin/shipments*', async (route) => {
      if (/\/admin\/shipments\/[^/]+$/.test(route.request().url())) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_SHIPMENT),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_ADMIN_SHIPMENT_LIST),
        })
      }
    })
  })

  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('luggage_link_token'))
    await page.goto('/admin')
    await expect(page).toHaveURL('/login')
  })

  test('shows admin dashboard heading', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible({ timeout: 5000 })
  })

  test('shows stats cards with correct values', async ({ page }) => {
    await page.goto('/admin')
    // total shipments = 42
    await expect(page.getByText('42')).toBeVisible({ timeout: 5000 })
    // pending = 5
    await expect(page.getByText('5')).toBeVisible()
    // revenue from actual_usd = $3,200
    await expect(page.getByText(/\$3,200/)).toBeVisible()
  })

  test('shows recent shipments table', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText('LL-2025-AB3X9Z')).toBeVisible({ timeout: 5000 })
  })

  test('"View all" link navigates to /admin/shipments', async ({ page }) => {
    await page.goto('/admin')
    await page.getByRole('link', { name: /view all/i }).click()
    await expect(page).toHaveURL('/admin/shipments')
  })
})

test.describe('Admin Shipments List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('luggage_link_token', 'mock-admin-token'))

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ADMIN),
      })
    })

    await page.route('**/api/admin/shipments*', async (route) => {
      if (/\/admin\/shipments\/[^/]+$/.test(route.request().url())) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_SHIPMENT),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_ADMIN_SHIPMENT_LIST),
        })
      }
    })

    await page.goto('/admin/shipments')
  })

  test('renders shipments table with data', async ({ page }) => {
    await expect(page.getByText('LL-2025-AB3X9Z')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('LL-2025-XY1234')).toBeVisible()
  })

  test('shows status filter dropdown', async ({ page }) => {
    const select = page.locator('select')
    await expect(select).toBeVisible()
    await expect(select.locator('option', { hasText: /all statuses/i })).toHaveCount(1)
  })

  test('shows search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/search by name or tracking/i)).toBeVisible()
  })

  test('shows total count', async ({ page }) => {
    await expect(page.getByText(/2 total shipments/i)).toBeVisible({ timeout: 5000 })
  })

  test('filter by status updates query', async ({ page }) => {
    let calledWith = ''
    await page.route('**/api/admin/shipments*', async (route) => {
      calledWith = route.request().url()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, per_page: 20 }),
      })
    })

    await page.locator('select').selectOption('PENDING')
    await page.getByRole('button', { name: /apply/i }).click()

    await expect(async () => {
      expect(calledWith).toContain('status=PENDING')
    }).toPass({ timeout: 3000 })
  })
})

test.describe('Admin Shipment Detail', () => {
  const SHIPMENT_ID = MOCK_SHIPMENT.id

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('luggage_link_token', 'mock-admin-token'))

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ADMIN),
      })
    })

    await page.route(`**/api/admin/shipments/${SHIPMENT_ID}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_SHIPMENT),
        })
      } else if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...MOCK_SHIPMENT, status: 'PICKED_UP' }),
        })
      }
    })

    await page.goto(`/admin/shipments/${SHIPMENT_ID}`)
  })

  test('shows shipment tracking number', async ({ page }) => {
    await expect(page.getByText('LL-2025-AB3X9Z')).toBeVisible({ timeout: 5000 })
  })

  test('shows customer info', async ({ page }) => {
    await expect(page.getByText(/abebe girma/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('abebe@example.com')).toBeVisible()
  })

  test('shows admin controls section', async ({ page }) => {
    await expect(page.getByText(/admin controls/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/update status/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible()
  })

  test('status update dropdown is available', async ({ page }) => {
    const statusSelect = page.locator('select').first()
    await expect(statusSelect).toBeVisible({ timeout: 5000 })
    await expect(statusSelect.locator('option', { hasText: /keep current/i })).toHaveCount(1)
  })

  test('add event button opens modal', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click()
    await expect(page.getByText(/add tracking event/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByLabel(/location/i)).toBeVisible()
    await expect(page.getByLabel(/description/i)).toBeVisible()
  })

  test('add event modal can be closed', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click()
    await expect(page.getByText(/add tracking event/i)).toBeVisible()
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByText(/add tracking event/i)).not.toBeVisible({ timeout: 3000 })
  })

  test('add event submit is disabled when location or description is empty', async ({ page }) => {
    await page.getByRole('button', { name: /add event/i }).click()
    const submitBtn = page.getByRole('button', { name: /^add event$/i })
    await expect(submitBtn).toBeDisabled()
  })

  test('add event submit becomes enabled when fields are filled', async ({ page }) => {
    await page.route(`**/api/admin/shipments/${SHIPMENT_ID}/tracking-event`, async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'ev-new',
          shipment_id: SHIPMENT_ID,
          status: 'IN_TRANSIT_US',
          location: 'JFK Airport',
          description: 'Package departed',
          created_at: new Date().toISOString(),
        }),
      })
    })

    await page.getByRole('button', { name: /add event/i }).click()
    await page.getByLabel(/location/i).fill('JFK Airport, New York')
    await page.getByLabel(/description/i).fill('Package has departed')
    const submitBtn = page.getByRole('button', { name: /^add event$/i })
    await expect(submitBtn).not.toBeDisabled()
  })

  test('shows tracking timeline', async ({ page }) => {
    await expect(page.getByText(/tracking timeline/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/Shipment booking received/i)).toBeVisible()
  })
})

test.describe('Admin Users List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.setItem('luggage_link_token', 'mock-admin-token'))

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ADMIN),
      })
    })

    await page.route('**/api/admin/users*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USERS_LIST),
      })
    })

    await page.goto('/admin/users')
  })

  test('renders users table', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /customers/i })).toBeVisible({ timeout: 5000 })
  })

  test('shows customer name', async ({ page }) => {
    await expect(page.getByText(/abebe girma/i)).toBeVisible({ timeout: 5000 })
  })

  test('shows customer email', async ({ page }) => {
    await expect(page.getByText('abebe@example.com')).toBeVisible({ timeout: 5000 })
  })

  test('shows shipment count', async ({ page }) => {
    // shipment_count = 2 in mock data
    await expect(page.getByText('2').first()).toBeVisible({ timeout: 5000 })
  })
})
