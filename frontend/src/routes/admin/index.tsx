import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  DollarSign,
  ArrowRight,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/Layout'
import { StatsCard } from '@/components/admin/StatsCard'
import { ShipmentTable } from '@/components/admin/ShipmentTable'
import { PageSpinner } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { useAdminStats, useAdminShipments } from '@/hooks/useShipments'
import { formatCurrency } from '@/lib/utils'
import { getToken } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/admin/')({
  beforeLoad: ({ context }: any) => {
    if (!getToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: AdminDashboard,
})

function AdminDashboard() {
  const { user } = useAuth()
  const { data: stats, isLoading: statsLoading } = useAdminStats()
  const { data: recentData, isLoading: shipmentsLoading } = useAdminShipments({
    per_page: 10,
  })

  const recentShipments = recentData?.data ?? []

  if (statsLoading) {
    return (
      <AppLayout>
        <PageSpinner />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of all shipments and operations.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatsCard
            title="Total Shipments"
            value={stats?.total_shipments ?? 0}
            icon={Package}
            color="blue"
          />
          <StatsCard
            title="Pending"
            value={stats?.pending ?? 0}
            icon={Clock}
            color="yellow"
            subtitle="Awaiting confirmation"
          />
          <StatsCard
            title="In Transit"
            value={stats?.in_transit ?? 0}
            icon={Truck}
            color="orange"
            subtitle="Currently shipping"
          />
          <StatsCard
            title="Delivered"
            value={stats?.delivered ?? 0}
            icon={CheckCircle2}
            color="green"
          />
          <StatsCard
            title="Cancelled"
            value={stats?.cancelled ?? 0}
            icon={XCircle}
            color="red"
          />
          <StatsCard
            title="Total Revenue"
            value={formatCurrency(stats?.total_revenue_usd ?? 0)}
            icon={DollarSign}
            color="teal"
            subtitle="Actual confirmed revenue"
          />
        </div>

        {/* Recent shipments */}
        <Card padding="none">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Shipments</h2>
            <Link
              to="/admin/shipments"
              className="flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="p-4">
            {shipmentsLoading ? (
              <PageSpinner />
            ) : (
              <ShipmentTable shipments={recentShipments} />
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
