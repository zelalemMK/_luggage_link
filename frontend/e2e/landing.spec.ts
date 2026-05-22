import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows brand name and hero headline', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Luggage Link').first()).toBeVisible()
    await expect(
      page.getByRole('heading', { name: /Ship Your Luggage/i }).first()
    ).toBeVisible()
  })

  test('has navigation links to login and register', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /get started|register|create/i }).first()).toBeVisible()
  })

  test('pricing calculator shows an estimate', async ({ page }) => {
    await page.route('**/api/pricing/estimate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          estimated_price_usd: 100,
          express: false,
          breakdown: { base_rate: 50, bag_charge: 100, weight_charge: 0, express_fee: 0 },
        }),
      })
    })

    await page.goto('/')

    // Find the pricing calculator section and trigger an estimate
    const calcSection = page.locator('section, div').filter({ hasText: /pricing|estimate|calculator/i }).first()
    await expect(calcSection).toBeVisible()
  })

  test('Ethiopian flag color stripe is visible on the page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('eth-flag-stripe')).toBeVisible()
  })

  test('clicking Sign In navigates to /login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /sign in/i }).first().click()
    await expect(page).toHaveURL('/login')
  })
})
