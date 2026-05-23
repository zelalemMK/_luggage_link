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
  id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface TrackingEvent {
  id: string
  shipment_id: string
  status: ShipmentStatus
  location: string
  description: string
  created_at: string
}

export interface Shipment {
  id: string
  tracking_number: string
  user_id: string
  user?: User
  status: ShipmentStatus
  pickup_address: string    // departure airport display string
  delivery_address: string  // arrival airport display string
  num_bags: number
  total_weight_lbs: number
  estimated_price_usd: number
  actual_price_usd: number | null
  notes: string
  pickup_scheduled_at: string | null  // customer's intended drop-off date
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
  phone?: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface CreateShipmentRequest {
  departure_airport: string
  arrival_airport: string
  num_bags: number
  total_weight_lbs: number
  notes?: string
  drop_off_date?: string
}

export interface UpdateShipmentRequest {
  status?: ShipmentStatus
  actual_price_usd?: number
  notes?: string
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
    bag_charge: number
    weight_charge: number
    express_fee: number
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
  active_shipments: number
  total_customers: number
  shipments_by_status: Partial<Record<ShipmentStatus, number>>
  revenue: {
    actual_usd: number
    estimated_usd: number
  }
  recent_activity: Shipment[]
}

export interface UserWithShipmentCount extends User {
  shipment_count: number
}
