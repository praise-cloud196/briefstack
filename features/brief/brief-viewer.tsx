'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { BriefOutput, RefinementMode } from '@/types'
import { track } from '@/lib/analytics'

interface BriefViewerProps {
  output: BriefOutput
  briefId?: string
  readOnly?: boolean
  showActions?: boolean
  previewLabel?: string
  onExport?: () => void
  onCopy?: () => void
  onSave?: () => void
  onRefine?: (mode: RefinementMode) => void
  isRefining?: boolean
}

const REFINEMENT_MODES: { mode: RefinementMode; label: string }[] = [
  { mode: 'shorter', label: 'Make Shorter' },
  { mode: 'strategic', label: 'More Strategic' },
  { mode: 'actionable', label: 'Make Actionable' },
  { mode: 'tone', label: 'Adjust Tone' },
]

const SECTIONS: { key: keyof BriefOutput; label: string; isArray?: boolean }[] = [
  { key: 'briefSummary', label: 'Brief Summary' },
  { key: 'audienceAnalysis', label: 'Audience Analysis' },
  { key: 'searchIntent', label: 'Search Intent' },
  { key: 'contentGoal', label: 'Content Goal' },
  { key: 'recommendedContentAngle', label: 'Recommended Content Angle' },
  { key: 'questionsToAnswer', label: 'Questions To Answer', isArray: true },
  { key: 'suggestedContentStructure', label: 'Suggested Content Structure', isArray: true },
  { key: 'ctaRecommendation', label: 'CTA Recommendation' },
  { key: 'metaTitle', label: 'Meta Title' },
  { key: 'metaDescription', label: 'Meta Description' },
]

const ALWAYS_OPEN: (keyof BriefOutput)[] = ['briefSummary']

type CopyStatus = 'idle' | 'copied'
type ExportStatus = 'idle' | 'exporting' | 'downloaded'

