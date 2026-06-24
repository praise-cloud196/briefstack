'use client'

import { useEffect } from 'react'
import type { RefinementMode } from '@/types'

const TITLES: Record<RefinementMode, string> = {
  shorter: 'Making it Shorter',
  strategic: 'Making it More Strategic',
  actionable: 'Making it More Actionable',
  tone: 'Adjusting Tone',
}

const MESSAGES: Record<RefinementMode, string> = {
  shorter: 'Condensing your brief while preserving the key insights.',
  strategic: 'Strengthening the strategic thinking behind your brief.',
  actionable: 'Making the recommendations clearer, more practical, and easier to execute.',
  tone: 'Refining the writing style to better match the selected tone.',
}

interface RefinementOverlayProps {
  mode: RefinementMode
}

export function RefinementOverlay({ mode }: RefinementOverlayProps) {
  useEffect(() => {
    const el = document.getElementById('refinement-overlay')
    if (el) el.focus()
  }, [])

  return (
    <div
      id="refinement-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="alert"
      aria-busy="true"
      aria-label={TITLES[mode]}
      tabIndex={0}
      onKeyDown={(e) => { e.preventDefault() }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative bg-surface rounded-xl shadow-lg p-8 max-w-sm w-full mx-4 flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="font-title-medium text-on-surface">{TITLES[mode]}</p>
          <p className="font-body-small text-on-surface-variant">{MESSAGES[mode]}</p>
        </div>
      </div>
    </div>
  )
}
