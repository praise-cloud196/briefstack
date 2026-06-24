'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { BriefInput } from '@/types'

const STORAGE_KEY = 'briefstack_pending_generation'

const CONTENT_TYPE_OPTIONS = [
  { value: 'Blog Post', label: 'Blog Post' },
  { value: 'LinkedIn Post', label: 'LinkedIn Post' },
  { value: 'Landing Page', label: 'Landing Page' },
  { value: 'Email Sequence', label: 'Email Sequence' },
  { value: '', label: 'Other' },
]

const FUNNEL_OPTIONS = [
  { value: 'TOFU - Awareness', label: 'Awareness' },
  { value: 'MOFU - Consideration', label: 'Consideration' },
  { value: 'BOFU - Decision', label: 'Decision' },
]

interface BriefFormProps {
  onSubmit?: (input: BriefInput) => void
}

export function BriefForm({ onSubmit }: BriefFormProps) {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [contentType, setContentType] = useState('')
  const [funnelStage, setFunnelStage] = useState('')
  const [businessGoal, setBusinessGoal] = useState('')
  const [productContext, setProductContext] = useState('')
  const [brandVoice, setBrandVoice] = useState('')
  const [error, setError] = useState('')
  const [showContext, setShowContext] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!topic) {
      setError('Please enter a topic')
      return
    }

    setError('')
    setIsNavigating(true)

    const input: BriefInput = {
      topic,
      targetAudience,
      contentType,
      funnelStage,
      businessGoal: businessGoal || undefined,
      productContext: productContext || undefined,
      brandVoice: brandVoice || undefined,
    }

    if (onSubmit) {
      onSubmit(input)
      return
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ input }))
    } catch {
      // sessionStorage may be unavailable; navigate anyway
    }

    router.push('/brief/generate')
  }

  const hasContext = targetAudience || contentType || funnelStage

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="topic" className="font-label-medium text-on-surface block mb-1.5">
          Topic or Keyword <span className="text-error">*</span>
        </label>
        <input
          id="topic"
          type="text"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full px-3 py-2.5 border border-outline rounded-lg bg-surface font-body-medium text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="e.g., B2B content marketing trends for 2026"
        />
      </div>

      <div className="border border-outline-variant rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowContext(!showContext)}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-surface-container-low hover:bg-surface-container-higher transition-colors text-left"
        >
          <span className="font-label-medium text-on-surface-variant">
            {hasContext ? 'Context added' : 'Audience & Content Details'}{hasContext ? ' \u2713' : ''}
          </span>
          <span className={`text-on-surface-variant text-sm leading-none transition-transform duration-200 ${showContext ? 'rotate-180' : ''}`}>
            ▾
          </span>
        </button>
        {showContext && (
          <div className="px-4 py-3.5 border-t border-outline-variant space-y-4">
            <div>
              <label htmlFor="audience" className="font-label-medium text-on-surface block mb-1.5">
                Target Audience
              </label>
              <input
                id="audience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-3 py-2 border border-outline rounded-lg bg-surface font-body-medium text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Marketing Managers at B2B SaaS companies"
              />
            </div>

            <div>
              <label className="font-label-medium text-on-surface block mb-2">
                Content Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CONTENT_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value || '__other'}
                    type="button"
                    onClick={() => setContentType(opt.value)}
                    className={`px-3 py-1.5 rounded-full font-label-small border transition-colors ${
                      contentType === opt.value
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface text-on-surface-variant border-outline hover:border-primary hover:text-primary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {contentType === '' && (
                <input
                  type="text"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className="w-full px-3 py-2 border border-outline rounded-lg bg-surface font-body-medium text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary mt-2"
                  placeholder="Type your own content type..."
                />
              )}
            </div>

            <div>
              <label className="font-label-medium text-on-surface block mb-2">
                Funnel Stage
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FUNNEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFunnelStage(opt.value)}
                    className={`px-3 py-1.5 rounded-full font-label-small border transition-colors ${
                      funnelStage === opt.value
                        ? 'bg-primary text-on-primary border-primary'
                        : 'bg-surface text-on-surface-variant border-outline hover:border-primary hover:text-primary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <details className="group">
        <summary className="font-label-medium text-on-surface-variant cursor-pointer hover:text-on-surface transition-colors">
          Advanced Options
        </summary>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="goal" className="font-label-medium text-on-surface block mb-1.5">
              Business Goal
            </label>
            <input
              id="goal"
              type="text"
              value={businessGoal}
              onChange={(e) => setBusinessGoal(e.target.value)}
              className="w-full px-3 py-2 border border-outline rounded-lg bg-surface font-body-medium text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Generate demo requests"
            />
          </div>

          <div>
            <label htmlFor="product" className="font-label-medium text-on-surface block mb-1.5">
              Product Context
            </label>
            <input
              id="product"
              type="text"
              value={productContext}
              onChange={(e) => setProductContext(e.target.value)}
              className="w-full px-3 py-2 border border-outline rounded-lg bg-surface font-body-medium text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Project management SaaS for agencies"
            />
          </div>

          <div>
            <label htmlFor="voice" className="font-label-medium text-on-surface block mb-1.5">
              Brand Voice
            </label>
            <input
              id="voice"
              type="text"
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              className="w-full px-3 py-2 border border-outline rounded-lg bg-surface font-body-medium text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Professional but approachable"
            />
          </div>
        </div>
      </details>

      {error && (
        <p className="font-body-small text-error">{error}</p>
      )}

      <button
        type="submit"
        disabled={isNavigating}
        className="w-full py-2.5 bg-primary text-on-primary font-label-medium rounded-lg hover:opacity-90 disabled:opacity-60 transition-opacity inline-flex items-center justify-center gap-2"
      >
        {isNavigating ? (
          <>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Creating Brief...
          </>
        ) : (
          'Create Brief'
        )}
      </button>
    </form>
  )
}
