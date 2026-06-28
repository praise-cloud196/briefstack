'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { BriefPanelProvider } from '@/components/brief-panel-context'
import type { ReactNode } from 'react'

export function AppLayoutClient({ children }: { children: ReactNode }) {
  const { status } = useSession()

  if (status === 'unauthenticated') {
    redirect('/auth')
  }

  if (status === 'loading') {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <BriefPanelProvider>
      <Navbar />
      <main className="flex-1 flex flex-col bg-white">{children}</main>
    </BriefPanelProvider>
  )
}