export function BriefViewer({ output, briefId, readOnly, showActions = !readOnly, previewLabel, onExport, onCopy, onSave, onRefine, isRefining }: BriefViewerProps) {
  const [editedOutput, setEditedOutput] = useState<BriefOutput>(output)
  const [openSections, setOpenSections] = useState<Set<keyof BriefOutput>>(() => new Set(ALWAYS_OPEN))
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle')
  const pendingCopy = useRef(false)
  const pendingExport = useRef(false)

  const handleRefine = useCallback((mode: RefinementMode) => {
    if (isRefining || !onRefine) return
    onRefine(mode)
  }, [isRefining, onRefine])

  const updateField = useCallback((key: keyof BriefOutput, value: string | string[]) => {
    setEditedOutput((prev) => ({ ...prev, [key]: value }))
    setSaveStatus('idle')
  }, [])

  const handleSave = useCallback(async () => {
    if (saving) return
    if (briefId) {
      setSaving(true)
      try {
        const res = await fetch(`/api/brief/${briefId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ output: editedOutput }),
        })
        if (!res.ok) throw new Error('Save failed')
        setSaveStatus('saved')
      } catch {
        setSaveStatus('error')
      } finally {
        setSaving(false)
      }
    } else if (onSave) {
      onSave()
    }
  }, [briefId, editedOutput, saving, onSave])

  const handleCopy = useCallback(async () => {
    if (!onCopy || pendingCopy.current) return
    pendingCopy.current = true
    setCopyStatus('copied')
    try {
      await onCopy()
      track('brief_copied')
    } finally {
      setTimeout(() => {
        setCopyStatus('idle')
        pendingCopy.current = false
      }, 2000)
    }
  }, [onCopy])

  const handleExport = useCallback(async () => {
    if (!onExport || pendingExport.current) return
    pendingExport.current = true
    setExportStatus('exporting')
    try {
      await onExport()
      track('brief_exported', { export_format: 'markdown' })
      setExportStatus('downloaded')
      setTimeout(() => {
        setExportStatus('idle')
        pendingExport.current = false
      }, 2000)
    } catch {
      setExportStatus('idle')
      pendingExport.current = false
    }
  }, [onExport])

  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map())

  const autoGrow = useCallback((key: string) => {
    const el = textareaRefs.current.get(key)
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }, [])

  const setTextareaRef = useCallback((key: string, el: HTMLTextAreaElement | null) => {
    if (el) {
      textareaRefs.current.set(key, el)
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    } else {
      textareaRefs.current.delete(key)
    }
  }, [])

  const toggleSection = useCallback((key: keyof BriefOutput) => {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const displayedSections = SECTIONS.filter(({ key }) => {
    const value = readOnly ? output[key] : editedOutput[key]
    return !(value == null || value === '' || (Array.isArray(value) && value.length === 0))
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <h2 className="font-title-medium text-on-surface tracking-tight">
          {previewLabel || 'Content Brief'}
        </h2>
        {showActions && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={copyStatus !== 'idle'}
              className="px-3 py-1.5 border border-outline rounded-lg font-label-small text-on-surface-variant hover:bg-surface-variant disabled:opacity-50 transition-colors"
              title="Copy to clipboard"
            >
              {copyStatus === 'copied' ? (
                <span>{'\u2713'} Copied!</span>
              ) : (
                'Copy'
              )}
            </button>
            <button
              onClick={handleExport}
              disabled={exportStatus !== 'idle'}
              className="px-3 py-1.5 border border-outline rounded-lg font-label-small text-on-surface-variant hover:bg-surface-variant disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
              title="Export as Markdown"
            >
              {exportStatus === 'exporting' ? (
                <>
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Exporting...
                </>
              ) : exportStatus === 'downloaded' ? (
                <span>{'\u2713'} Downloaded</span>
              ) : (
                'Export'
              )}
            </button>
            {(briefId || onSave) && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-primary text-on-primary font-label-small rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {saving ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
              </button>
            )}
          </div>
        )}
      </div>

      {saveStatus === 'error' && (
        <p className="font-body-small text-error">Failed to save. Please try again.</p>
      )}

      <div className="space-y-3">
        {displayedSections.map(({ key, label, isArray }) => {
          const displayValue = readOnly ? output[key] : editedOutput[key]
          const isOpen = openSections.has(key)

          return (
            <div key={key} className="border border-outline-variant rounded-lg bg-surface shadow-xs">
              <button
                type="button"
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-surface-container-low hover:bg-surface-container-higher transition-colors text-left"
              >
                <span className="font-title-small text-on-surface">{label}</span>
                <span className={`text-on-surface-variant text-sm leading-none transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>
              {isOpen && (
                <div className="px-4 py-3.5 border-t border-outline-variant">
                  {readOnly ? (
                    isArray ? (
                      <ul className="space-y-1.5">
                        {(displayValue as string[]).map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-on-surface-variant mt-1.5 shrink-0">&bull;</span>
                            <span className="font-body-medium text-on-surface leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="font-body-medium text-on-surface leading-relaxed whitespace-pre-wrap">
                        {displayValue as string}
                      </p>
                    )
                  ) : isArray ? (
                    <ul className="space-y-1.5">
                      {(editedOutput[key] as string[]).map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-on-surface-variant mt-1.5 shrink-0">&bull;</span>
                          <input
                            value={item}
                            onChange={(e) => {
                              const arr = [...(editedOutput[key] as string[])]
                              arr[i] = e.target.value
                              updateField(key, arr)
                            }}
                            className="flex-1 bg-transparent border-b border-transparent hover:border-outline-variant focus:border-primary font-body-medium text-on-surface outline-none transition-colors"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <textarea
                      ref={(el) => setTextareaRef(key, el)}
                      value={editedOutput[key] as string}
                      onChange={(e) => { updateField(key, e.target.value); autoGrow(key) }}
                      className="w-full bg-transparent border border-transparent hover:border-outline-variant focus:border-primary rounded-lg p-2 font-body-medium text-on-surface placeholder:text-on-surface-variant outline-none resize-none overflow-y-hidden transition-colors min-h-[44px]"
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showActions && onRefine && (
        <div className="border border-outline-variant rounded-lg bg-surface-container-low">
          <div className="px-4 py-3 border-b border-outline-variant">
            <h3 className="font-title-small text-on-surface">Refine Brief</h3>
          </div>
          <div className="px-4 py-3.5">
            <p className="font-body-small text-on-surface-variant mb-3">
              Improve your brief with one of the following options:
            </p>
            <div className="flex flex-wrap gap-2">
              {REFINEMENT_MODES.map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => handleRefine(mode)}
                  disabled={isRefining}
                  className="px-3 py-1.5 border border-outline rounded-lg font-label-small text-on-surface-variant hover:bg-surface-variant disabled:opacity-50 transition-colors"
                  title={label}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
