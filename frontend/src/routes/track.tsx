import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Search, Package2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { ShipmentStatusBadge } from '@/components/shipment/ShipmentStatusBadge'
import { TrackingTimeline } from '@/components/shipment/TrackingTimeline'
import { Navbar } from '@/components/layout/Navbar'
import { useTrackShipment } from '@/hooks/useShipments'
import { formatDate, formatCurrency, formatAddress } from '@/lib/utils'

export const Route = createFileRoute('/track')({
  component: TrackPage,
})

function TrackPage() {
  const [input, setInput] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')

  const { data: shipment, isLoading, isError, error } = useTrackShipment(trackingNumber)

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault()
    const val = input.trim().toUpperCase()
    if (val) setTrackingNumber(val)
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-r from-brand-800 to-brand-700 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Package2 className="mx-auto mb-4 h-12 w-12 text-white/80" />
          <h1 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
            Track Your Shipment
          </h1>
          <p className="mb-8 text-brand-200">
            Enter your tracking number to see real-time updates on your luggage.
          </p>

          <form onSubmit={handleTrack} className="mx-auto flex max-w-lg gap-2">
            <div className="flex-1">
              <input
                type="text"
                placeholder="e.g. LL-2025-001234"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="block w-full rounded-lg border-0 px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <Button type="submit" size="lg" className="shrink-0" loading={isLoading}>
              <Search className="h-4 w-4" />
              Track
            </Button>
          </form>
        </div>
      </div>

      {/* Result */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
            <p className="text-sm">Looking up tracking number…</p>
          </div>
        )}

        {/* Error / not found */}
        {isError && trackingNumber && !isLoading && (
          <Card className="border-red-100 bg-red-50 text-center py-12">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <h2 className="text-lg font-semibold text-red-800">Shipment Not Found</h2>
            <p className="mt-1 text-sm text-red-600">
              No shipment found with tracking number{' '}
              <span className="font-mono font-bold">{trackingNumber}</span>.
              Please check the number and try again.
            </p>
          </Card>
        )}

        {/* Shipment found */}
        {shipment && !isLoading && (
          <div className="space-y-6 animate-slide-up">
            {/* Header */}
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    Tracking Number
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold text-brand-800">
                    {shipment.tracking_number}
                  </p>
                  <div className="mt-2">
                    <ShipmentStatusBadge status={shipment.status} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Booked</p>
                  <p className="font-medium text-gray-700">{formatDate(shipment.created_at)}</p>
                  {shipment.estimated_price_usd && (
                    <>
                      <p className="mt-2 text-xs text-gray-400">Estimated Price</p>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(shipment.estimated_price_usd)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Route */}
              <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    From (US)
                  </p>
                  <p className="mt-1 text-gray-800">
                    {typeof shipment.pickup_address === 'string'
                      ? shipment.pickup_address
                      : formatAddress(shipment.pickup_address)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                    To (Ethiopia)
                  </p>
                  <p className="mt-1 text-gray-800">
                    {typeof shipment.delivery_address === 'string'
                      ? shipment.delivery_address
                      : formatAddress(shipment.delivery_address)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Bags</p>
                  <p className="font-medium">{shipment.num_bags}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Weight</p>
                  <p className="font-medium">{shipment.total_weight_lbs} lbs</p>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card>
              <h2 className="mb-4 text-base font-semibold text-gray-900">Tracking History</h2>
              <TrackingTimeline
                events={shipment.tracking_events ?? []}
                currentStatus={shipment.status}
              />
            </Card>
          </div>
        )}

        {/* Empty state (nothing searched yet) */}
        {!shipment && !isLoading && !isError && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Package2 className="mb-4 h-14 w-14" />
            <p className="text-base font-medium">Enter a tracking number above</p>
            <p className="text-sm">Your tracking number was emailed to you when you booked.</p>
          </div>
        )}
      </div>
    </div>
  )
}
