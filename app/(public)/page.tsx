'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BriefForm } from '@/features/brief/brief-form'
import { BriefFormPanel } from '@/features/brief/brief-form-panel'
import { GenerationProgress } from '@/features/brief/generation-progress'
import { useBriefPanel } from '@/components/brief-panel-context'
import { ArrowRight } from 'lucide-react'
import { RotatingWord } from '@/components/rotating-word'
import { classifyError } from '@/lib/errors'
import { inferBriefMetadata } from '@/lib/infer-brief-metadata'
import type { BriefInput, BriefOutput } from '@/types'

const ANON_BRIEFS_KEY = 'briefstack_anon_briefs'
const STEPS_MAX = 4

function generateTempId(): string {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export default function Home() {
  const router = useRouter()
  const { isOpen: isPanelOpen, open: openPanel, close: closePanel } = useBriefPanel()
  const [freestyleText, setFreestyleText] = useState('')

  const [phase, setPhase] = useState<'idle' | 'generating' | 'error'>('idle')
  const [currentStep, setCurrentStep] = useState(0)
  const [topic, setTopic] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submitBrief = useCallback(async (input: BriefInput) => {
    setPhase('generating')
    setCurrentStep(0)
    setTopic(input.topic)
    setError(null)

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS_MAX))
    }, 2200)

    try {
      const res = await fetch('/api/brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
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
      clearInterval(stepInterval)
      const classified = classifyError(err)
      setError(classified.message)
      setPhase('error')
    }
  }, [router])

  const handleFormSubmit = useCallback((input: BriefInput) => {
    closePanel()
    submitBrief(input)
  }, [closePanel, submitBrief])

  const handleFreestyleSubmit = useCallback(() => {
    const text = freestyleText.trim()
    if (!text || phase !== 'idle') return

    setFreestyleText('')

    const metadata = inferBriefMetadata(text)
    const input: BriefInput = {
      topic: text,
      targetAudience: metadata.targetAudience,
      contentType: metadata.contentType,
      funnelStage: metadata.funnelStage,
    }

    submitBrief(input)
  }, [freestyleText, phase, submitBrief])

  if (phase === 'generating') {
    return (
      <div className="flex-1 flex flex-col items-center bg-surface-container-lowest">
        <div className="flex-1 max-w-md mx-auto w-full p-6 flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="font-headline-small text-on-surface mb-6">Creating Your Brief</h2>
          {topic && (
            <p className="font-body-medium text-on-surface-variant mb-8 text-center">
              Topic: <span className="text-on-surface font-label-medium">{topic}</span>
            </p>
          )}
          <GenerationProgress currentStep={currentStep} />
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center bg-surface-container-lowest">
        <div className="flex-1 max-w-md mx-auto w-full p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className="space-y-2 text-center">
            <p className="font-body-medium text-error">{error}</p>
            <p className="font-body-small text-on-surface-variant">
              Your inputs have been saved. You can try again.
            </p>
          </div>
          <button
            onClick={() => { setPhase('idle'); setError(null); setCurrentStep(0) }}
            className="px-5 py-2.5 bg-primary text-on-primary font-label-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center bg-surface-container-lowest">
      {/* Hero */}
      <section className="hero-section">
        <div className="hero-badge">✦ AI-Powered Content Briefs</div>

        <h1 className="hero-heading">
          Turn <span className="hero-accent"><RotatingWord /></span> into{' '}
          <span className="hero-accent">content briefs</span>
        </h1>

        <p className="hero-subtitle">
          BriefStack helps content marketers turn rough ideas into structured, consistent briefs without starting from scratch every time.
        </p>

        {/* Freestyle input */}
        <div className="hero-input-wrap">
          <div className="hero-input-row">
            <span className="hero-input-star">✦</span>
            <textarea
              rows={1}
              value={freestyleText}
              onChange={(e) => setFreestyleText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleFreestyleSubmit()
                }
              }}
              onInput={(e) => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = el.scrollHeight + 'px'
              }}
              className="hero-input-field"
              placeholder="Describe your brief..."
            />
          </div>
          <button
            onClick={handleFreestyleSubmit}
            disabled={!freestyleText.trim()}
            className="hero-input-send disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight size={16} />
          </button>
        </div>

        {/* or divider */}
        <div className="hero-or-row">or</div>

        {/* Customize button */}
        <div>
          <button
            onClick={openPanel}
            className="hero-btn-customize"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Customize your brief
          </button>
          <p className="hero-customize-sub">
            Fine-tune your audience, content type, and goals
          </p>
        </div>
      </section>

      {/* Steps */}
      <div className="steps-section">
        <div className="step-card">
          <div className="step-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 7h6M7 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M13 14l2-2-2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3>Input</h3>
          <p>Add your topic, audience, and content details.</p>
        </div>
        <div className="step-card">
          <div className="step-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v3M10 14v3M3 10h3M14 10h3M5.6 5.6l2.1 2.1M12.3 12.3l2.1 2.1M5.6 14.4l2.1-2.1M12.3 7.7l2.1-2.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3>Generate</h3>
          <p>Create a structured, writer-ready brief in seconds.</p>
        </div>
        <div className="step-card">
          <div className="step-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v9M7 9l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 14v1a2 2 0 002 2h8a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3>Export</h3>
          <p>Copy, download, or save your brief for later.</p>
        </div>
      </div>

      {/* Supported formats */}
      <div className="supports-section">
        <p className="supports-label">
          Supports
        </p>
        <div className="supports-items">
          <span className="supports-item">Blog Posts</span>
          <span className="supports-item">Landing Pages</span>
          <span className="supports-item">Email Campaigns</span>
          <span className="supports-item">LinkedIn Posts</span>
          <span className="supports-item">Product Launches</span>
          <span className="supports-item">Case Studies</span>
        </div>
      </div>

      {/* Overlay panel */}
      <BriefFormPanel isOpen={isPanelOpen} onClose={closePanel}>
        <BriefForm onSubmit={handleFormSubmit} />
      </BriefFormPanel>
    </div>
  )
}
