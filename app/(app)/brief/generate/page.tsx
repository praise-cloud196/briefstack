'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GenerationProgress } from '@/features/brief/generation-progress'
import { classifyError } from '@/lib/errors'
import { markFirstBriefStart, trackFirstBriefComplete, track, mapErrorCode } from '@/lib/analytics'
import type { BriefInput } from '@/types'

const STORAGE_KEY = 'briefstack_pending_generation'
const STEPS_MAX = 4

interface StoredData {
  input: BriefInput
}

function readStoredData(): StoredData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as StoredData
    }
  } catch {}
  return null
}

export default function GeneratePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [stored] = useState(readStoredData)
  const topic = stored?.input?.topic ?? ''
  const timings = useRef<Record<string, number>>({})

  useEffect(() => {
    if (!stored?.input) {
      router.replace('/dashboard')
      return
    }

    markFirstBriefStart()

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS_MAX))
    }, 2200)

    let completed = false
    const abortController = new AbortController()

    timings.current.apiRequest = performance.now()

    fetch('/api/brief/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stored.input),
      signal: abortController.signal,
    })
      .then(async (res) => {
        timings.current.apiResponse = performance.now()

        const data: Record<string, unknown> = await res.json()

        if (!res.ok) {
          const err = new Error(typeof data.error === 'string' ? data.error : 'Generation failed')
          const code = data.code
          if (typeof code === 'string') {
            Object.assign(err, { code })
          }
          throw err
        }

        const briefData = data.brief as Record<string, unknown> | undefined
        const briefId = briefData?.id as string | undefined

        if (!briefId) {
          throw new Error('No brief ID returned')
        }

        completed = true
        clearInterval(stepInterval)

        setCurrentStep(5)

        try {
          sessionStorage.removeItem(STORAGE_KEY)
        } catch {}

        trackFirstBriefComplete()

        timings.current.navigation = performance.now()

        if (process.env.NODE_ENV === 'development') {
          const apiMs = timings.current.apiResponse - timings.current.apiRequest
          const navMs = timings.current.navigation - timings.current.apiResponse
          const total = timings.current.navigation - timings.current.apiRequest
          console.log('[PERF] ========== GENERATION TIMELINE ==========')
          console.log(`[PERF] API request: ${apiMs.toFixed(0)}ms`)
          console.log(`[PERF] Navigation: ${navMs.toFixed(0)}ms`)
          console.log(`[PERF] Total generation time: ${(total / 1000).toFixed(2)}s`)
          console.log('[PERF] =======================================')
        }

        setTimeout(() => {
          router.push(`/brief/${briefId}`)
        }, 350)
      })
      .catch((err) => {
        if (abortController.signal.aborted) return
        clearInterval(stepInterval)
        if (completed) return

        const classified = classifyError(err)
        track('generation_failed', { error_type: mapErrorCode(classified.code) })
        setError(classified.message)

        try {
          sessionStorage.removeItem(STORAGE_KEY)
        } catch {}
      })

    return () => {
      if (!completed) {
        clearInterval(stepInterval)
      }
      abortController.abort()
    }
  }, [router, stored])

  if (error) {
    return (
      <div className="flex-1 max-w-md mx-auto w-full p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="space-y-2 text-center">
          <p className="font-body-medium text-error">{error}</p>
          <p className="font-body-small text-on-surface-variant">
            Your inputs have been saved. You can try again.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-5 py-2.5 bg-primary text-on-primary font-label-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-md mx-auto w-full p-6 flex flex-col items-center justify-center min-h-[60vh]">
      <h2 className="font-headline-small text-on-surface mb-6">Creating Your Brief</h2>
      {topic && (
        <p className="font-body-medium text-on-surface-variant mb-8 text-center">
          Topic: <span className="text-on-surface font-label-medium">{topic}</span>
        </p>
      )}
      <GenerationProgress currentStep={currentStep} />
    </div>
  )
}
