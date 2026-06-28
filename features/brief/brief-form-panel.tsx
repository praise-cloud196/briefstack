'use client'

import { useEffect, useRef, type ReactNode } from 'react'

interface BriefFormPanelProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export function BriefFormPanel({ isOpen, onClose, children }: BriefFormPanelProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      requestAnimationFrame(() => {
        const first = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        first?.focus()
      })
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={modalRef}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Customize Your Brief</h2>
          <button
            onClick={onClose}
            className="modal-close"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="modal-description">
          Add a few details and create a complete content brief in seconds.
        </p>
        {children}
      </div>
    </div>
  )
}
