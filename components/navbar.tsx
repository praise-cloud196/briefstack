'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { ThemeToggle } from '@/components/theme-toggle'

export function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  if (pathname === '/auth') return null

  return (
    <nav className="nav">
      <Link href="/dashboard" className="nav-logo">
        <span className="nav-logo-icon">
          <span></span><span></span><span></span>
        </span>
        BriefStack
      </Link>

      <div className="nav-right">
        <ThemeToggle />
        <Link
          href="/history"
          className="nav-btn-ghost"
        >
          History
        </Link>
        {session && (
          <span className="hidden sm:inline" style={{ fontSize: '0.85rem', color: 'var(--nav-text-sub)', fontWeight: 500 }}>
            {session.user?.name || session.user?.email}
          </span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="nav-btn-ghost"
        >
          Sign Out
        </button>
      </div>
    </nav>
  )
}
