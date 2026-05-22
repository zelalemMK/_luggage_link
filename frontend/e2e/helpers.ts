import type { Page, Route } from '@playwright/test'

// ─── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_CUSTOMER = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'abebe@example.com',
  first_name: 'Abebe',
  last_name: 'Girma',
  phone: '+1-555-123-4567',
  role: 'customer' as const,
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
}

export const MOCK_ADMIN = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  email: 'admin@luggagelink.com',
  first_name: 'Admin',
  last_name: 'User',
  phone: '+1-555-000-0000',
  role: 'admin' as const,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

export const MOCK_TRACKING_EVENTS = [
  {
    id: 'ev1-0000-0000-0000-000000000001',
    shipment_id: 'sh1-0000-0000-0000-000000000001',
    status: 'PENDING',
    location: 'United States',
    description: 'Shipment booking received',
    created_at: '2025-01-20T08:00:00Z',
  },
  {
    id: 'ev1-0000-0000-0000-000000000002',
    shipment_id: 'sh1-0000-0000-0000-000000000001',
    status: 'CONFIRMED',
    location: 'Los Angeles, CA',
    description: 'Shipment confirmed — pickup scheduled',
    created_at: '2025-01-20T12:00:00Z',
  },
]

export const MOCK_SHIPMENT = {
  id: 'sh1-0000-0000-0000-000000000001',
  tracking_number: 'LL-2025-AB3X9Z',
  user_id: MOCK_CUSTOMER.id,
  user: MOCK_CUSTOMER,
  status: 'CONFIRMED' as const,
  pickup_address: '123 Main St, Los Angeles, CA 90001',
  delivery_address: 'Bole Road, Addis Ababa, Ethiopia',
  num_bags: 2,
  total_weight_lbs: 80,
  estimated_price_usd: 160,
  actual_price_usd: null,
  notes: 'Handle with care',
  pickup_scheduled_at: '2025-02-01T09:00:00Z',
  created_at: '2025-01-20T08:00:00Z',
  updated_at: '2025-01-20T12:00:00Z',
  tracking_events: MOCK_TRACKING_EVENTS,
}

export const MOCK_PENDING_SHIPMENT = {
  ...MOCK_SHIPMENT,
  id: 'sh2-0000-0000-0000-000000000002',
  tracking_number: 'LL-2025-XY1234',
  status: 'PENDING' as const,
  tracking_events: [MOCK_TRACKING_EVENTS[0]],
}

export const MOCK_SHIPMENT_LIST = {
  data: [MOCK_SHIPMENT, MOCK_PENDING_SHIPMENT],
  total: 2,
  page: 1,
  per_page: 20,
}

export const MOCK_PRICING = {
  estimated_price_usd: 160,
  express: false,
  breakdown: {
    base_rate: 50,
    bag_charge: 100,
    weight_charge: 60,
    express_fee: 0,
  },
}

export const MOCK_ADMIN_STATS = {
  total_shipments: 42,
  active_shipments: 15,
  total_customers: 28,
  shipments_by_status: {
    PENDING: 5,
    CONFIRMED: 3,
    PICKED_UP: 2,
    IN_TRANSIT_US: 4,
    CUSTOMS_CLEARANCE: 1,
    IN_TRANSIT_ET: 3,
    ARRIVED_ETHIOPIA: 2,
    OUT_FOR_DELIVERY: 0,
    DELIVERED: 20,
    CANCELLED: 2,
  },
  revenue: {
    actual_usd: 3200,
    estimated_usd: 4100,
  },
  recent_activity: [MOCK_SHIPMENT],
}

export const MOCK_ADMIN_SHIPMENT_LIST = {
  data: [MOCK_SHIPMENT, MOCK_PENDING_SHIPMENT],
  total: 2,
  page: 1,
  per_page: 20,
}

export const MOCK_USERS_LIST = {
  data: [
    {
      ...MOCK_CUSTOMER,
      shipment_count: 2,
    },
  ],
  total: 1,
  page: 1,
  per_page: 20,
}

// ─── Auth helpers ──────────────────────────────────────────────────────────────

export async function mockLoginAs(page: Page, user: typeof MOCK_CUSTOMER | typeof MOCK_ADMIN) {
  await page.route('**/api/auth/login', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'mock-jwt-token-for-tests', user }),
    })
  })

  await page.route('**/api/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    })
  })
}

export async function setAuthToken(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem('luggage_link_token', 'mock-jwt-token-for-tests')
  })
}

export async function clearAuthToken(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('luggage_link_token')
  })
}

// ─── Common API mocks ──────────────────────────────────────────────────────────

export async function mockCustomerAPIs(page: Page) {
  await page.route('**/api/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CUSTOMER),
    })
  })

  await page.route('**/api/shipments*', async (route: Route) => {
    const url = route.request().url()
    if (url.includes('/track/')) {
      return // let track-specific mock handle it
    }
    if (route.request().method() === 'GET' && !url.match(/\/shipments\/[^/]+$/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SHIPMENT_LIST),
      })
    } else {
      await route.continue()
    }
  })
}

export async function mockAdminAPIs(page: Page) {
  await page.route('**/api/auth/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ADMIN),
    })
  })

  await page.route('**/api/admin/stats', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ADMIN_STATS),
    })
  })

  await page.route('**/api/admin/shipments*', async (route: Route) => {
    const url = route.request().url()
    if (url.match(/\/admin\/shipments\/[^/]+$/) && route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SHIPMENT),
      })
    } else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ADMIN_SHIPMENT_LIST),
      })
    } else {
      await route.continue()
    }
  })

  await page.route('**/api/admin/users*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USERS_LIST),
    })
  })
}
