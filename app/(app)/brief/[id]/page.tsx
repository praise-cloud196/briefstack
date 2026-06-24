'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { BriefViewer } from '@/features/brief/brief-viewer'
import { RefinementOverlay } from '@/features/brief/refinement-overlay'
import { briefToMarkdown, copyToClipboard } from '@/features/brief/export'
import { classifyError } from '@/lib/errors'
import { track, mapErrorCode } from '@/lib/analytics'
import type { BriefOutput, BriefInput, RefinementMode } from '@/types'

export default function BriefPage() {
  const params = useParams()
  const router = useRouter()
  const [output, setOutput] = useState<BriefOutput | null>(null)
  const [briefInput, setBriefInput] = useState<BriefInput | null>(null)
  const [briefId] = useState<string>(params.id as string)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefining, setIsRefining] = useState(false)
  const [refinementMode, setRefinementMode] = useState<RefinementMode | null>(null)
  const [refineError, setRefineError] = useState<string | null>(null)
  const [refineVersion, setRefineVersion] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/brief/${briefId}`)
        if (!res.ok) {
          if (res.status === 404) {
            setError('Brief not found')
            return
          }
          throw new Error('Failed to load brief')
        }
        const data = await res.json()
        const b = data.brief as Record<string, unknown> | undefined
        if (!b) {
          throw new Error('Brief data missing')
        }
        setOutput(b.output as BriefOutput)
        setBriefInput({
          topic: b.topic as string,
          targetAudience: b.targetAudience as string,
          contentType: b.contentType as string,
          funnelStage: b.funnelStage as string,
          businessGoal: (b.businessGoal as string) ?? undefined,
          productContext: (b.productContext as string) ?? undefined,
          brandVoice: (b.brandVoice as string) ?? undefined,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load brief')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [briefId])

  const handleExportMarkdown = async () => {
    if (!output) return
    const md = briefToMarkdown(output)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'brief.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportCopy = async () => {
    if (!output) return
    const md = briefToMarkdown(output)
    await copyToClipboard(md)
  }

  const handleRefine = useCallback(async (mode: RefinementMode) => {
    if (!briefInput || !briefId || isRefining) return
    setIsRefining(true)
    setRefinementMode(mode)
    setRefineError(null)
    track('brief_refined', { refinement_mode: mode })

    try {
      const res = await fetch('/api/brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...briefInput, id: briefId, refinementMode: mode }),
      })

      const data: Record<string, unknown> = await res.json()

      if (!res.ok) {
        const err = new Error(typeof data.error === 'string' ? data.error : 'Refinement failed')
        const code = data.code
        if (typeof code === 'string') {
          Object.assign(err, { code })
        }
        throw err
      }

      const updatedBrief = data.brief as Record<string, unknown> | undefined
      const newOutput = updatedBrief?.output as BriefOutput | undefined
      if (newOutput) {
        setOutput(newOutput)
        setRefineVersion((v) => v + 1)
      }
    } catch (err) {
      const classified = classifyError(err, true)
      track('generation_failed', { error_type: mapErrorCode(classified.code) })
      setRefineError(classified.message)
    } finally {
      setIsRefining(false)
      setRefinementMode(null)
    }
  }, [briefInput, briefId, isRefining])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !output) {
    return (
      <div className="flex-1 max-w-3xl mx-auto w-full p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="font-body-medium text-error">{error || 'Brief not found'}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-primary text-on-primary font-label-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Create New Brief
        </button>
      </div>
    )
  }

  return (
    <>
      {isRefining && refinementMode && <RefinementOverlay mode={refinementMode} />}
      <div className="flex-1 max-w-3xl mx-auto w-full p-6 space-y-6">
      <button
        onClick={() => router.push('/dashboard')}
        className="font-label-medium text-primary hover:underline underline-offset-4"
      >
        &larr; Create New Brief
      </button>
      {refineError && (
        <p className="font-body-small text-error">{refineError}</p>
      )}
      <BriefViewer
        key={refineVersion}
        output={output}
        briefId={briefId}
        onExport={handleExportMarkdown}
        onCopy={handleExportCopy}
        onRefine={handleRefine}
        isRefining={isRefining}
      />
    </div>
    </>
  )
}
