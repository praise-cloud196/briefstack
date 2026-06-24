'use client'

import { Suspense, useState, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ConfirmForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Reset failed')
      }

      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="font-body-medium text-error">Invalid reset link.</p>
        <Link
          href="/auth/reset"
          className="inline-block mt-4 font-label-medium text-primary hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
        >
          Request a new reset link
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="text-center">
        <h1 className="font-display-medium text-on-surface">Password reset</h1>
        <p className="font-body-medium text-on-surface-variant mt-4">
          Your password has been reset successfully.
        </p>
        <Link
          href="/auth"
          className="inline-block mt-6 font-label-medium bg-primary text-on-primary px-6 py-2.5 rounded-lg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-opacity"
        >
          Sign in with new password
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="font-display-medium text-on-surface text-center">Set new password</h1>

      <form onSubmit={handleSubmit} className="space-y-4 mt-8">
        <div>
          <label htmlFor="password" className="font-label-medium text-on-surface block mb-1">
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-outline rounded-lg bg-surface font-body-medium text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary transition-shadow"
            placeholder="At least 8 characters"
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
          {loading ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    </>
  )
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
      <div className="w-full max-w-sm mx-auto px-6">
        <Suspense fallback={
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <ConfirmForm />
        </Suspense>
      </div>
    </div>
  )
}
