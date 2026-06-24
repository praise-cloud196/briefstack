'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BriefForm } from '@/features/brief/brief-form'
import { GenerationProgress } from '@/features/brief/generation-progress'
import { classifyError } from '@/lib/errors'
import type { BriefInput, BriefOutput } from '@/types'

const ANON_BRIEFS_KEY = 'briefstack_anon_briefs'
const STEPS_MAX = 4

function generateTempId(): string {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function GeneratePage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'form' | 'generating' | 'error'>('form')
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [topic, setTopic] = useState('')
  const inputRef = useRef<BriefInput | null>(null)

  const handleFormSubmit = useCallback(async (input: BriefInput) => {
    inputRef.current = input
    setTopic(input.topic)
    setPhase('generating')
    setCurrentStep(0)

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS_MAX))
    }, 2200)

    const abortController = new AbortController()

    try {
      const res = await fetch('/api/brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal: abortController.signal,
      })

      const data: Record<string, unknown> = await res.json()

      if (!res.ok) {
        const err = new Error(typeof data.error === 'string' ? data.error : 'Generation failed')
        const code = data.code
        if (typeof code === 'string') {
          Object.assign(err, { code })
        }
        throw err
      }

      clearInterval(stepInterval)
      setCurrentStep(5)

      const briefData = data.brief as Record<string, unknown> | undefined
      const output = briefData?.output as BriefOutput | undefined
      if (!output) {
        throw new Error('No brief data returned')
      }

      const tempId = generateTempId()
      const stored: Record<string, { input: BriefInput; output: BriefOutput }> = {}
      try {
        const raw = sessionStorage.getItem(ANON_BRIEFS_KEY)
        if (raw) {
          Object.assign(stored, JSON.parse(raw))
        }
      } catch {}
      stored[tempId] = { input, output }
      try {
        sessionStorage.setItem(ANON_BRIEFS_KEY, JSON.stringify(stored))
      } catch {}

      setTimeout(() => {
        router.push(`/preview/${tempId}`)
      }, 350)
    } catch (err) {
      if (abortController.signal.aborted) return
      clearInterval(stepInterval)
      const classified = classifyError(err)
      setError(classified.message)
      setPhase('error')
    }
  }, [router])

  if (phase === 'form') {
    return (
      <div className="flex-1 max-w-xl mx-auto w-full p-6">
        <h1 className="font-display-small text-on-surface mb-2">Create Your Brief</h1>
        <p className="font-body-medium text-on-surface-variant mb-6">
          Add a few details and create a complete content brief in seconds.
        </p>
        <BriefForm onSubmit={handleFormSubmit} />
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex-1 max-w-md mx-auto w-full p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="space-y-2 text-center">
          <p className="font-body-medium text-error">{error}</p>
          <p className="font-body-small text-on-surface-variant">
            Your inputs have been saved. You can try again.
          </p>
        </div>
        <button
          onClick={() => { setPhase('form'); setError(null); setCurrentStep(0) }}
          className="px-5 py-2.5 bg-primary text-on-primary font-label-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Try Again
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
