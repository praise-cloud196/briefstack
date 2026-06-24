type EventName =
  | 'brief_created'
  | 'brief_refined'
  | 'brief_copied'
  | 'brief_exported'
  | 'sample_brief_loaded'
  | 'generation_failed'
  | 'time_to_first_brief'

type EventProperties = Record<string, string | number | boolean | undefined>

const ENDPOINT = '/api/analytics/track'

let _firstBriefStart: number | null = null

export function markFirstBriefStart(): void {
  if (_firstBriefStart === null) {
    _firstBriefStart = performance.now()
    devLog('first_brief_timer_started')
  }
}

export function trackFirstBriefComplete(): void {
  if (_firstBriefStart !== null) {
    const elapsedMs = Math.round(performance.now() - _firstBriefStart)
    track('time_to_first_brief', { elapsed_ms: elapsedMs })
    _firstBriefStart = null
    devLog('first_brief_timer_stopped', { elapsed_ms: elapsedMs })
  }
}

export function resetFirstBriefTimer(): void {
  _firstBriefStart = null
}

function devLog(name: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${name}`, data ?? '')
  }
}

export function mapErrorCode(code: string): string {
  switch (code) {
    case 'NETWORK_ERROR': return 'network'
    case 'RATE_LIMITED': return 'rate_limit'
    case 'AI_TIMEOUT': return 'timeout'
    default: return 'server_error'
  }
}

export function track(name: EventName, properties?: EventProperties): void {
  try {
    const payload = {
      name,
      properties: properties ?? {},
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
    }

    devLog(name, payload)

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
      navigator.sendBeacon(ENDPOINT, blob)
    }
  } catch {
    // Analytics must never interrupt the user experience
  }
}
