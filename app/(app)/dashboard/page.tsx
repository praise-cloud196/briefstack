'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { BriefForm } from '@/features/brief/brief-form'

export default function DashboardPage() {
  const { status } = useSession()

  if (status === 'unauthenticated') redirect('/auth')
  if (status === 'loading') return null

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full p-6">
      <div className="mb-8">
        <h1 className="font-headline-small text-on-surface">Dashboard</h1>
        <p className="font-body-medium text-on-surface-variant mt-1">Create a new content brief.</p>
      </div>

      <BriefForm />
    </div>
  )
}
