import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Package2, Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { getToken } from '@/lib/api'

export const Route = createFileRoute('/register')({
  beforeLoad: () => {
    if (getToken()) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: RegisterPage,
})

interface FormData {
  first_name: string
  last_name: string
  email: string
  password: string
  confirm_password: string
}

function RegisterPage() {
  const { register, isRegistering } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState<FormData>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
  })
  const [errors, setErrors] = useState<Partial<FormData>>({})

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = (): boolean => {
    const e: Partial<FormData> = {}
    if (!form.first_name.trim()) e.first_name = 'First name is required'
    if (!form.last_name.trim()) e.last_name = 'Last name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirm_password) e.confirm_password = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    register({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      password: form.password,
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-gray-100 px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 font-bold text-brand-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 shadow-md">
              <Package2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl">Luggage Link</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500">Start shipping your luggage to Ethiopia</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <div className="mb-6 h-1 rounded-full" style={{ background: 'linear-gradient(to right, #078930 33%, #FCDD09 33%, #FCDD09 66%, #DA121A 66%)' }} />

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="Abebe"
                value={form.first_name}
                onChange={set('first_name')}
                error={errors.first_name}
                leftAddon={<User className="h-4 w-4" />}
                autoComplete="given-name"
              />
              <Input
                label="Last Name"
                placeholder="Girma"
                value={form.last_name}
                onChange={set('last_name')}
                error={errors.last_name}
                autoComplete="family-name"
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="abebe@example.com"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              leftAddon={<Mail className="h-4 w-4" />}
              autoComplete="email"
            />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
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

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter password"
              value={form.confirm_password}
              onChange={set('confirm_password')}
              error={errors.confirm_password}
              leftAddon={<Lock className="h-4 w-4" />}
              autoComplete="new-password"
            />

            <Button type="submit" className="w-full" size="lg" loading={isRegistering}>
              Create Account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-700 hover:text-brand-900">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
