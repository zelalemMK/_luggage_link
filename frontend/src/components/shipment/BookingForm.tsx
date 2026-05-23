import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight, ChevronLeft, Package, Plane, DollarSign, CheckCircle2 } from 'lucide-react'
import { Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useCreateShipment, usePricingEstimate } from '@/hooks/useShipments'
import { formatCurrency } from '@/lib/utils'
import type { CreateShipmentRequest } from '@/types'

interface Airport {
  code: string
  name: string
  city: string
}

const US_AIRPORTS: Airport[] = [
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York, NY' },
  { code: 'EWR', name: 'Newark Liberty International', city: 'Newark, NJ' },
  { code: 'IAD', name: 'Washington Dulles International', city: 'Washington, DC' },
  { code: 'DCA', name: 'Ronald Reagan Washington National', city: 'Arlington, VA' },
  { code: 'BOS', name: 'Logan International', city: 'Boston, MA' },
  { code: 'ATL', name: 'Hartsfield-Jackson Atlanta International', city: 'Atlanta, GA' },
  { code: 'ORD', name: "O'Hare International", city: 'Chicago, IL' },
  { code: 'MDW', name: 'Midway International', city: 'Chicago, IL' },
  { code: 'MSP', name: 'Minneapolis-Saint Paul International', city: 'Minneapolis, MN' },
  { code: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas, TX' },
  { code: 'IAH', name: 'George Bush Intercontinental', city: 'Houston, TX' },
  { code: 'MIA', name: 'Miami International', city: 'Miami, FL' },
  { code: 'DEN', name: 'Denver International', city: 'Denver, CO' },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles, CA' },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco, CA' },
  { code: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle, WA' },
]

const ET_AIRPORTS: Airport[] = [
  { code: 'ADD', name: 'Addis Ababa Bole International', city: 'Addis Ababa' },
  { code: 'DIR', name: 'Dire Dawa International', city: 'Dire Dawa' },
  { code: 'BJR', name: 'Bahir Dar Airport', city: 'Bahir Dar' },
  { code: 'GDQ', name: 'Gondar Airport', city: 'Gondar' },
  { code: 'MQX', name: 'Mekele Airport', city: 'Mekele' },
  { code: 'JIM', name: 'Jimma Airport', city: 'Jimma' },
  { code: 'AWA', name: 'Awassa Airport', city: 'Awassa' },
]

function airportLabel(a: Airport) {
  return `${a.code} — ${a.name}, ${a.city}`
}

const STEPS = [
  { id: 1, label: 'Route', icon: Plane },
  { id: 2, label: 'Luggage', icon: Package },
  { id: 3, label: 'Confirm', icon: DollarSign },
]

export function BookingForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  const [departureCode, setDepartureCode] = useState('')
  const [arrivalCode, setArrivalCode] = useState('ADD')
  const [routeErrors, setRouteErrors] = useState<{ departure?: string; arrival?: string }>({})

  const [numBags, setNumBags] = useState(1)
  const [weightLbs, setWeightLbs] = useState(50)
  const [dropOffDate, setDropOffDate] = useState('')
  const [notes, setNotes] = useState('')

  const { mutateAsync: createShipment, isPending } = useCreateShipment()

  const departureAirport = US_AIRPORTS.find((a) => a.code === departureCode)
  const arrivalAirport = ET_AIRPORTS.find((a) => a.code === arrivalCode)

  const { data: pricing, isLoading: pricingLoading } = usePricingEstimate(
    step === 3 && numBags > 0 && weightLbs > 0
      ? { num_bags: numBags, total_weight_lbs: weightLbs }
      : null
  )

  const validateRoute = () => {
    const errors: typeof routeErrors = {}
    if (!departureCode) errors.departure = 'Select a departure airport'
    if (!arrivalCode) errors.arrival = 'Select an arrival airport'
    setRouteErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!departureAirport || !arrivalAirport) return
    const payload: CreateShipmentRequest = {
      departure_airport: airportLabel(departureAirport),
      arrival_airport: airportLabel(arrivalAirport),
      num_bags: numBags,
      total_weight_lbs: weightLbs,
      notes: notes || undefined,
      drop_off_date: dropOffDate ? `${dropOffDate}T00:00:00Z` : undefined,
    }
    try {
      const shipment = await createShipment(payload)
      navigate({ to: '/dashboard/shipments/$id', params: { id: String(shipment.id) } })
    } catch {
      // error handled in hook
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <nav className="mb-8 flex items-center justify-center">
        {STEPS.map((s, idx) => {
          const Icon = s.icon
          const done = step > s.id
          const active = step === s.id
          return (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors
                    ${done ? 'border-brand-700 bg-brand-700 text-white' : ''}
                    ${active ? 'border-brand-700 bg-white text-brand-700' : ''}
                    ${!done && !active ? 'border-gray-200 bg-white text-gray-400' : ''}
                  `}
                >
                  {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className={`mt-1 text-xs font-medium ${active ? 'text-brand-700' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`mx-3 mb-4 h-0.5 w-16 sm:w-24 ${done ? 'bg-brand-700' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </nav>

      {/* ─── Step 1: Route ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Plane className="h-5 w-5 text-brand-700" />
              Select Route
            </h2>

            <div className="space-y-5">
              {/* Departure */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Departure Airport <span className="text-gray-400 font-normal">(United States)</span>
                </label>
                <select
                  value={departureCode}
                  onChange={(e) => { setDepartureCode(e.target.value); setRouteErrors((r) => ({ ...r, departure: undefined })) }}
                  className={`block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors
                    ${routeErrors.departure
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                      : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500/20'
                    }`}
                >
                  <option value="">— Select US airport —</option>
                  {US_AIRPORTS.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} — {a.name}, {a.city}
                    </option>
                  ))}
                </select>
                {routeErrors.departure && (
                  <p className="mt-1 text-xs text-red-500">{routeErrors.departure}</p>
                )}
              </div>

              {/* Visual arrow */}
              <div className="flex items-center justify-center gap-3 text-gray-400">
                <div className="h-px flex-1 bg-gray-200" />
                <div className="flex items-center gap-1.5 text-xs font-medium text-brand-600">
                  <Plane className="h-4 w-4" />
                  to Ethiopia
                </div>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {/* Arrival */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Arrival Airport <span className="text-gray-400 font-normal">(Ethiopia)</span>
                </label>
                <select
                  value={arrivalCode}
                  onChange={(e) => { setArrivalCode(e.target.value); setRouteErrors((r) => ({ ...r, arrival: undefined })) }}
                  className={`block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors
                    ${routeErrors.arrival
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                      : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500/20'
                    }`}
                >
                  <option value="">— Select Ethiopian airport —</option>
                  {ET_AIRPORTS.map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} — {a.name}, {a.city}
                    </option>
                  ))}
                </select>
                {routeErrors.arrival && (
                  <p className="mt-1 text-xs text-red-500">{routeErrors.arrival}</p>
                )}
              </div>
            </div>

            {departureAirport && arrivalAirport && (
              <div className="mt-5 rounded-lg bg-brand-50 border border-brand-100 px-4 py-3 text-sm">
                <p className="font-medium text-brand-900">
                  {departureAirport.code} → {arrivalAirport.code}
                </p>
                <p className="text-brand-700 text-xs mt-0.5">
                  {departureAirport.city} to {arrivalAirport.city}
                </p>
              </div>
            )}
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => { if (validateRoute()) setStep(2) }}
              rightIcon={<ChevronRight className="h-4 w-4" />}
            >
              Next: Luggage Details
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step 2: Luggage Details ──────────────────────────────────────── */}
      {step === 2 && (
        <div className="animate-fade-in">
          <Card>
            <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-gray-900">
              <Package className="h-5 w-5 text-brand-700" />
              Luggage Details
            </h2>
            <div className="grid gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Number of Bags
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={numBags}
                    onChange={(e) => setNumBags(Number(e.target.value))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Max 20 bags per booking</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Total Weight (lbs)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={0.1}
                    value={weightLbs}
                    onChange={(e) => setWeightLbs(Number(e.target.value))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Intended Drop-off Date <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="date"
                  value={dropOffDate}
                  onChange={(e) => setDropOffDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The date you plan to drop your bags at the departure airport.
                </p>
              </div>

              <Textarea
                label="Notes (optional)"
                placeholder="Any special handling instructions, fragile items, etc."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </Card>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} leftIcon={<ChevronLeft className="h-4 w-4" />}>
              Back
            </Button>
            <Button onClick={() => setStep(3)} rightIcon={<ChevronRight className="h-4 w-4" />}>
              Next: Review & Confirm
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Review & Confirm ──────────────────────────────────────── */}
      {step === 3 && departureAirport && arrivalAirport && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Booking Summary</h2>
            <dl className="grid gap-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-gray-500">From</dt>
                <dd className="text-right font-medium text-gray-900">
                  {departureAirport.code} — {departureAirport.name}<br />
                  <span className="text-xs font-normal text-gray-500">{departureAirport.city}</span>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-gray-500">To</dt>
                <dd className="text-right font-medium text-gray-900">
                  {arrivalAirport.code} — {arrivalAirport.name}<br />
                  <span className="text-xs font-normal text-gray-500">{arrivalAirport.city}</span>
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <dt className="text-gray-500">Bags</dt>
                <dd className="font-medium text-gray-900">{numBags}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Total Weight</dt>
                <dd className="font-medium text-gray-900">{weightLbs} lbs</dd>
              </div>
              {dropOffDate && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Drop-off Date</dt>
                  <dd className="font-medium text-gray-900">{dropOffDate}</dd>
                </div>
              )}
              {notes && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Notes</dt>
                  <dd className="text-right font-medium text-gray-900 max-w-xs">{notes}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card className="border-brand-200 bg-brand-50">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-brand-900">
              <DollarSign className="h-5 w-5" />
              Pricing Estimate
            </h2>
            {pricingLoading ? (
              <div className="flex items-center gap-2 text-brand-700">
                <Spinner size="sm" />
                <span className="text-sm">Calculating…</span>
              </div>
            ) : pricing ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-brand-700">Base Rate</dt>
                  <dd className="font-medium text-brand-900">{formatCurrency(pricing.breakdown.base_rate)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-brand-700">Weight Charge</dt>
                  <dd className="font-medium text-brand-900">{formatCurrency(pricing.breakdown.weight_charge)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-brand-700">Bag Charge</dt>
                  <dd className="font-medium text-brand-900">{formatCurrency(pricing.breakdown.bag_charge)}</dd>
                </div>
                <div className="flex justify-between border-t border-brand-200 pt-2 text-base font-bold">
                  <dt className="text-brand-900">Estimated Total</dt>
                  <dd className="text-brand-900">{formatCurrency(pricing.estimated_price_usd)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-brand-700">
                Could not load pricing estimate. You can still submit — our team will confirm pricing.
              </p>
            )}
            <p className="mt-3 text-xs text-brand-600">
              * Final price confirmed after bag check-in based on actual weight.
            </p>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)} leftIcon={<ChevronLeft className="h-4 w-4" />}>
              Back
            </Button>
            <Button onClick={handleSubmit} loading={isPending} size="lg">
              Book Shipment
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
