import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Plus, Package, Truck, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { ShipmentCard } from '@/components/shipment/ShipmentCard'
import { AppLayout } from '@/components/layout/Layout'
import { useAuth } from '@/hooks/useAuth'
import { useMyShipments } from '@/hooks/useShipments'
import { getToken } from '@/lib/api'

export const Route = createFileRoute('/dashboard/')({
  beforeLoad: () => {
    if (!getToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading } = useMyShipments({ per_page: 50 })
  const shipments = data?.data ?? []

  const stats = {
    total: shipments.length,
    inTransit: shipments.filter((s) =>
      ['PICKED_UP', 'IN_TRANSIT_US', 'CUSTOMS_CLEARANCE', 'IN_TRANSIT_ET', 'ARRIVED_ETHIOPIA', 'OUT_FOR_DELIVERY'].includes(s.status)
    ).length,
    delivered: shipments.filter((s) => s.status === 'DELIVERED').length,
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.first_name}!
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and track all your shipments.
            </p>
          </div>
          <Link to="/dashboard/shipments/new">
            <Button leftIcon={<Plus className="h-4 w-4" />} size="md">
              Book Shipment
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card padding="sm" className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <Package className="h-5 w-5 text-brand-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Shipments</p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
              <Truck className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.inTransit}</p>
              <p className="text-xs text-gray-500">In Transit</p>
            </div>
          </Card>
          <Card padding="sm" className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
              <p className="text-xs text-gray-500">Delivered</p>
            </div>
          </Card>
        </div>

        {/* Shipments list */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Your Shipments</h2>
          </div>

          {isLoading ? (
            <PageSpinner />
          ) : shipments.length === 0 ? (
            <Card className="py-16 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <h3 className="text-base font-semibold text-gray-700">No shipments yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Book your first shipment to get started.
              </p>
              <Link to="/dashboard/shipments/new" className="mt-4 inline-block">
                <Button leftIcon={<Plus className="h-4 w-4" />} size="sm">
                  Book Shipment
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {shipments.map((s) => (
                <ShipmentCard key={s.id} shipment={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
