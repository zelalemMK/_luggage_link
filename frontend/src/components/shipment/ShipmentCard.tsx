import { Link } from '@tanstack/react-router'
import { Package, MapPin, Calendar, Weight, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ShipmentStatusBadge } from './ShipmentStatusBadge'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Shipment } from '@/types'

interface ShipmentCardProps {
  shipment: Shipment
}

export function ShipmentCard({ shipment }: ShipmentCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: tracking + status */}
        <div className="flex flex-1 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50">
            <Package className="h-6 w-6 text-brand-700" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-gray-900">
                #{shipment.tracking_number}
              </h3>
              <ShipmentStatusBadge status={shipment.status} />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{shipment.pickup_address}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-eth-green" />
                <span className="truncate">{shipment.delivery_address}</span>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {shipment.num_bags} bag{shipment.num_bags !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <Weight className="h-3 w-3" />
                {shipment.total_weight_lbs} lbs
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(shipment.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: price + link */}
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-xs text-gray-400">Estimated</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(shipment.estimated_price_usd)}
            </p>
          </div>
          <Link
            to="/dashboard/shipments/$id"
            params={{ id: String(shipment.id) }}
            className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors"
          >
            Details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Card>
  )
}
