'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

export default function ResetPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [devUrl, setDevUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Request failed')
      }

      setSent(true)
      if (data.devUrl) setDevUrl(data.devUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
        <div className="w-full max-w-sm mx-auto px-6 text-center">
          <h1 className="font-display-medium text-on-surface">Check your email</h1>
          <p className="font-body-medium text-on-surface-variant mt-4">
            If an account with that email exists, we&apos;ve sent a password reset link.
          </p>
          {devUrl && (
            <p className="font-body-small text-on-surface-variant mt-4 p-3 bg-surface-container-low rounded-lg break-all">
              Dev link: <a href={devUrl} className="text-primary underline">{devUrl}</a>
            </p>
          )}
          <Link
            href="/auth"
            className="inline-block mt-6 font-label-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="font-display-medium text-on-surface">Reset password</h1>
          <p className="font-body-medium text-on-surface-variant mt-2">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="font-label-medium text-on-surface block mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-outline rounded-lg bg-surface font-body-medium text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary transition-shadow"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p className="font-body-small text-error" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-on-primary font-label-medium rounded-lg hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-opacity"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="text-center mt-6 font-body-small text-on-surface-variant">
          Remember your password?{' '}
          <Link
            href="/auth"
            className="font-label-small text-primary underline-offset-4 decoration-1 hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
