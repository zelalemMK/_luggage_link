import axios, { type AxiosError } from 'axios'
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  Shipment,
  CreateShipmentRequest,
  UpdateShipmentRequest,
  AddTrackingEventRequest,
  PricingEstimateRequest,
  PricingEstimateResponse,
  AdminStats,
  User,
  UserWithShipmentCount,
  PaginatedResponse,
} from '@/types'

// ─── Token helpers ────────────────────────────────────────────────────────────

const TOKEN_KEY = 'luggage_link_token'

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY)

// ─── Axios instance ───────────────────────────────────────────────────────────

const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach JWT
apiClient.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearToken()
      // Avoid redirect loops on the login page itself
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/auth/login', data)
    return res.data
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/api/auth/register', data)
    return res.data
  },

  me: async (): Promise<User> => {
    const res = await apiClient.get<User>('/api/auth/me')
    return res.data
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>('/api/auth/forgot-password', { email })
    return res.data
  },
}

// ─── Shipments API ────────────────────────────────────────────────────────────

export const shipmentsApi = {
  // Customer: list their own shipments
  list: async (params?: { page?: number; per_page?: number }): Promise<PaginatedResponse<Shipment>> => {
    const res = await apiClient.get<PaginatedResponse<Shipment>>('/api/shipments', { params })
    return res.data
  },

  // Customer: get single shipment
  get: async (id: string): Promise<Shipment> => {
    const res = await apiClient.get<Shipment>(`/api/shipments/${id}`)
    return res.data
  },

  // Customer: create shipment
  create: async (data: CreateShipmentRequest): Promise<Shipment> => {
    const res = await apiClient.post<Shipment>('/api/shipments', data)
    return res.data
  },

  // Public: track by tracking number
  track: async (trackingNumber: string): Promise<Shipment> => {
    const res = await apiClient.get<Shipment>(`/api/shipments/track/${trackingNumber}`)
    return res.data
  },
}

// ─── Admin Shipments API ──────────────────────────────────────────────────────

export const adminShipmentsApi = {
  list: async (params?: {
    page?: number
    per_page?: number
    status?: string
    search?: string
  }): Promise<PaginatedResponse<Shipment>> => {
    const res = await apiClient.get<PaginatedResponse<Shipment>>('/api/admin/shipments', { params })
    return res.data
  },

  get: async (id: string): Promise<Shipment> => {
    const res = await apiClient.get<Shipment>(`/api/admin/shipments/${id}`)
    return res.data
  },

  update: async (id: string, data: UpdateShipmentRequest): Promise<Shipment> => {
    const res = await apiClient.put<Shipment>(`/api/admin/shipments/${id}`, data)
    return res.data
  },

  addTrackingEvent: async (id: string, data: AddTrackingEventRequest): Promise<Shipment> => {
    const res = await apiClient.post<Shipment>(`/api/admin/shipments/${id}/tracking-event`, data)
    return res.data
  },

  stats: async (): Promise<AdminStats> => {
    const res = await apiClient.get<AdminStats>('/api/admin/stats')
    return res.data
  },
}

// ─── Admin Users API ──────────────────────────────────────────────────────────

export const adminUsersApi = {
  list: async (params?: { page?: number; per_page?: number; search?: string }): Promise<PaginatedResponse<UserWithShipmentCount>> => {
    const res = await apiClient.get<PaginatedResponse<UserWithShipmentCount>>('/api/admin/users', { params })
    return res.data
  },

  get: async (id: string): Promise<UserWithShipmentCount> => {
    const res = await apiClient.get<UserWithShipmentCount>(`/api/admin/users/${id}`)
    return res.data
  },
}

// ─── Pricing API ──────────────────────────────────────────────────────────────

export const pricingApi = {
  estimate: async (data: PricingEstimateRequest): Promise<PricingEstimateResponse> => {
    const res = await apiClient.post<PricingEstimateResponse>('/api/pricing/estimate', data)
    return res.data
  },
}

export default apiClient
