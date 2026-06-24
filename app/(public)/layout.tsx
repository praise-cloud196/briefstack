'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

function PublicNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAuthPage = pathname === '/auth'
  const isSignup = searchParams.get('mode') === 'signup'

  return (
    <nav className="sticky top-0 z-50 bg-white py-1">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-title-large text-primary"
        >
          BriefStack
        </Link>

        <div className="flex items-center gap-4">
          {(!isAuthPage || isSignup) && (
            <Link
              href="/auth"
              className="font-body-large text-primary hover:underline"
            >
              Sign In
            </Link>
          )}
          {!isAuthPage && (
            <Link
              href="/generate"
              className="inline-flex items-center px-4 py-1.5 bg-primary text-on-primary font-body-large rounded-lg hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-opacity"
            >
              Create Brief
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Suspense fallback={null}>
        <PublicNav />
      </Suspense>
      <main className="flex-1 flex flex-col bg-white">{children}</main>
    </>
  )
}
