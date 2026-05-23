import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Package2, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { getToken } from '@/lib/api'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (getToken()) {
      throw redirect({ to: '/dashboard/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const { login, isLoggingIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const e: typeof errors = {}
    if (!email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email'
    if (!password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    login({ email, password })
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-20 h-80 w-80 rounded-full bg-brand-600/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-eth-green/10 blur-3xl" />
        </div>

        <Link to="/" className="relative inline-flex items-center gap-3 font-bold text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
            <Package2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl tracking-tight">Luggage Link</span>
        </Link>

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-300 mb-4">
            US → Ethiopia shipping
          </p>
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-6">
            Airport to airport,<br />
            US to<br />
            <span className="text-yellow-300">Ethiopia.</span>
          </h2>
          <p className="text-brand-300 text-sm leading-relaxed max-w-xs">
            Book online, drop your bags at the departure airport, and collect them in Ethiopia.
          </p>

          <div className="mt-10 flex items-center gap-6">
            {[
              { v: 'US→ET', l: 'Direct route' },
              { v: 'Online', l: 'Book anytime' },
              { v: 'Tracked', l: 'Every step' },
            ].map(({ v, l }) => (
              <div key={l}>
                <p className="text-xl font-bold text-white">{v}</p>
                <p className="text-xs text-brand-400">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ethiopian flag stripe */}
        <div className="relative flex h-1.5 gap-0.5 rounded-full overflow-hidden w-24">
          <div className="flex-1" style={{ backgroundColor: '#078930' }} />
          <div className="flex-1" style={{ backgroundColor: '#FCDD09' }} />
          <div className="flex-1" style={{ backgroundColor: '#DA121A' }} />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white lg:rounded-l-3xl">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2.5 font-bold text-brand-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700">
                <Package2 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl">Luggage Link</span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-500">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              leftAddon={<Mail className="h-4 w-4" />}
              autoComplete="email"
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className={`block w-full rounded-lg border px-3 py-2 pl-9 pr-10 text-sm focus:outline-none focus:ring-2 transition-colors
                    ${errors.password
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20'
                      : 'border-gray-300 focus:border-brand-500 focus:ring-brand-500/20'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoggingIn}
              rightIcon={!isLoggingIn ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-brand-700 hover:text-brand-900 transition-colors">
                Create one free
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            By signing in you agree to our{' '}
            <span className="underline cursor-pointer">Terms</span> &{' '}
            <span className="underline cursor-pointer">Privacy Policy</span>
          </p>
        </div>
      </div>
    </div>
  )
}
