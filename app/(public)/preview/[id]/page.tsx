'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { BriefViewer } from '@/features/brief/brief-viewer'
import { RefinementOverlay } from '@/features/brief/refinement-overlay'
import { AuthGateModal } from '@/features/auth/auth-gate-modal'
import { briefToMarkdown, copyToClipboard } from '@/features/brief/export'
import { track } from '@/lib/analytics'
import { classifyError } from '@/lib/errors'
import type { BriefInput, BriefOutput, RefinementMode } from '@/types'

const ANON_BRIEFS_KEY = 'briefstack_anon_briefs'
const PENDING_ACTION_KEY = 'briefstack_pending_action'

interface AnonBriefData {
  input: BriefInput
  output: BriefOutput
}

type PendingAction = 'save' | 'export'

function readAnonBrief(id: string): AnonBriefData | null {
  try {
    const raw = sessionStorage.getItem(ANON_BRIEFS_KEY)
    if (!raw) return null
    const all = JSON.parse(raw) as Record<string, AnonBriefData>
    return all[id] ?? null
  } catch {
    return null
  }
}

function updateAnonBrief(id: string, output: BriefOutput): void {
  try {
    const raw = sessionStorage.getItem(ANON_BRIEFS_KEY)
    if (!raw) return
    const all = JSON.parse(raw) as Record<string, AnonBriefData>
    if (all[id]) {
      all[id] = { ...all[id], output }
      sessionStorage.setItem(ANON_BRIEFS_KEY, JSON.stringify(all))
    }
  } catch {}
}

function removeAnonBrief(id: string): void {
  try {
    const raw = sessionStorage.getItem(ANON_BRIEFS_KEY)
    if (!raw) return
    const all = JSON.parse(raw) as Record<string, AnonBriefData>
    delete all[id]
    sessionStorage.setItem(ANON_BRIEFS_KEY, JSON.stringify(all))
  } catch {}
}

export default function PreviewPage() {
  const params = useParams()
  const router = useRouter()
  const { status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const tempId = params.id as string

  const [data, setData] = useState<AnonBriefData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [refinementMode, setRefinementMode] = useState<RefinementMode | null>(null)
  const [showAuthGate, setShowAuthGate] = useState(false)
  const pendingActionRef = useRef<PendingAction | null>(null)

  useEffect(() => {
    const brief = readAnonBrief(tempId)
    if (!brief) {
      router.replace('/generate')
      return
    }
    setData(brief)
    setLoading(false)
  }, [tempId, router])

  // On mount: execute any pending action from a previous auth redirect
  useEffect(() => {
    if (status === 'loading' || !data) return
    let raw: string | null = null
    try {
      raw = sessionStorage.getItem(PENDING_ACTION_KEY)
    } catch {}
    if (!raw) return

    try {
      sessionStorage.removeItem(PENDING_ACTION_KEY)
    } catch {}

    if (status === 'unauthenticated') return

    const action = raw as PendingAction
    if (action === 'save') {
      performSave(data)
    } else if (action === 'export') {
      performExport(data)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, data])

  async function performSave(brief: AnonBriefData) {
    if (!brief) return
    setSaving(true)
    try {
      const res = await fetch('/api/brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brief.input),
      })
      const resData: Record<string, unknown> = await res.json()
      if (!res.ok) throw new Error(typeof resData.error === 'string' ? resData.error : 'Save failed')

      const resBrief = resData.brief as Record<string, unknown> | undefined
      const briefId = resBrief?.id as string | undefined
      if (!briefId) throw new Error('No brief ID returned')

      removeAnonBrief(tempId)
      track('brief_created')
      router.push(`/brief/${briefId}`)
    } catch (err) {
      const classified = classifyError(err)
      alert(classified.message)
    } finally {
      setSaving(false)
    }
  }

  async function performExport(brief: AnonBriefData) {
    if (!brief) return
    const md = briefToMarkdown(brief.output)
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'brief.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    track('brief_exported', { export_format: 'markdown' })
  }

  function gateAction(action: PendingAction) {
    pendingActionRef.current = action
    try {
      sessionStorage.setItem(PENDING_ACTION_KEY, action)
    } catch {}
    setShowAuthGate(true)
  }

  const handleSave = useCallback(async () => {
    if (!data) return
    if (!isAuthenticated) {
      gateAction('save')
      return
    }
    await performSave(data)
  }, [data, isAuthenticated, tempId, router])

  const handleExport = useCallback(async () => {
    if (!data) return
    if (!isAuthenticated) {
      gateAction('export')
      return
    }
    await performExport(data)
  }, [data, isAuthenticated, tempId])

  const handleCopy = useCallback(async () => {
    if (!data) return
    const md = briefToMarkdown(data.output)
    await copyToClipboard(md)
    track('brief_copied')
  }, [data])

  const handleRefine = useCallback(async (mode: RefinementMode) => {
    if (!data || isRefining) return
    setIsRefining(true)
    setRefinementMode(mode)
    try {
      const res = await fetch('/api/brief/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data.input, refinementMode: mode, currentOutput: data.output }),
      })
      const resData: Record<string, unknown> = await res.json()
      if (!res.ok) throw new Error(typeof resData.error === 'string' ? resData.error : 'Refinement failed')

      const output = resData.output as BriefOutput | undefined
      if (!output) throw new Error('No refined output returned')

      updateAnonBrief(tempId, output)
      setData((prev) => prev ? { ...prev, output } : prev)
      track('brief_refined', { refinement_mode: mode })
    } catch (err) {
      const classified = classifyError(err, true)
      alert(classified.message)
    } finally {
      setIsRefining(false)
      setRefinementMode(null)
    }
  }, [data, isRefining, tempId])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 max-w-3xl mx-auto w-full p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <p className="font-body-medium text-on-surface-variant">Brief not found.</p>
        <Link
          href="/generate"
          className="px-4 py-2 bg-primary text-on-primary font-label-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Create a New Brief
        </Link>
      </div>
    )
  }

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full p-6 space-y-6">
      {showAuthGate && (
        <AuthGateModal
          callbackUrl={`/preview/${tempId}`}
          onClose={() => {
            setShowAuthGate(false)
            pendingActionRef.current = null
            try { sessionStorage.removeItem(PENDING_ACTION_KEY) } catch {}
          }}
        />
      )}

      {isRefining && refinementMode && <RefinementOverlay mode={refinementMode} />}

      <BriefViewer
        output={data.output}
        readOnly
        showActions
        onExport={handleExport}
        onCopy={handleCopy}
        onSave={handleSave}
        onRefine={handleRefine}
        isRefining={isRefining}
      />
    </div>
  )
}
