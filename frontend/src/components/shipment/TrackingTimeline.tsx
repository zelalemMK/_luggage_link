import { CheckCircle2, Circle, MapPin, Clock } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/utils'
import type { TrackingEvent, ShipmentStatus } from '@/types'
import { cn } from '@/lib/utils'

// Full ordered list of statuses for the progress indicator
const STATUS_ORDER: ShipmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PICKED_UP',
  'IN_TRANSIT_US',
  'CUSTOMS_CLEARANCE',
  'IN_TRANSIT_ET',
  'ARRIVED_ETHIOPIA',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

interface TrackingTimelineProps {
  events: TrackingEvent[]
  currentStatus: ShipmentStatus
}

export function TrackingTimeline({ events, currentStatus }: TrackingTimelineProps) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const currentIdx = STATUS_ORDER.indexOf(currentStatus)

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      {currentStatus !== 'CANCELLED' && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Shipment Progress
          </p>
          <div className="flex items-center gap-0">
            {STATUS_ORDER.map((status, idx) => {
              const done = idx < currentIdx
              const active = idx === currentIdx
              return (
                <div key={status} className="flex flex-1 items-center">
                  <div
                    className={cn(
                      'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      done && 'bg-brand-700 text-white',
                      active && 'bg-brand-700 text-white ring-4 ring-brand-200',
                      !done && !active && 'bg-gray-200 text-gray-400'
                    )}
                    title={STATUS_LABELS[status]}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  {idx < STATUS_ORDER.length - 1 && (
                    <div
                      className={cn(
                        'h-1 flex-1',
                        idx < currentIdx ? 'bg-brand-700' : 'bg-gray-200'
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-xs text-gray-500">Pending</span>
            <span className="text-xs font-medium text-brand-700">
              {STATUS_LABELS[currentStatus]}
            </span>
            <span className="text-xs text-gray-500">Delivered</span>
          </div>
        </div>
      )}

      {/* Events list */}
      {sortedEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-12 text-gray-400">
          <Clock className="mb-2 h-8 w-8" />
          <p className="text-sm">No tracking events yet.</p>
        </div>
      ) : (
        <ol className="relative border-l-2 border-gray-200 pl-6 space-y-6">
          {sortedEvents.map((event, idx) => (
            <li key={event.id} className="relative">
              {/* Timeline dot */}
              <div
                className={cn(
                  'absolute -left-[1.65rem] flex h-5 w-5 items-center justify-center rounded-full border-2',
                  idx === 0
                    ? 'border-brand-700 bg-brand-700 text-white'
                    : 'border-gray-300 bg-white'
                )}
              >
                {idx === 0 ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Circle className="h-2.5 w-2.5 text-gray-300" />
                )}
              </div>

              <div
                className={cn(
                  'rounded-lg border p-4',
                  idx === 0
                    ? 'border-brand-200 bg-brand-50'
                    : 'border-gray-100 bg-white'
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p
                      className={cn(
                        'font-semibold',
                        idx === 0 ? 'text-brand-800' : 'text-gray-800'
                      )}
                    >
                      {STATUS_LABELS[event.status]}
                    </p>
                    {event.description && (
                      <p className="mt-1 text-sm text-gray-600">{event.description}</p>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-gray-400">
                    {formatDateTime(event.created_at)}
                  </time>
                </div>
                {event.location && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
