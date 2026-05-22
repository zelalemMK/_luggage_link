import { Badge } from '@/components/ui/Badge'
import { STATUS_LABELS } from '@/lib/utils'
import type { ShipmentStatus } from '@/types'

type BadgeVariant = 'yellow' | 'blue' | 'orange' | 'purple' | 'teal' | 'green' | 'red' | 'gray'

const STATUS_VARIANTS: Record<ShipmentStatus, BadgeVariant> = {
  PENDING: 'yellow',
  CONFIRMED: 'blue',
  PICKED_UP: 'orange',
  IN_TRANSIT_US: 'orange',
  CUSTOMS_CLEARANCE: 'purple',
  IN_TRANSIT_ET: 'orange',
  ARRIVED_ETHIOPIA: 'teal',
  OUT_FOR_DELIVERY: 'teal',
  DELIVERED: 'green',
  CANCELLED: 'red',
}

interface ShipmentStatusBadgeProps {
  status: ShipmentStatus
  dot?: boolean
}

export function ShipmentStatusBadge({ status, dot = true }: ShipmentStatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANTS[status]} dot={dot}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
