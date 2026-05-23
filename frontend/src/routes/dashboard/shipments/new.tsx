import { createFileRoute, redirect } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/Layout'
import { BookingForm } from '@/components/shipment/BookingForm'
import { getToken } from '@/lib/api'

export const Route = createFileRoute('/dashboard/shipments/new')({
  beforeLoad: () => {
    if (!getToken()) {
      throw redirect({ to: '/login' })
    }
  },
  component: NewShipmentPage,
})

function NewShipmentPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link
            to="/dashboard/"
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Book a Shipment</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill out the form below to arrange door-to-door luggage shipping from the US to Ethiopia.
          </p>
        </div>

        <BookingForm />
      </div>
    </AppLayout>
  )
}
