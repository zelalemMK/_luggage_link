import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
} from '@/components/ui/Table'
import { ShipmentStatusBadge } from '@/components/shipment/ShipmentStatusBadge'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Shipment } from '@/types'

interface ShipmentTableProps {
  shipments: Shipment[]
  linkBase?: 'admin' | 'dashboard'
}

export function ShipmentTable({ shipments, linkBase = 'admin' }: ShipmentTableProps) {
  if (shipments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
        No shipments found.
      </div>
    )
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableHeader>Tracking #</TableHeader>
          <TableHeader>Customer</TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader>Bags / Weight</TableHeader>
          <TableHeader>Est. Price</TableHeader>
          <TableHeader>Created</TableHeader>
          <TableHeader></TableHeader>
        </TableRow>
      </TableHead>
      <TableBody>
        {shipments.map((s) => (
          <TableRow key={s.id}>
            <TableCell>
              <span className="font-mono text-xs font-semibold text-brand-800">
                {s.tracking_number}
              </span>
            </TableCell>
            <TableCell>
              {s.user ? (
                <div>
                  <p className="font-medium text-gray-900">
                    {s.user.first_name} {s.user.last_name}
                  </p>
                  <p className="text-xs text-gray-400">{s.user.email}</p>
                </div>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </TableCell>
            <TableCell>
              <ShipmentStatusBadge status={s.status} />
            </TableCell>
            <TableCell>
              <span>{s.num_bags} bags</span>
              <span className="ml-1 text-gray-400">/ {s.total_weight_lbs} lbs</span>
            </TableCell>
            <TableCell>
              <span className="font-medium">{formatCurrency(s.estimated_price_usd)}</span>
              {s.actual_price_usd !== null && (
                <p className="text-xs text-gray-400">
                  Actual: {formatCurrency(s.actual_price_usd)}
                </p>
              )}
            </TableCell>
            <TableCell className="text-gray-400">{formatDate(s.created_at)}</TableCell>
            <TableCell>
              <Link
                to={linkBase === 'admin' ? '/admin/shipments/$id' : '/dashboard/shipments/$id'}
                params={{ id: String(s.id) }}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900 transition-colors"
              >
                View
                <ExternalLink className="h-3 w-3" />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
