import { test, expect } from '@playwright/test'
import { MOCK_CUSTOMER, MOCK_ADMIN } from './helpers'

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('shows validation errors for empty submission', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
  })

  test('shows validation error for invalid email format', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('not-an-email')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/enter a valid email/i)).toBeVisible()
  })

  test('successful customer login redirects to /dashboard', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-token', user: MOCK_CUSTOMER }),
      })
    })
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CUSTOMER),
      })
    })
    await page.route('**/api/shipments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, per_page: 20 }),
      })
    })

    await page.getByLabel(/email address/i).fill('abebe@example.com')
    await page.locator('input[type="password"]').fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL('/dashboard', { timeout: 5000 })
  })

  test('successful admin login redirects to /admin', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-admin-token', user: MOCK_ADMIN }),
      })
    })
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ADMIN),
      })
    })
    await page.route('**/api/admin/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, per_page: 20 }),
      })
    })

    await page.getByLabel(/email address/i).fill('admin@luggagelink.com')
    await page.locator('input[type="password"]').fill('admin123')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL('/admin', { timeout: 5000 })
  })

  test('shows error toast on invalid credentials', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid credentials' }),
      })
    })

    await page.getByLabel(/email address/i).fill('wrong@example.com')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 5000 })
  })

  test('password show/hide toggle works', async ({ page }) => {
    const passwordInput = page.locator('input[type="password"]').first()
    await passwordInput.fill('mysecret')
    expect(await passwordInput.getAttribute('type')).toBe('password')

    // Click the eye toggle (tabIndex=-1 button)
    await page.locator('button[tabindex="-1"]').click()
    const visibleInput = page.locator('input[type="text"]').first()
    await expect(visibleInput).toHaveValue('mysecret')
  })

  test('link to register page works', async ({ page }) => {
    await page.getByRole('link', { name: /create one/i }).click()
    await expect(page).toHaveURL('/register')
  })

  test('already logged-in user is redirected away from /login', async ({ page }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CUSTOMER),
      })
    })
    await page.route('**/api/shipments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, per_page: 20 }),
      })
    })
    await page.evaluate(() => localStorage.setItem('luggage_link_token', 'existing-token'))
    await page.goto('/login')
    await expect(page).toHaveURL('/dashboard', { timeout: 5000 })
  })
})

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('renders registration form with all fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible()
    await expect(page.getByLabel(/first name/i)).toBeVisible()
    await expect(page.getByLabel(/last name/i)).toBeVisible()
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })

  test('shows validation errors for empty submission', async ({ page }) => {
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.getByText(/first name is required/i)).toBeVisible()
    await expect(page.getByText(/last name is required/i)).toBeVisible()
    await expect(page.getByText(/email is required/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()
  })

  test('shows error when passwords do not match', async ({ page }) => {
    await page.getByLabel(/first name/i).fill('Abebe')
    await page.getByLabel(/last name/i).fill('Girma')
    await page.getByLabel(/email address/i).fill('abebe@example.com')
    await page.locator('input[placeholder="Min. 8 characters"]').fill('password123')
    await page.getByLabel(/confirm password/i).fill('different_password')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.getByText(/passwords do not match/i)).toBeVisible()
  })

  test('shows error for short password', async ({ page }) => {
    await page.getByLabel(/first name/i).fill('Abebe')
    await page.getByLabel(/last name/i).fill('Girma')
    await page.getByLabel(/email address/i).fill('abebe@example.com')
    await page.locator('input[placeholder="Min. 8 characters"]').fill('short')
    await page.getByLabel(/confirm password/i).fill('short')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible()
  })

  test('successful registration redirects to /dashboard', async ({ page }) => {
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'new-token', user: MOCK_CUSTOMER }),
      })
    })
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CUSTOMER),
      })
    })
    await page.route('**/api/shipments*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], total: 0, page: 1, per_page: 20 }),
      })
    })

    await page.getByLabel(/first name/i).fill('Abebe')
    await page.getByLabel(/last name/i).fill('Girma')
    await page.getByLabel(/email address/i).fill('abebe@example.com')
    await page.locator('input[placeholder="Min. 8 characters"]').fill('securepassword')
    await page.getByLabel(/confirm password/i).fill('securepassword')
    await page.getByRole('button', { name: /create account/i }).click()

    await expect(page).toHaveURL('/dashboard', { timeout: 5000 })
  })

  test('link to login page works', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/login')
  })
})
