export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'RATE_LIMITED'
  | 'AI_TIMEOUT'
  | 'AI_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'SERVER_ERROR'

export interface ClassifiedError {
  message: string
  code: ErrorCode
  isRetryable: boolean
}

export interface ApiErrorResponse {
  error: string
  code?: ErrorCode
}

const ERROR_CODES: readonly ErrorCode[] = [
  'NETWORK_ERROR', 'RATE_LIMITED', 'AI_TIMEOUT', 'AI_ERROR',
  'VALIDATION_ERROR', 'UNAUTHORIZED', 'NOT_FOUND', 'SERVER_ERROR',
] as const

const CONTEXTUAL_MESSAGES: Record<ErrorCode, { create: string; refine: string }> = {
  NETWORK_ERROR: {
    create: 'Could not connect to the server. Check your internet connection and try again.',
    refine: 'Could not connect to the server. Check your internet connection and try again.',
  },
  RATE_LIMITED: {
    create: 'Too many requests. Please wait a moment, then try again.',
    refine: 'Too many requests. Please wait a moment, then try again.',
  },
  AI_TIMEOUT: {
    create: 'The AI took too long to respond. Please try again.',
    refine: 'The AI took too long to respond. Please try again.',
  },
  AI_ERROR: {
    create: 'The AI encountered an error generating your brief. Please try again.',
    refine: 'The AI encountered an error during refinement. Please try again.',
  },
  VALIDATION_ERROR: {
    create: 'Please check your inputs and try again.',
    refine: 'This brief could not be refined. Please try creating a new one.',
  },
  UNAUTHORIZED: {
    create: 'Your session has expired. Please sign in again.',
    refine: 'Your session has expired. Please sign in again.',
  },
  NOT_FOUND: {
    create: 'The brief could not be found. It may have been deleted.',
    refine: 'The brief could not be found. It may have been deleted.',
  },
  SERVER_ERROR: {
    create: 'We couldn\'t generate your brief right now. Please try again.',
    refine: 'Refinement failed due to a server issue. Please try again.',
  },
}

function isErrorCode(value: string): value is ErrorCode {
  return (ERROR_CODES as readonly string[]).includes(value)
}

function extractCode(err: unknown): { rawMessage: string; code: ErrorCode } {
  if (err instanceof TypeError) {
    return { rawMessage: err.message, code: 'NETWORK_ERROR' }
  }

  const rawMessage = err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error'

  const errorWithCode = err as { code?: ErrorCode; message?: string }
  if (errorWithCode.code && isErrorCode(errorWithCode.code)) {
    return { rawMessage, code: errorWithCode.code }
  }

  const lower = rawMessage.toLowerCase()

  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
    return { rawMessage, code: 'RATE_LIMITED' }
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return { rawMessage, code: 'AI_TIMEOUT' }
  }
  if (lower.includes('unauthorized') || lower.includes('session')) {
    return { rawMessage, code: 'UNAUTHORIZED' }
  }
  if (lower.includes('not found') || lower.includes("couldn't be found")) {
    return { rawMessage, code: 'NOT_FOUND' }
  }
  if (lower.includes('missing required') || lower.includes('invalid request') || lower.includes('invalid json') || lower.includes('invalid body')) {
    return { rawMessage, code: 'VALIDATION_ERROR' }
  }
  if (lower.includes('deepseek') || lower.includes('ai response') || lower.includes('invalid brief') || lower.includes('ai error')) {
    return { rawMessage, code: 'AI_ERROR' }
  }

  return { rawMessage, code: 'SERVER_ERROR' }
}

export function classifyError(err: unknown, isRefinement: boolean = false): ClassifiedError {
  const { code } = extractCode(err)
  const context = isRefinement ? 'refine' : 'create'
  return {
    message: CONTEXTUAL_MESSAGES[code][context],
    code,
    isRetryable: code !== 'VALIDATION_ERROR' && code !== 'UNAUTHORIZED' && code !== 'NOT_FOUND',
  }
}

export function classifyBackendError(error: unknown): { error: string; code: ErrorCode } {
  const message = error instanceof Error ? error.message : 'Generation failed'

  if (message.startsWith('DeepSeek API error')) {
    const lower = message.toLowerCase()
    if (lower.includes('429') || lower.includes('rate limit')) {
      return { error: 'Too many requests. Please wait a moment and try again.', code: 'RATE_LIMITED' }
    }
    if (lower.includes('timeout') || lower.includes('timed out')) {
      return { error: 'AI request timed out. Please try again.', code: 'AI_TIMEOUT' }
    }
    return { error: 'AI service error. Please try again.', code: 'AI_ERROR' }
  }

  if (message === 'AI response was not valid JSON' || message === 'Invalid brief output') {
    return { error: message, code: 'AI_ERROR' }
  }

  if (message.startsWith('Missing required fields')) {
    return { error: message, code: 'VALIDATION_ERROR' }
  }

  if (message === 'API key not configured') {
    return { error: message, code: 'SERVER_ERROR' }
  }

  return { error: 'Generation failed. Please try again.', code: 'SERVER_ERROR' }
}
