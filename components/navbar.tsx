'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  if (pathname === '/auth') return null

  return (
    <nav className="sticky top-0 z-50 bg-white py-1">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4 sm:gap-8">
          <Link
            href={session ? '/dashboard' : '/'}
            className="font-title-large text-primary"
          >
            BriefStack
          </Link>

          {session && (
            <Link
              href="/history"
              className={`font-body-large transition-colors ${
                pathname === '/history'
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              History
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              <span className="font-body-medium text-on-surface-variant hidden sm:block">
                {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="font-body-large text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="font-body-large text-primary hover:underline"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
