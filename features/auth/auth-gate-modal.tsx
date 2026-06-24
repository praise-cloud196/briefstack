'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface AuthGateModalProps {
  callbackUrl: string
  onClose: () => void
}

export function AuthGateModal({ callbackUrl, onClose }: AuthGateModalProps) {
  const router = useRouter()

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm mx-4 bg-surface rounded-2xl shadow-xl border border-outline-variant overflow-hidden"
      >
        <div className="p-6 text-center">
          <h2 className="font-title-large text-on-surface mb-2">
            Create a free account
          </h2>
          <p className="font-body-medium text-on-surface-variant mb-6">
            Save briefs, export content, access your brief history, and continue creating briefs.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/auth?mode=signup&callbackUrl=${encodeURIComponent(callbackUrl)}`)}
              className="w-full py-2.5 bg-primary text-on-primary font-label-medium rounded-lg hover:opacity-90 transition-opacity"
            >
              Create Free Account
            </button>
            <button
              onClick={() => router.push(`/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`)}
              className="w-full py-2.5 border border-outline text-on-surface font-label-medium rounded-lg hover:bg-surface-variant transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 font-label-medium text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
