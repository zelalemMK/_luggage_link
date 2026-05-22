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

  test('renders step 1 with address fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /book a shipment/i })).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/pickup address/i).first()).toBeVisible()
    await expect(page.getByPlaceholder(/123 Main St/i)).toBeVisible()
  })

  test('step 1 shows validation errors for empty addresses', async ({ page }) => {
    await page.getByRole('button', { name: /next: luggage details/i }).click()
    await expect(page.getByText(/street is required/i).first()).toBeVisible()
    await expect(page.getByText(/city is required/i).first()).toBeVisible()
  })

  test('step 1 — delivery address street is required', async ({ page }) => {
    // Fill pickup address completely
    await page.getByPlaceholder(/123 Main St/i).fill('456 Oak Ave')
    await page.getByPlaceholder(/Los Angeles/i).first().fill('Seattle')
    await page.locator('select').first().selectOption('WA')
    await page.getByPlaceholder(/90001/i).fill('98101')

    await page.getByRole('button', { name: /next: luggage details/i }).click()
    // Delivery street is empty → should show validation error
    await expect(page.getByText(/street is required/i)).toBeVisible()
  })

  test('completes step 1 and advances to step 2', async ({ page }) => {
    // Fill pickup
    await page.getByPlaceholder(/123 Main St/i).fill('456 Oak Ave')
    await page.getByPlaceholder(/Los Angeles/i).first().fill('Seattle')
    await page.locator('select').first().selectOption('WA')
    await page.getByPlaceholder(/90001/i).fill('98101')

    // Fill delivery
    await page.getByPlaceholder(/Bole Road/i).fill('Bole Road, Kebele 03')
    await page.getByPlaceholder(/Addis Ababa/i).fill('Addis Ababa')

    await page.getByRole('button', { name: /next: luggage details/i }).click()
    await expect(page.getByText(/luggage details/i).first()).toBeVisible({ timeout: 3000 })
  })

  test('step 2 shows luggage fields', async ({ page }) => {
    // Skip to step 2
    await page.getByPlaceholder(/123 Main St/i).fill('456 Oak Ave')
    await page.getByPlaceholder(/Los Angeles/i).first().fill('Seattle')
    await page.locator('select').first().selectOption('WA')
    await page.getByPlaceholder(/90001/i).fill('98101')
    await page.getByPlaceholder(/Bole Road/i).fill('Bole Road, Kebele 03')
    await page.getByPlaceholder(/Addis Ababa/i).fill('Addis Ababa')
    await page.getByRole('button', { name: /next: luggage details/i }).click()

    await expect(page.getByText(/number of bags/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByText(/total weight/i)).toBeVisible()
    await expect(page.getByText(/notes/i)).toBeVisible()
  })

  test('step 2 back button returns to step 1', async ({ page }) => {
    await page.getByPlaceholder(/123 Main St/i).fill('456 Oak Ave')
    await page.getByPlaceholder(/Los Angeles/i).first().fill('Seattle')
    await page.locator('select').first().selectOption('WA')
    await page.getByPlaceholder(/90001/i).fill('98101')
    await page.getByPlaceholder(/Bole Road/i).fill('Bole Road, Kebele 03')
    await page.getByPlaceholder(/Addis Ababa/i).fill('Addis Ababa')
    await page.getByRole('button', { name: /next: luggage details/i }).click()

    await page.getByRole('button', { name: /back/i }).click()
    await expect(page.getByText(/pickup address/i).first()).toBeVisible()
  })

  test('step 3 shows pricing estimate', async ({ page }) => {
    // Step 1
    await page.getByPlaceholder(/123 Main St/i).fill('456 Oak Ave')
    await page.getByPlaceholder(/Los Angeles/i).first().fill('Seattle')
    await page.locator('select').first().selectOption('WA')
    await page.getByPlaceholder(/90001/i).fill('98101')
    await page.getByPlaceholder(/Bole Road/i).fill('Bole Road, Kebele 03')
    await page.getByPlaceholder(/Addis Ababa/i).fill('Addis Ababa')
    await page.getByRole('button', { name: /next: luggage details/i }).click()

    // Step 2
    await page.getByRole('button', { name: /next: review/i }).click()

    // Step 3 — pricing estimate
    await expect(page.getByText(/pricing estimate/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/\$160/)).toBeVisible()
  })

  test('step 3 shows shipment summary', async ({ page }) => {
    await page.getByPlaceholder(/123 Main St/i).fill('456 Oak Ave')
    await page.getByPlaceholder(/Los Angeles/i).first().fill('Seattle')
    await page.locator('select').first().selectOption('WA')
    await page.getByPlaceholder(/90001/i).fill('98101')
    await page.getByPlaceholder(/Bole Road/i).fill('Bole Road, Kebele 03')
    await page.getByPlaceholder(/Addis Ababa/i).fill('Addis Ababa')
    await page.getByRole('button', { name: /next: luggage details/i }).click()
    await page.getByRole('button', { name: /next: review/i }).click()

    await expect(page.getByText(/shipment summary/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('456 Oak Ave')).toBeVisible()
    await expect(page.getByText('Bole Road, Kebele 03')).toBeVisible()
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

    // Navigate through all steps
    await page.getByPlaceholder(/123 Main St/i).fill('456 Oak Ave')
    await page.getByPlaceholder(/Los Angeles/i).first().fill('Seattle')
    await page.locator('select').first().selectOption('WA')
    await page.getByPlaceholder(/90001/i).fill('98101')
    await page.getByPlaceholder(/Bole Road/i).fill('Bole Road, Kebele 03')
    await page.getByPlaceholder(/Addis Ababa/i).fill('Addis Ababa')
    await page.getByRole('button', { name: /next: luggage details/i }).click()
    await page.getByRole('button', { name: /next: review/i }).click()
    await page.getByRole('button', { name: /book shipment/i }).click()

    await expect(page).toHaveURL(`/dashboard/shipments/${MOCK_SHIPMENT.id}`, { timeout: 5000 })
  })
})
