import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Package2,
  Shield,
  MapPin,
  TrendingDown,
  ArrowRight,
  Plane,
  Globe,
  Clock,
  CheckCircle,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { usePricingEstimate } from '@/hooks/useShipments'
import { formatCurrency } from '@/lib/utils'
import { Navbar } from '@/components/layout/Navbar'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

const FEATURES = [
  {
    icon: Shield,
    title: 'Secure Shipping',
    description:
      'Your luggage is fully insured and handled by trusted logistics partners across the US and Ethiopia.',
    color: 'text-brand-700',
    bg: 'bg-brand-50',
  },
  {
    icon: Globe,
    title: 'Real-time Tracking',
    description:
      'Track your shipment every step of the way — from pickup in the US to delivery at your doorstep in Ethiopia.',
    color: 'text-eth-green',
    bg: 'bg-green-50',
  },
  {
    icon: MapPin,
    title: 'Door-to-Door Delivery',
    description:
      'We pick up from your US address and deliver directly to any location in Ethiopia. No trips to the shipping office.',
    color: 'text-eth-red',
    bg: 'bg-red-50',
  },
  {
    icon: TrendingDown,
    title: 'Competitive Rates',
    description:
      'Transparent pricing with no hidden fees. Save up to 40% compared to airline overweight luggage charges.',
    color: 'text-eth-yellow',
    bg: 'bg-yellow-50',
  },
]

const STEPS = [
  {
    step: '01',
    title: 'Book Online',
    description: 'Create an account and book your shipment in minutes. Provide pickup and delivery details.',
  },
  {
    step: '02',
    title: 'We Pick Up',
    description: 'Our team picks up your luggage at your US address at the scheduled time.',
  },
  {
    step: '03',
    title: 'We Ship',
    description: 'Your luggage is carefully packed, customs-cleared, and transported to Ethiopia.',
  },
  {
    step: '04',
    title: 'Delivered',
    description: 'Your luggage arrives safely at the delivery address in Ethiopia — usually within 7–14 days.',
  },
]

