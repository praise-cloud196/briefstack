'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface BriefPanelContextType {
  isOpen: boolean
  open: () => void
  close: () => void
}

const BriefPanelContext = createContext<BriefPanelContextType>({
  isOpen: false,
  open: () => {},
  close: () => {},
})

export function BriefPanelProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  return (
    <BriefPanelContext.Provider value={{ isOpen, open, close }}>
      {children}
    </BriefPanelContext.Provider>
  )
}

export function useBriefPanel() {
  return useContext(BriefPanelContext)
}
