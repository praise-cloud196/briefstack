'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import type { BriefListItem } from '@/types'

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [briefs, setBriefs] = useState<BriefListItem[]>([])
  const [loading, setLoading] = useState(true)

  if (status === 'unauthenticated') redirect('/auth')

  const fetchBriefs = useCallback(async () => {
    try {
      const res = await fetch('/api/brief')
      const data = await res.json()
      if (res.ok) setBriefs(data.briefs)
    } catch {
      console.error('Failed to fetch briefs')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') fetchBriefs()
  }, [status, fetchBriefs])

  if (status === 'loading') return null

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full p-6">
      <div className="mb-8">
        <h1 className="font-headline-small text-on-surface">Brief History</h1>
        <p className="font-body-medium text-on-surface-variant mt-1">
          All your saved content briefs.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : briefs.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-title-medium text-on-surface-variant">No briefs yet</p>
          <p className="font-body-medium text-on-surface-variant mt-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-primary font-label-medium hover:underline"
            >
              Create your first brief
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {briefs.map((brief) => (
            <button
              key={brief.id}
              onClick={() => router.push(`/brief/${brief.id}`)}
              className="w-full text-left p-4 border border-outline-variant rounded-xl bg-surface hover:bg-surface-variant transition-colors"
            >
              <h3 className="font-title-medium text-on-surface">{brief.topic}</h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                <span className="font-label-small text-primary bg-primary-container/50 px-2 py-0.5 rounded">
                  {brief.contentType}
                </span>
                <span className="font-label-small text-on-surface-variant">
                  {brief.funnelStage}
                </span>
                <span className="font-body-small text-on-surface-variant ml-auto">
                  {new Date(brief.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
