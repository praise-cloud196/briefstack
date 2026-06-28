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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div className="modal-body">
        <label htmlFor="topic" className="field-label">
          Topic or Keyword <span style={{ color: 'var(--panel-accent)' }}>*</span>
        </label>
        <input
          id="topic"
          type="text"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="field-input"
          placeholder="e.g., B2B content marketing trends for 2026"
        />

        <button
          type="button"
          onClick={() => setShowContext(!showContext)}
          className={`accordion-header${showContext ? ' open' : ''}`}
        >
          <span>
            {hasContext ? 'Context added' : 'Audience & Content Details'}{hasContext ? ' \u2713' : ''}
          </span>
          <span className="accordion-arrow">▾</span>
        </button>
        {showContext && (
          <div>
            <label htmlFor="audience" className="field-label">
              Target Audience
            </label>
            <input
              id="audience"
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="field-input"
              placeholder="e.g., Marketing Managers at B2B SaaS companies"
            />

            <label className="field-label">Content Type</label>
            <div className="chips">
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value || '__other'}
                  type="button"
                  onClick={() => setContentType(opt.value)}
                  className={`chip${contentType === opt.value ? ' selected' : ''}`}
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
                className="custom-type-input"
                placeholder="Type your own content type…"
              />
            )}

            <label className="field-label">Funnel Stage</label>
            <div className="chips">
              {FUNNEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFunnelStage(opt.value)}
                  className={`chip${funnelStage === opt.value ? ' selected' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <details className="advanced-toggle">
          <summary>
            ▶ Advanced Options{' '}
            <span style={{
              fontSize: '0.65rem',
              color: 'var(--panel-text-muted)',
              border: '1px solid var(--panel-chip-border)',
              borderRadius: '4px',
              padding: '0 6px',
              lineHeight: '1.5',
              fontWeight: 400,
              letterSpacing: '0.02em',
            }}>
              Optional
            </span>
          </summary>
          <div>
            <label htmlFor="goal" className="field-label">
              Business Goal
            </label>
            <input
              id="goal"
              type="text"
              value={businessGoal}
              onChange={(e) => setBusinessGoal(e.target.value)}
              className="field-input"
              placeholder="e.g., Generate demo requests"
            />

            <label htmlFor="product" className="field-label">
              Product Context
            </label>
            <input
              id="product"
              type="text"
              value={productContext}
              onChange={(e) => setProductContext(e.target.value)}
              className="field-input"
              placeholder="e.g., Project management SaaS for agencies"
            />

            <label htmlFor="voice" className="field-label">
              Brand Voice
            </label>
            <input
              id="voice"
              type="text"
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              className="field-input"
              placeholder="e.g., Professional but approachable"
            />
          </div>
        </details>

        {error && (
          <p style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.5rem' }}>{error}</p>
        )}
      </div>

      <div className="modal-footer">
        <button
          type="submit"
          disabled={isNavigating}
          className="btn-create"
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
      </div>
    </form>
  )
}
