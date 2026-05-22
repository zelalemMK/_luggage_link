import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Package2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi } from '@/lib/api'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (!email.trim()) { setError('Email is required'); return false }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email'); return false }
    setError('')
    return true
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
    } catch {
      // Swallow errors — always show success to prevent enumeration
    } finally {
      setLoading(false)
      setSubmitted(true)
    }
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
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="mt-1 text-sm text-gray-500">
            {submitted ? 'Check your inbox' : "We'll send you a link to reset it"}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <div className="mb-6 h-1 rounded-full" style={{ background: 'linear-gradient(to right, #078930 33%, #FCDD09 33%, #FCDD09 66%, #DA121A 66%)' }} />

          {submitted ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Email sent!</h2>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                If an account exists for <span className="font-medium text-gray-700">{email}</span>,
                you'll receive password reset instructions shortly.
              </p>
              <p className="mt-3 text-xs text-gray-400">
                Didn't get it? Check your spam folder or try again.
              </p>
              <Button
                variant="outline"
                className="mt-6 w-full"
                onClick={() => { setSubmitted(false); setEmail('') }}
              >
                Try a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                error={error}
                leftAddon={<Mail className="h-4 w-4" />}
                autoComplete="email"
              />

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Send Reset Link
              </Button>
            </form>
          )}

          <div className="mt-6 flex justify-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
