'use client'

import { Suspense, useState, useEffect, type FormEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn, getProviders, getCsrfToken } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  )
  const returnUrl = searchParams.get('callbackUrl')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // --- NETWORK DEBUG: monkey-patch fetch for /api/auth/* calls ---
  useEffect(() => {
    const originalFetch = window.fetch.bind(window)
    const authPaths = ['/api/auth/providers', '/api/auth/csrf', '/api/auth/callback', '/api/auth/session', '/api/auth/signout', '/api/auth/error']

    ;(window as any).__NEXTAUTH_DEBUG_URL = process.env.NEXT_PUBLIC_NEXTAUTH_URL ?? '(no NEXT_PUBLIC_NEXTAUTH_URL)'

    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const isAuth = authPaths.some(p => url.includes(p))

      if (isAuth) {
        console.log(`[NET] >>> ${init?.method || 'GET'} ${url}`, {
          bodyPreview: init?.body ? String(init.body).substring(0, 200) : undefined,
          contentType: (init?.headers as any)?.['Content-Type'],
        })
      }

      let response: Response
      try {
        response = await originalFetch(input, init)
      } catch (netErr) {
        if (isAuth) console.error(`[NET] <<< NETWORK ERROR ${url}:`, netErr)
        throw netErr
      }

      if (isAuth) {
        console.log(`[NET] <<< ${response.status} ${url}`, {
          ok: response.ok,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
        })

        if (url.includes('/api/auth/callback/credentials')) {
          try {
            const cloned = response.clone()
            const rawText = await cloned.text()
            console.log(`[NET] BODY (callback/credentials):`, rawText.substring(0, 1000))
            try {
              const parsed = JSON.parse(rawText)
              console.log(`[NET] PARSED:`, {
                hasUrl: 'url' in parsed,
                url: parsed.url,
                urlType: typeof parsed.url,
                urlIsAbsolute: typeof parsed.url === 'string' ? parsed.url.startsWith('http') : false,
              })
              // Test URL constructor
              if (parsed.url) {
                try {
                  new URL(parsed.url)
                  console.log(`[NET] new URL(data.url) OK`)
                } catch (urlErr) {
                  console.error(`[NET] *** new URL(data.url) CRASHED ***:`, (urlErr as Error).message)
                }
              }
            } catch { /* not json, skip */ }
          } catch { /* can't read body */ }
        } else if (url.includes('/api/auth/providers')) {
          try {
            const cloned = response.clone()
            const providersData = await cloned.json()
            console.log(`[NET] providers keys:`, Object.keys(providersData))
          } catch { /* skip */ }
        } else if (url.includes('/api/auth/session')) {
          try {
            const cloned = response.clone()
            const sessionData = await cloned.json()
            console.log(`[NET] session data:`, sessionData)
          } catch { /* skip */ }
        } else if (url.includes('/api/auth/error') || url.includes('/api/auth/signin')) {
          console.log(`[NET] REDIRECT DETECTED — navigating to ${url}`)
        }
      }

      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  // --- DETECT REDIRECT LOOPS ---
  useEffect(() => {
    const key = '__auth_redirect_count'
    const count = parseInt(sessionStorage.getItem(key) ?? '0', 10)
    sessionStorage.setItem(key, String(count + 1))
    if (count > 3) {
      sessionStorage.removeItem(key)
      console.error('[AUTH] *** REDIRECT LOOP DETECTED *** page has reloaded >3 times in a row')
    }
    return () => { /* cleanup happens on unmount */ }
  }, [])

  // Sync mode with URL search params on navigation
  useEffect(() => {
    const urlMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
    setMode(urlMode)
  }, [searchParams])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const callbackUrl = window.location.href
    console.log('[AUTH] === handleSubmit ===', {
      mode,
      email,
      callbackUrl,
      NEXTAUTH_URL: (window as any).__NEXTAUTH_DEBUG_URL ?? 'not set',
      timestamp: new Date().toISOString(),
    })

    try {
      // --- PRE-CHECK: providers ---
      console.log('[AUTH] fetching providers...')
      let providers: any = null
      try {
        providers = await getProviders()
        console.log('[AUTH] providers result:', providers)
      } catch (provErr) {
        console.error('[AUTH] getProviders() threw:', provErr)
      }
      if (!providers) {
        throw new Error(
          `getProviders() returned null — check /api/auth/providers endpoint. Is NextAuth handler configured correctly?`
        )
      }
      console.log('[AUTH] credentials provider config:', providers?.credentials)

      // --- PRE-CHECK: CSRF ---
      console.log('[AUTH] fetching csrf token...')
      let csrfToken: string | undefined
      try {
        csrfToken = await getCsrfToken()
        console.log('[AUTH] csrfToken:', csrfToken ? `"${csrfToken.substring(0, 20)}..."` : 'null')
      } catch (csrfErr) {
        console.error('[AUTH] getCsrfToken() threw:', csrfErr)
      }
      if (!csrfToken) {
        console.warn('[AUTH] csrfToken was null — may cause silent failure')
      }

      // --- SIGNUP ---
      if (mode === 'signup') {
        console.log('[AUTH] registering user...')
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: name || undefined }),
        })

        if (!res.ok) {
          const data = await res.json()
          console.error('[AUTH] registration failed:', { status: res.status, data })
          // 409: email already exists — stop completely, show guidance
          if (res.status === 409) {
            throw new Error('An account with this email already exists. Please sign in.')
          }
          throw new Error(data.error || 'Registration failed')
        }
        console.log('[AUTH] registration succeeded')
      }

      // --- SIGNIN ---
      console.log('[AUTH] calling signIn("credentials", { redirect: false })...')
      console.log('[AUTH] signIn args:', {
        provider: 'credentials',
        email,
        hasPassword: !!password,
        redirect: false,
      })

      let result: any
      try {
        result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        })
      } catch (signInErr) {
        console.error('[AUTH] signIn() THREW an exception:', {
          name: signInErr instanceof Error ? signInErr.name : typeof signInErr,
          message: signInErr instanceof Error ? signInErr.message : String(signInErr),
          stack: signInErr instanceof Error ? signInErr.stack : undefined,
        })
        throw signInErr
      }

      console.log('[AUTH] signIn() returned:', {
        hasResult: !!result,
        ok: result?.ok,
        status: result?.status,
        error: result?.error,
        url: result?.url,
        urlIsAbsolute: result?.url ? result.url.startsWith('http') : 'N/A',
        urlType: result?.url ? typeof result.url : 'N/A',
      })

      // --- data.url investigation ---
      if (result?.url) {
        try {
          const parsed = new URL(result.url)
          console.log('[AUTH] data.url parsed OK:', {
            href: parsed.href,
            origin: parsed.origin,
            pathname: parsed.pathname,
            search: parsed.search,
            errorParam: parsed.searchParams.get('error'),
          })
        } catch (urlErr) {
          console.error('[AUTH] *** new URL(data.url) CRASHED ***:', {
            url: result.url,
            error: urlErr instanceof Error ? urlErr.message : String(urlErr),
          })
        }
      }

      if (result?.error) {
        console.log('[AUTH] signIn reported error:', result.error)
        throw new Error(result.error === 'CredentialsSignin'
          ? 'Invalid email or password'
          : result.error
        )
      }

      if (!result?.ok) {
        console.error('[AUTH] signIn returned !ok:', { status: result?.status, error: result?.error })
        throw new Error(`Sign-in failed (status ${result?.status})`)
      }

      if (mode === 'signup') {
        sessionStorage.setItem('briefstack_welcome', 'true')
      }

      console.log('[AUTH] signIn OK, navigating...')
      router.push(returnUrl || '/dashboard')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      console.error('[AUTH] handleSubmit caught error:', {
        message,
        stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : undefined,
      })
      setError(message)
    } finally {
      setLoading(false)
      console.log('[AUTH] === handleSubmit done ===')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="font-display-medium text-on-surface">BriefStack</h1>
          <p className="font-body-medium text-on-surface-variant mt-2">
            Content strategy, structured.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className="font-label-medium text-on-surface block mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-outline rounded-lg bg-surface font-body-medium text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary transition-shadow"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="font-label-medium text-on-surface block mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-outline rounded-lg bg-surface font-body-medium text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary transition-shadow"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="font-label-medium text-on-surface block mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-outline rounded-lg bg-surface font-body-medium text-on-surface placeholder:text-on-surface-variant outline-none focus:ring-2 focus:ring-primary transition-shadow"
              placeholder="At least 8 characters"
            />
          </div>

          {mode === 'signin' && (
            <div className="text-right -mt-2">
              <Link
                href="/auth/reset"
                className="font-label-small text-primary underline-offset-4 decoration-1 hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm transition-all duration-150 ease-out"
              >
                Forgot password?
              </Link>
            </div>
          )}

          {error && (
            <div className="font-body-small text-error space-y-2" role="alert">
              <p>{error}</p>
              {mode === 'signup' && (
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError('') }}
                  className="font-label-small text-primary underline-offset-4 decoration-1 transition-all duration-150 ease-out cursor-pointer hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                >
                  Sign in instead
                </button>
              )}
              {process.env.NODE_ENV === 'development' && (
                <details className="text-xs opacity-70 mt-1 cursor-pointer">
                  <summary className="select-none">Debug info</summary>
                  <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] leading-tight">
                    email: {email || '(empty)'}{'\n'}
                    callbackUrl: {typeof window !== 'undefined' ? window.location.href : 'N/A'}{'\n'}
                    NEXTAUTH_URL: {(window as any).__NEXTAUTH_DEBUG_URL ?? 'N/A'}{'\n'}
                    redirectCount: {typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('__auth_redirect_count') : 'N/A'}
                  </pre>
                </details>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary text-on-primary font-label-medium rounded-lg hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-opacity"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-6 font-body-small text-on-surface-variant">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signup'); setError('') }}
                className="font-label-small text-primary underline-offset-4 decoration-1 transition-all duration-150 ease-out cursor-pointer hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setMode('signin'); setError('') }}
                className="font-label-small text-primary underline-offset-4 decoration-1 transition-all duration-150 ease-out cursor-pointer hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuthForm />
    </Suspense>
  )
}
