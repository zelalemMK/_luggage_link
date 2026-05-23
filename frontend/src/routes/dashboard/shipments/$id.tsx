import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Package,
  Plane,
  Calendar,
  Weight,
  DollarSign,
  FileText,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { ShipmentStatusBadge } from '@/components/shipment/ShipmentStatusBadge'
import { TrackingTimeline } from '@/components/shipment/TrackingTimeline'
import { useShipment } from '@/hooks/useShipments'
import { formatDate, formatCurrency } from '@/lib/utils'
import { getToken } from '@/lib/api'

export const Route = createFileRoute('/dashboard/shipments/$id')({
  beforeLoad: () => {
    if (!getToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: ShipmentDetailPage,
})

function ShipmentDetailPage() {
  const { id } = Route.useParams()
  const { data: shipment, isLoading, isError } = useShipment(id)

  if (isLoading) {
    return (
      <AppLayout>
        <PageSpinner />
      </AppLayout>
    )
  }

  if (isError || !shipment) {
    return (
      <AppLayout>
        <Card className="py-16 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-700">Shipment not found</h2>
          <Link to="/dashboard/" className="mt-4 inline-block text-sm text-brand-700 hover:underline">
            Back to Dashboard
          </Link>
        </Card>
      </AppLayout>
    )
  }


  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back + header */}
        <div>
          <Link
            to="/dashboard/"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Shipment Details
              </h1>
              <p className="mt-1 font-mono text-sm text-brand-700">
                #{shipment.tracking_number}
              </p>
            </div>
            <ShipmentStatusBadge status={shipment.status} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: details */}
          <div className="space-y-4 lg:col-span-1">
            <Card>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Shipment Info
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Plane className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <div>
                    <dt className="text-xs text-gray-400">Departure Airport (US)</dt>
                    <dd className="mt-0.5 text-gray-800">{shipment.pickup_address}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Plane className="mt-0.5 h-4 w-4 shrink-0 text-eth-green" style={{ transform: 'scaleX(-1)' }} />
                  <div>
                    <dt className="text-xs text-gray-400">Arrival Airport (Ethiopia)</dt>
                    <dd className="mt-0.5 text-gray-800">{shipment.delivery_address}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-gray-400" />
                  <div>
                    <dt className="text-xs text-gray-400">Bags</dt>
                    <dd className="text-gray-800">{shipment.num_bags}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Weight className="h-4 w-4 text-gray-400" />
                  <div>
                    <dt className="text-xs text-gray-400">Weight</dt>
                    <dd className="text-gray-800">{shipment.total_weight_lbs} lbs</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <dt className="text-xs text-gray-400">Booked</dt>
                    <dd className="text-gray-800">{formatDate(shipment.created_at)}</dd>
                  </div>
                </div>
                {shipment.pickup_scheduled_at && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-brand-500" />
                    <div>
                      <dt className="text-xs text-gray-400">Intended Drop-off Date</dt>
                      <dd className="text-gray-800">{formatDate(shipment.pickup_scheduled_at)}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </Card>

            {/* Pricing */}
            <Card className="border-brand-100 bg-brand-50">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-600">
                Pricing
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-1.5 text-brand-700">
                    <DollarSign className="h-3.5 w-3.5" />
                    Estimated
                  </dt>
                  <dd className="font-semibold text-brand-900">
                    {formatCurrency(shipment.estimated_price_usd)}
                  </dd>
                </div>
                {shipment.actual_price_usd !== null && (
                  <div className="flex items-center justify-between border-t border-brand-100 pt-2">
                    <dt className="text-brand-700">Actual (Confirmed)</dt>
                    <dd className="font-bold text-brand-900">
                      {formatCurrency(shipment.actual_price_usd)}
                    </dd>
                  </div>
                )}
              </dl>
            </Card>

            {/* Notes */}
            {shipment.notes && (
              <Card>
                <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  <FileText className="h-3.5 w-3.5" />
                  Notes
                </h2>
                <p className="text-sm text-gray-700 leading-relaxed">{shipment.notes}</p>
              </Card>
            )}
          </div>

          {/* Right: timeline */}
          <div className="lg:col-span-2">
            <Card>
              <h2 className="mb-4 text-base font-semibold text-gray-900">
                Tracking Timeline
              </h2>
              <TrackingTimeline
                events={shipment.tracking_events ?? []}
                currentStatus={shipment.status}
              />
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
