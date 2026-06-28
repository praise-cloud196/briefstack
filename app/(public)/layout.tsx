'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { BriefPanelProvider, useBriefPanel } from '@/components/brief-panel-context'

function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = stored === 'dark' || (!stored && prefersDark)
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  if (!mounted) return <div className="w-[34px] h-[34px]" />

  return (
    <button
      onClick={toggle}
      className="nav-theme-toggle"
      title="Toggle theme"
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

function PublicNav() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { open: openPanel } = useBriefPanel()
  const isAuthPage = pathname === '/auth'
  const isSignup = searchParams.get('mode') === 'signup'

  const handleCreateBrief = () => {
    if (pathname !== '/') {
      router.push('/')
    }
    openPanel()
  }

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        <span className="nav-logo-icon">
          <span></span><span></span><span></span>
        </span>
        BriefStack
      </Link>

      <div className="nav-right">
        <ThemeToggle />
        {(!isAuthPage || isSignup) && (
          <Link
            href="/auth"
            className="nav-btn-ghost"
          >
            Sign In
          </Link>
        )}
        {!isAuthPage && (
          <button
            onClick={handleCreateBrief}
            className="nav-btn-primary"
          >
            Create Brief
          </button>
        )}
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
    <BriefPanelProvider>
      <Suspense fallback={null}>
        <PublicNav />
      </Suspense>
      <main className="flex-1 flex flex-col">{children}</main>
    </BriefPanelProvider>
  )
}
