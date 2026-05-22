// ─── Enums / Literals ──────────────────────────────────────────────────────

export type ShipmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PICKED_UP'
  | 'IN_TRANSIT_US'
  | 'CUSTOMS_CLEARANCE'
  | 'IN_TRANSIT_ET'
  | 'ARRIVED_ETHIOPIA'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'

export type UserRole = 'customer' | 'admin'

// ─── Core Models ────────────────────────────────────────────────────────────

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface TrackingEvent {
  id: number
  shipment_id: number
  status: ShipmentStatus
  location: string
  description: string
  created_at: string
}

export interface Address {
  street: string
  city: string
  state: string
  zip: string
  country?: string
}

export interface Shipment {
  id: number
  tracking_number: string
  user_id: number
  user?: User
  status: ShipmentStatus
  pickup_address: Address
  delivery_address: Address
  num_bags: number
  total_weight_lbs: number
  estimated_price_usd: number
  actual_price_usd: number | null
  notes: string
  pickup_scheduled_at: string | null
  created_at: string
  updated_at: string
  tracking_events?: TrackingEvent[]
}

// ─── API Request / Response shapes ──────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  phone: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface CreateShipmentRequest {
  pickup_address: Address
  delivery_address: Address
  num_bags: number
  total_weight_lbs: number
  notes?: string
  pickup_scheduled_at?: string
}

export interface UpdateShipmentRequest {
  status?: ShipmentStatus
  actual_price_usd?: number
  notes?: string
  pickup_scheduled_at?: string
}

export interface AddTrackingEventRequest {
  status: ShipmentStatus
  location: string
  description: string
}

export interface PricingEstimateRequest {
  num_bags: number
  total_weight_lbs: number
}

export interface PricingEstimateResponse {
  estimated_price_usd: number
  breakdown: {
    base_rate: number
    weight_charge: number
    bag_charge: number
  }
}

// ─── API Paginated responses ─────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
}

// ─── Admin stats ─────────────────────────────────────────────────────────────

export interface AdminStats {
  total_shipments: number
  pending: number
  in_transit: number
  delivered: number
  cancelled: number
  total_revenue_usd: number
}

export interface UserWithShipmentCount extends User {
  shipment_count: number
}
