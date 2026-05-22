import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ChevronRight, ChevronLeft, Package, MapPin, DollarSign, CheckCircle2 } from 'lucide-react'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useCreateShipment, usePricingEstimate } from '@/hooks/useShipments'
import { formatCurrency } from '@/lib/utils'
import type { CreateShipmentRequest } from '@/types'

interface AddressFields {
  street: string
  city: string
  state: string
  zip: string
}

interface LuggageFields {
  num_bags: number
  total_weight_lbs: number
  notes: string
  pickup_scheduled_at: string
}

const STEPS = [
  { id: 1, label: 'Pickup Address', icon: MapPin },
  { id: 2, label: 'Luggage Details', icon: Package },
  { id: 3, label: 'Confirm & Pay', icon: DollarSign },
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

export function BookingForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  const [pickup, setPickup] = useState<AddressFields>({
    street: '',
    city: '',
    state: '',
    zip: '',
  })

  const [delivery, setDelivery] = useState<AddressFields>({
    street: '',
    city: '',
    state: '',
    zip: '',
  })

  const [luggage, setLuggage] = useState<LuggageFields>({
    num_bags: 1,
    total_weight_lbs: 50,
    notes: '',
    pickup_scheduled_at: '',
  })

  const [pickupErrors, setPickupErrors] = useState<Partial<AddressFields>>({})
  const [deliveryErrors, setDeliveryErrors] = useState<Partial<AddressFields>>({})

  const { mutateAsync: createShipment, isPending } = useCreateShipment()

  // Live pricing estimate
  const { data: pricing, isLoading: pricingLoading } = usePricingEstimate(
    step === 3 && luggage.num_bags > 0 && luggage.total_weight_lbs > 0
      ? { num_bags: luggage.num_bags, total_weight_lbs: luggage.total_weight_lbs }
      : null
  )

  // ─── Step 1 validation ─────────────────────────────────────────────────────
  const validatePickup = () => {
    const errors: Partial<AddressFields> = {}
    if (!pickup.street.trim()) errors.street = 'Street is required'
    if (!pickup.city.trim()) errors.city = 'City is required'
    if (!pickup.state) errors.state = 'State is required'
    if (!pickup.zip.trim()) errors.zip = 'ZIP code is required'
    setPickupErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateDelivery = () => {
    const errors: Partial<AddressFields> = {}
    if (!delivery.street.trim()) errors.street = 'Street is required'
    if (!delivery.city.trim()) errors.city = 'City is required'
    setDeliveryErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleStep1Next = () => {
    if (validatePickup() && validateDelivery()) {
      setStep(2)
    }
  }

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const payload: CreateShipmentRequest = {
      pickup_address: pickup as any,
      delivery_address: delivery as any,
      num_bags: luggage.num_bags,
      total_weight_lbs: luggage.total_weight_lbs,
      notes: luggage.notes || undefined,
      pickup_scheduled_at: luggage.pickup_scheduled_at || undefined,
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
                <span
                  className={`mt-1 text-xs font-medium ${active ? 'text-brand-700' : 'text-gray-400'}`}
                >
                  {s.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`mx-3 mb-4 h-0.5 w-16 sm:w-24 ${done ? 'bg-brand-700' : 'bg-gray-200'}`}
                />
              )}
            </div>
          )
        })}
      </nav>

      {/* ─── Step 1: Addresses ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <MapPin className="h-5 w-5 text-brand-700" />
              Pickup Address (United States)
            </h2>
            <div className="grid gap-4">
              <Input
                label="Street Address"
                placeholder="123 Main St"
                value={pickup.street}
                onChange={(e) => setPickup((p) => ({ ...p, street: e.target.value }))}
                error={pickupErrors.street}
              />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-1">
                  <Input
                    label="City"
                    placeholder="Los Angeles"
                    value={pickup.city}
                    onChange={(e) => setPickup((p) => ({ ...p, city: e.target.value }))}
                    error={pickupErrors.city}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                  <select
                    value={pickup.state}
                    onChange={(e) => setPickup((p) => ({ ...p, state: e.target.value }))}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">State</option>
                    {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {pickupErrors.state && <p className="mt-1 text-xs text-red-500">{pickupErrors.state}</p>}
                </div>
                <div>
                  <Input
                    label="ZIP"
                    placeholder="90001"
                    value={pickup.zip}
                    onChange={(e) => setPickup((p) => ({ ...p, zip: e.target.value }))}
                    error={pickupErrors.zip}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
              <MapPin className="h-5 w-5 text-eth-green" />
              Delivery Address (Ethiopia)
            </h2>
            <div className="grid gap-4">
              <Input
                label="Street / Neighborhood"
                placeholder="Bole Road, Kebele 03"
                value={delivery.street}
                onChange={(e) => setDelivery((p) => ({ ...p, street: e.target.value }))}
                error={deliveryErrors.street}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  placeholder="Addis Ababa"
                  value={delivery.city}
                  onChange={(e) => setDelivery((p) => ({ ...p, city: e.target.value }))}
                  error={deliveryErrors.city}
                />
                <Input
                  label="Sub-city / Woreda (optional)"
                  placeholder="Bole"
                  value={delivery.state}
                  onChange={(e) => setDelivery((p) => ({ ...p, state: e.target.value }))}
                />
              </div>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleStep1Next} rightIcon={<ChevronRight className="h-4 w-4" />}>
              Next: Luggage Details
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step 2: Luggage Details ────────────────────────────────────────── */}
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
                    value={luggage.num_bags}
                    onChange={(e) =>
                      setLuggage((l) => ({ ...l, num_bags: Number(e.target.value) }))
                    }
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">Max 20 bags per shipment</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Total Weight (lbs)
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={0.1}
                    value={luggage.total_weight_lbs}
                    onChange={(e) =>
                      setLuggage((l) => ({ ...l, total_weight_lbs: Number(e.target.value) }))
                    }
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Preferred Pickup Date (optional)
                </label>
                <input
                  type="datetime-local"
                  value={luggage.pickup_scheduled_at}
                  onChange={(e) =>
                    setLuggage((l) => ({ ...l, pickup_scheduled_at: e.target.value }))
                  }
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <Textarea
                label="Notes (optional)"
                placeholder="Any special handling instructions, fragile items, etc."
                rows={3}
                value={luggage.notes}
                onChange={(e) => setLuggage((l) => ({ ...l, notes: e.target.value }))}
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

      {/* ─── Step 3: Review & Confirm ───────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary */}
          <Card>
            <h2 className="mb-4 text-base font-semibold text-gray-900">Shipment Summary</h2>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Pickup</dt>
                <dd className="text-right font-medium text-gray-900">
                  {pickup.street}, {pickup.city}, {pickup.state} {pickup.zip}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Delivery</dt>
                <dd className="text-right font-medium text-gray-900">
                  {delivery.street}, {delivery.city}{delivery.state ? `, ${delivery.state}` : ''}, Ethiopia
                </dd>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3">
                <dt className="text-gray-500">Bags</dt>
                <dd className="font-medium text-gray-900">{luggage.num_bags}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Total Weight</dt>
                <dd className="font-medium text-gray-900">{luggage.total_weight_lbs} lbs</dd>
              </div>
              {luggage.notes && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Notes</dt>
                  <dd className="text-right font-medium text-gray-900 max-w-xs">{luggage.notes}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Pricing */}
          <Card className="border-brand-200 bg-brand-50">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-brand-900">
              <DollarSign className="h-5 w-5" />
              Pricing Estimate
            </h2>
            {pricingLoading ? (
              <div className="flex items-center gap-2 text-brand-700">
                <Spinner size="sm" />
                <span className="text-sm">Calculating...</span>
              </div>
            ) : pricing ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-brand-700">Base Rate</dt>
                  <dd className="font-medium text-brand-900">
                    {formatCurrency(pricing.breakdown.base_rate)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-brand-700">Weight Charge</dt>
                  <dd className="font-medium text-brand-900">
                    {formatCurrency(pricing.breakdown.weight_charge)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-brand-700">Bag Charge</dt>
                  <dd className="font-medium text-brand-900">
                    {formatCurrency(pricing.breakdown.bag_charge)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-brand-200 pt-2 text-base font-bold">
                  <dt className="text-brand-900">Estimated Total</dt>
                  <dd className="text-brand-900">
                    {formatCurrency(pricing.estimated_price_usd)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-brand-700">
                Could not load pricing estimate. You can still submit — pricing will be confirmed by our team.
              </p>
            )}
            <p className="mt-3 text-xs text-brand-600">
              * Final price may vary based on actual weight at pickup. Payment collected upon confirmation.
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