function PricingCalculator() {
  const [bags, setBags] = useState(2)
  const [weight, setWeight] = useState(100)
  const [submitted, setSubmitted] = useState(false)

  const { data: pricing, isLoading } = usePricingEstimate(
    submitted ? { num_bags: bags, total_weight_lbs: weight } : null
  )

  return (
    <Card className="p-8 shadow-xl">
      <h3 className="mb-1 text-xl font-bold text-gray-900">Price Calculator</h3>
      <p className="mb-6 text-sm text-gray-500">Get an instant estimate for your shipment</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Number of Bags
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={bags}
            onChange={(e) => { setBags(Number(e.target.value)); setSubmitted(false) }}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Total Weight (lbs)
          </label>
          <input
            type="number"
            min={1}
            step={5}
            value={weight}
            onChange={(e) => { setWeight(Number(e.target.value)); setSubmitted(false) }}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      <Button
        className="mt-4 w-full"
        onClick={() => setSubmitted(true)}
        loading={isLoading}
      >
        Calculate Price
      </Button>

      {pricing && submitted && (
        <div className="mt-6 rounded-xl bg-brand-50 p-4 border border-brand-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-brand-700">Estimated Total</span>
            <span className="text-2xl font-bold text-brand-900">
              {formatCurrency(pricing.estimated_price_usd)}
            </span>
          </div>
          <div className="mt-3 space-y-1.5 border-t border-brand-100 pt-3">
            <div className="flex justify-between text-xs text-brand-600">
              <span>Base rate</span>
              <span>{formatCurrency(pricing.breakdown.base_rate)}</span>
            </div>
            <div className="flex justify-between text-xs text-brand-600">
              <span>Weight charge</span>
              <span>{formatCurrency(pricing.breakdown.weight_charge)}</span>
            </div>
            <div className="flex justify-between text-xs text-brand-600">
              <span>Bag charge</span>
              <span>{formatCurrency(pricing.breakdown.bag_charge)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-brand-500">
            * Final price confirmed at pickup based on actual weight.
          </p>
        </div>
      )}
    </Card>
  )
}

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 py-20 sm:py-32">
        {/* Background decoration */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-eth-green/10 blur-3xl" />
        </div>

        {/* Ethiopian flag accent bar */}
        <div className="absolute bottom-0 left-0 right-0 flex h-2">
          <div className="flex-1" style={{ backgroundColor: '#078930' }} />
          <div className="flex-1" style={{ backgroundColor: '#FCDD09' }} />
          <div className="flex-1" style={{ backgroundColor: '#DA121A' }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Text */}
            <div className="text-center lg:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/90 backdrop-blur-sm">
                <Plane className="h-4 w-4" />
                US → Ethiopia shipping specialists
              </div>
              <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Ship Your Luggage from the{' '}
                <span className="text-yellow-300">US</span> to{' '}
                <span style={{ color: '#34d399' }}>Ethiopia</span>
              </h1>
              <p className="mb-8 max-w-xl text-lg text-brand-200 lg:mx-0 mx-auto">
                Door-to-door luggage shipping with real-time tracking, full insurance, and competitive rates.
                Trusted by thousands of the Ethiopian diaspora community.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row lg:justify-start justify-center">
                <Link to="/register">
                  <Button size="lg" className="bg-white text-brand-800 hover:bg-gray-100 shadow-lg w-full sm:w-auto">
                    Start Shipping
                    <ArrowRight className="ml-1 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/track">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto"
                  >
                    <Search className="mr-1 h-4 w-4" />
                    Track a Package
                  </Button>
                </Link>
              </div>

              {/* Social proof */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 lg:justify-start">
                {[
                  { label: '10,000+', sub: 'Bags delivered' },
                  { label: '98%', sub: 'On-time delivery' },
                  { label: '4.9★', sub: 'Customer rating' },
                ].map(({ label, sub }) => (
                  <div key={sub} className="text-center">
                    <p className="text-2xl font-bold text-white">{label}</p>
                    <p className="text-xs text-brand-300">{sub}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing calculator */}
            <div className="mx-auto w-full max-w-md">
              <PricingCalculator />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
              Why choose Luggage Link?
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Everything you need to ship your luggage safely and affordably.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <Card key={f.title} className="hover:shadow-md transition-shadow">
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.bg}`}>
                    <Icon className={`h-6 w-6 ${f.color}`} />
                  </div>
                  <h3 className="mb-2 font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{f.description}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">How it works</h2>
            <p className="mt-4 text-lg text-gray-600">
              Four simple steps to get your luggage to Ethiopia.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, idx) => (
              <div key={step.step} className="relative text-center">
                {idx < STEPS.length - 1 && (
                  <div className="absolute left-1/2 top-6 hidden h-0.5 w-full translate-x-6 bg-brand-100 lg:block" />
                )}
                <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-white font-bold text-lg shadow-md">
                  {step.step}
                </div>
                <h3 className="mb-2 font-semibold text-gray-900">{step.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #078930 0%, #1e3a8a 50%, #DA121A 100%)',
          }}
        />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Package2 className="mx-auto mb-4 h-12 w-12 text-white/80" />
          <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
            Ready to ship your luggage?
          </h2>
          <p className="mb-8 text-lg text-white/80">
            Join thousands of Ethiopians in the diaspora who trust Luggage Link.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button size="lg" className="bg-white text-brand-800 hover:bg-gray-100 w-full sm:w-auto shadow-lg">
                Create Account — It's Free
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 w-full sm:w-auto">
                Already have an account? Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-brand-950 py-10 text-center text-sm text-brand-400">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-4 flex justify-center gap-2">
            <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: '#078930' }} />
            <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: '#FCDD09' }} />
            <div className="h-1.5 w-8 rounded-full" style={{ backgroundColor: '#DA121A' }} />
          </div>
          <p className="font-semibold text-white">Luggage Link</p>
          <p className="mt-1">Connecting the Ethiopian diaspora — one bag at a time.</p>
          <p className="mt-4">
            &copy; {new Date().getFullYear()} Luggage Link, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
