import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ArrowLeft,
  Package,
  MapPin,
  Calendar,
  Weight,
  DollarSign,
  FileText,
  User,
  Plus,
  Save,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/Layout'
import { Card } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ShipmentStatusBadge } from '@/components/shipment/ShipmentStatusBadge'
import { TrackingTimeline } from '@/components/shipment/TrackingTimeline'
import { useAdminShipment, useUpdateShipment, useAddTrackingEvent } from '@/hooks/useShipments'
import { formatDate, formatDateTime, formatCurrency, formatAddress, STATUS_LABELS } from '@/lib/utils'
import { getToken } from '@/lib/api'
import type { ShipmentStatus, AddTrackingEventRequest } from '@/types'

export const Route = createFileRoute('/admin/shipments/$id')({
  beforeLoad: () => {
    if (!getToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: AdminShipmentDetailPage,
})

const ALL_STATUSES: ShipmentStatus[] = [
  'PENDING','CONFIRMED','PICKED_UP','IN_TRANSIT_US','CUSTOMS_CLEARANCE',
  'IN_TRANSIT_ET','ARRIVED_ETHIOPIA','OUT_FOR_DELIVERY','DELIVERED','CANCELLED',
]

function AdminShipmentDetailPage() {
  const { id } = Route.useParams()

  const { data: shipment, isLoading, isError } = useAdminShipment(id)
  const updateMutation = useUpdateShipment(id)
  const addEventMutation = useAddTrackingEvent(id)

  // Status update state
  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | ''>('')
  const [actualPrice, setActualPrice] = useState('')

  // Add event modal state
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [eventForm, setEventForm] = useState<AddTrackingEventRequest>({
    status: 'PENDING',
    location: '',
    description: '',
  })

  const handleStatusUpdate = async () => {
    const updates: any = {}
    if (selectedStatus) updates.status = selectedStatus
    if (actualPrice) updates.actual_price_usd = parseFloat(actualPrice)
    if (Object.keys(updates).length > 0) {
      await updateMutation.mutateAsync(updates)
      setSelectedStatus('')
      setActualPrice('')
    }
  }

  const handleAddEvent = async () => {
    if (!eventForm.location || !eventForm.description) return
    await addEventMutation.mutateAsync(eventForm)
    setEventModalOpen(false)
    setEventForm({ status: 'PENDING', location: '', description: '' })
  }

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
          <Link to="/admin/shipments/" className="mt-4 inline-block text-sm text-brand-700 hover:underline">
            Back to Shipments
          </Link>
        </Card>
      </AppLayout>
    )
  }

  const pickupAddr =
    typeof shipment.pickup_address === 'string'
      ? shipment.pickup_address
      : formatAddress(shipment.pickup_address)

  const deliveryAddr =
    typeof shipment.delivery_address === 'string'
      ? shipment.delivery_address
      : formatAddress(shipment.delivery_address)

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back + header */}
        <div>
          <Link
            to="/admin/shipments/"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Shipments
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin: Shipment Detail</h1>
              <p className="mt-0.5 font-mono text-sm text-brand-700">
                #{shipment.tracking_number}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ShipmentStatusBadge status={shipment.status} />
              <Button
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEventForm((f) => ({ ...f, status: shipment.status }))
                  setEventModalOpen(true)
                }}
              >
                Add Event
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-4 lg:col-span-1">
            {/* Customer info */}
            {shipment.user && (
              <Card>
                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-gray-400">
                  <User className="h-3.5 w-3.5" />
                  Customer
                </h2>
                <p className="font-semibold text-gray-900">
                  {shipment.user.first_name} {shipment.user.last_name}
                </p>
                <p className="text-sm text-gray-500">{shipment.user.email}</p>
                <p className="text-sm text-gray-500">{shipment.user.phone}</p>
              </Card>
            )}

            {/* Shipment details */}
            <Card>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
                Details
              </h2>
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <div>
                    <dt className="text-xs text-gray-400">Pickup (US)</dt>
                    <dd className="text-gray-800">{pickupAddr}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-eth-green" />
                  <div>
                    <dt className="text-xs text-gray-400">Delivery (Ethiopia)</dt>
                    <dd className="text-gray-800">{deliveryAddr}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-gray-400" />
                  <div>
                    <dt className="text-xs text-gray-400">Bags / Weight</dt>
                    <dd className="text-gray-800">
                      {shipment.num_bags} bags / {shipment.total_weight_lbs} lbs
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <dt className="text-xs text-gray-400">Created</dt>
                    <dd className="text-gray-800">{formatDateTime(shipment.created_at)}</dd>
                  </div>
                </div>
                {shipment.pickup_scheduled_at && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-brand-500" />
                    <div>
                      <dt className="text-xs text-gray-400">Pickup Scheduled</dt>
                      <dd className="text-gray-800">{formatDateTime(shipment.pickup_scheduled_at)}</dd>
                    </div>
                  </div>
                )}
                {shipment.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-gray-400" />
                    <div>
                      <dt className="text-xs text-gray-400">Notes</dt>
                      <dd className="text-gray-800 text-xs leading-relaxed">{shipment.notes}</dd>
                    </div>
                  </div>
                )}
              </dl>
            </Card>

            {/* Admin controls: status + pricing */}
            <Card className="border-amber-100 bg-amber-50">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-700">
                Admin Controls
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-amber-800 mb-1.5">
                    Update Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as ShipmentStatus)}
                    className="block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  >
                    <option value="">— Keep current —</option>
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s} disabled={s === shipment.status}>
                        {STATUS_LABELS[s]}{s === shipment.status ? ' (current)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-amber-800 mb-1.5">
                    Set Actual Price (USD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder={
                      shipment.actual_price_usd !== null
                        ? String(shipment.actual_price_usd)
                        : 'Enter amount'
                    }
                    value={actualPrice}
                    onChange={(e) => setActualPrice(e.target.value)}
                    className="block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>

                <div className="border-t border-amber-100 pt-2">
                  <dl className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <dt className="text-amber-700">Estimated</dt>
                      <dd className="font-medium">{formatCurrency(shipment.estimated_price_usd)}</dd>
                    </div>
                    {shipment.actual_price_usd !== null && (
                      <div className="flex justify-between">
                        <dt className="text-amber-700">Actual (set)</dt>
                        <dd className="font-bold">{formatCurrency(shipment.actual_price_usd)}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleStatusUpdate}
                  loading={updateMutation.isPending}
                  disabled={!selectedStatus && !actualPrice}
                  leftIcon={<Save className="h-3.5 w-3.5" />}
                >
                  Save Changes
                </Button>
              </div>
            </Card>
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

      {/* Add Tracking Event Modal */}
      <Modal
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title="Add Tracking Event"
        description="Add a new update to the shipment's tracking history."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select
              value={eventForm.status}
              onChange={(e) =>
                setEventForm((f) => ({ ...f, status: e.target.value as ShipmentStatus }))
              }
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Location"
            placeholder="e.g. JFK Airport, New York"
            value={eventForm.location}
            onChange={(e) => setEventForm((f) => ({ ...f, location: e.target.value }))}
          />

          <Textarea
            label="Description"
            placeholder="e.g. Package has been received at the facility..."
            rows={3}
            value={eventForm.description}
            onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEventModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddEvent}
              loading={addEventMutation.isPending}
              disabled={!eventForm.location || !eventForm.description}
            >
              Add Event
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
