import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, parseISO } from 'date-fns'
import type { ShipmentStatus } from '@/types'

// ─── Tailwind class merger ────────────────────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Date formatters ─────────────────────────────────────────────────────────

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy')
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy h:mm a')
  } catch {
    return dateStr
  }
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
  } catch {
    return dateStr
  }
}

// ─── Currency formatters ──────────────────────────────────────────────────────

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

// ─── Status label map ─────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT_US: 'In Transit (US)',
  CUSTOMS_CLEARANCE: 'Customs Clearance',
  IN_TRANSIT_ET: 'In Transit (Ethiopia)',
  ARRIVED_ETHIOPIA: 'Arrived in Ethiopia',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

// ─── Address formatter ────────────────────────────────────────────────────────

export function formatAddress(address: {
  street: string
  city: string
  state: string
  zip: string
  country?: string
}): string {
  const parts = [address.street, address.city, `${address.state} ${address.zip}`]
  if (address.country) parts.push(address.country)
  return parts.join(', ')
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '…'
}
