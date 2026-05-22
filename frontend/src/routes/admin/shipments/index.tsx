import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { Search, Filter } from 'lucide-react'
import { AppLayout } from '@/components/layout/Layout'
import { ShipmentTable } from '@/components/admin/ShipmentTable'
import { Card } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'
import { useAdminShipments } from '@/hooks/useShipments'
import { getToken } from '@/lib/api'
import type { ShipmentStatus } from '@/types'
import { STATUS_LABELS } from '@/lib/utils'

export const Route = createFileRoute('/admin/shipments/')({
  beforeLoad: () => {
    if (!getToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: AdminShipmentsPage,
})

const STATUS_OPTIONS: { value: ShipmentStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: STATUS_LABELS.PENDING },
  { value: 'CONFIRMED', label: STATUS_LABELS.CONFIRMED },
  { value: 'PICKED_UP', label: STATUS_LABELS.PICKED_UP },
  { value: 'IN_TRANSIT_US', label: STATUS_LABELS.IN_TRANSIT_US },
  { value: 'CUSTOMS_CLEARANCE', label: STATUS_LABELS.CUSTOMS_CLEARANCE },
  { value: 'IN_TRANSIT_ET', label: STATUS_LABELS.IN_TRANSIT_ET },
  { value: 'ARRIVED_ETHIOPIA', label: STATUS_LABELS.ARRIVED_ETHIOPIA },
  { value: 'OUT_FOR_DELIVERY', label: STATUS_LABELS.OUT_FOR_DELIVERY },
  { value: 'DELIVERED', label: STATUS_LABELS.DELIVERED },
  { value: 'CANCELLED', label: STATUS_LABELS.CANCELLED },
]

function AdminShipmentsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ShipmentStatus | ''>('')
  const [page, setPage] = useState(1)
  const PER_PAGE = 20

  const { data, isLoading } = useAdminShipments({
    page,
    per_page: PER_PAGE,
    status: status || undefined,
    search: search || undefined,
  })

  const shipments = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PER_PAGE)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Shipments</h1>
          <p className="mt-1 text-sm text-gray-500">
            {total > 0 ? `${total} total shipments` : 'No shipments found'}
          </p>
        </div>

        {/* Filters */}
        <Card padding="sm">
          <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or tracking #"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Status filter */}
            <div className="min-w-44">
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value as ShipmentStatus | ''); setPage(1) }}
                className="block w-full rounded-lg border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
              Apply
            </Button>
            {(search || status) && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setSearch(''); setStatus(''); setPage(1) }}
              >
                Clear
              </Button>
            )}
          </form>
        </Card>

        {/* Table */}
        {isLoading ? (
          <PageSpinner />
        ) : (
          <ShipmentTable shipments={shipments} linkBase="admin" />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
