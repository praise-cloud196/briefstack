import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import type { BriefInput, BriefOutput, RefinementMode } from '@/types'
import { buildPrompt } from './prompt'
import { validateBriefOutput } from './validate'

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
  name: 'deepseek',
})

export async function generateBrief(input: BriefInput, refinementMode?: RefinementMode, currentOutput?: BriefOutput): Promise<BriefOutput> {
  const { system, user } = buildPrompt(input, refinementMode, currentOutput)

  const temperature = refinementMode ? 0.3 : 0.7

  console.log('[BRIEF] ========== GENERATION START ==========')
  console.log('[BRIEF] Refinement mode:', refinementMode ?? '(none)')
  console.log('[BRIEF] Input:', JSON.stringify(input, null, 2))
  console.log('[BRIEF] Current output provided:', !!currentOutput)
  console.log('[BRIEF] System prompt length:', system.length, 'chars')
  console.log('[BRIEF] User prompt length:', user.length, 'chars')
  console.log('[BRIEF] Model: deepseek-v4-flash, temperature:', temperature, 'maxOutputTokens: 4096')

  const start = performance.now()
  const perf: Record<string, number> = {}

  let text: string
  let usage: { inputTokens?: number; outputTokens?: number } | undefined

  try {
    const response = await generateText({
      model: deepseek.chat('deepseek-v4-flash'),
      system,
      prompt: user,
      temperature,
      maxOutputTokens: 4096,
    })
    text = response.text
    usage = response.usage
    console.log(`[BRIEF] Endpoint URL: https://api.deepseek.com/chat/completions`)
    console.log(`[BRIEF] Model: deepseek-v4-flash (via .chat() — Chat Completions API)`)
  } catch (err) {
    const elapsed = ((performance.now() - start) / 1000).toFixed(2)
    console.error(`[BRIEF] DeepSeek API call FAILED after ${elapsed}s`)
    console.error('[BRIEF] Error name:', (err as Error)?.name || 'N/A')
    console.error('[BRIEF] Error message:', (err as Error)?.message || 'N/A')
    console.error('[BRIEF] Stack trace:', (err as Error)?.stack || 'N/A')
    if (typeof err === 'object' && err !== null) {
      console.error('[BRIEF] Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
    }
    throw new Error(`DeepSeek API error: ${(err as Error)?.message || 'Unknown error'}`)
  }

  const elapsed = ((performance.now() - start) / 1000).toFixed(2)

  console.log(`[BRIEF] DeepSeek response received in ${elapsed}s`)
  perf.llmRequest = performance.now() - start
  console.log('[BRIEF] Token usage — prompt:', usage?.inputTokens, 'completion:', usage?.outputTokens)
  console.log('[BRIEF] Raw response full text:')
  console.log('[BRIEF] --- BEGIN RAW RESPONSE ---')
  console.log(text)
  console.log('[BRIEF] --- END RAW RESPONSE ---')
  console.log('[BRIEF] Raw response length:', text.length, 'characters')

  // Check for truncation: if response doesn't end with expected JSON closing
  const trimmedEnd = text.trimEnd()
  if (!trimmedEnd.endsWith('}') && !trimmedEnd.endsWith(']')) {
    console.warn('[BRIEF] WARNING: Response does not end with } or ] — possible truncation or incomplete JSON')
    console.warn('[BRIEF] Last 50 chars of response:', JSON.stringify(text.slice(-50)))
  }

  // Check for markdown wrapping patterns
  const markdownPatterns = ['```', '``', '`json', '`javascript', '`typescript']
  for (const pat of markdownPatterns) {
    if (text.includes(pat)) {
      console.warn(`[BRIEF] WARNING: Response contains markdown fence pattern "${pat}"`)
    }
  }

  // Check for reasoning tokens leaking into response
  if (text.includes('<reasoning>') || text.includes('</reasoning>') || text.includes('Reasoning:')) {
    console.warn('[BRIEF] WARNING: Possible reasoning tokens leaking into response body')
  }

  // Check for undefined/null literal strings
  if (text.includes('undefined') || text.includes('null') || text.includes('"undefined"') || text.includes('"null"')) {
    console.warn('[BRIEF] WARNING: Response contains literal "undefined" or "null" strings')
  }

  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*$/g, '')
    .replace(/^`+/, '')
    .replace(/`+$/, '')
    .trim()

  console.log('[BRIEF] Cleaned response length:', cleaned.length, 'characters')
  console.log('[BRIEF] Cleaned response (first 300):', cleaned.slice(0, 300))
  console.log('[BRIEF] Cleaned response (last 300):', cleaned.slice(-300))

  const tParseStart = performance.now()
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
    perf.parsing = performance.now() - tParseStart
    console.log('[BRIEF] JSON parsed successfully')
    console.log('[BRIEF] Parsed result keys:', Object.keys(parsed as object))
    console.log('[BRIEF] Parsed result (truncated):', JSON.stringify(parsed).slice(0, 1000))
  } catch (parseErr) {
    console.error('[BRIEF] JSON parse FAILURE')
    console.error('[BRIEF] Parse error name:', (parseErr as Error)?.name || 'N/A')
    console.error('[BRIEF] Parse error message:', (parseErr as Error)?.message || 'N/A')
    console.error('[BRIEF] Parse error stack:', (parseErr as Error)?.stack || 'N/A')
    console.error('[BRIEF] Cleaned text that failed to parse (full):')
    console.error(cleaned)
    console.error('[BRIEF] Raw text (first 500):', text.slice(0, 500))
    console.error('[BRIEF] Raw text (last 500):', text.slice(-500))

    // Attempt to find the position of failure
    const match = (parseErr as Error)?.message?.match(/position\s+(\d+)/i)
    if (match) {
      const pos = parseInt(match[1], 10)
      console.error(`[BRIEF] Parse failure around position ${pos}:`)
      console.error('[BRIEF] Context before:', cleaned.slice(Math.max(0, pos - 100), pos))
      console.error('[BRIEF] Context after:', cleaned.slice(pos, pos + 100))
    }

    throw new Error('AI response was not valid JSON')
  }

  console.log('[BRIEF] ========== VALIDATION PHASE ==========')

  const tValStart = performance.now()
  try {
    const validated = validateBriefOutput(parsed)
    perf.validation = performance.now() - tValStart
    console.log('[BRIEF] Validation PASSED')

    if (process.env.NODE_ENV === 'development') {
      console.log('[PERF] ========== GENERATE TIMING ==========')
      console.log(`[PERF] LLM request: ${(perf.llmRequest / 1000).toFixed(1)}s`)
      if (perf.parsing) console.log(`[PERF] Response parsing: ${perf.parsing.toFixed(0)}ms`)
      console.log(`[PERF] Validation: ${perf.validation.toFixed(0)}ms`)
      console.log('[PERF] ===================================')
    }

    return validated
  } catch (validationErr) {
    console.error('[BRIEF] Validation FAILED')
    console.error('[BRIEF] Validation error:', (validationErr as Error)?.message || 'N/A')
    console.error('[BRIEF] Validation stack:', (validationErr as Error)?.stack || 'N/A')
    console.error('[BRIEF] Parsed object keys:', Object.keys(parsed as object))
    console.error('[BRIEF] Parsed object (full):', JSON.stringify(parsed, null, 2))
    
    // Check each required field individually
    const obj = parsed as Record<string, unknown>
    const requiredFields = [
      'briefSummary', 'audienceAnalysis', 'searchIntent', 'contentGoal',
      'recommendedContentAngle', 'questionsToAnswer', 'suggestedContentStructure',
      'ctaRecommendation', 'metaTitle', 'metaDescription'
    ]
    for (const field of requiredFields) {
      const val = obj[field]
      console.error(`[BRIEF]   Field "${field}": present=${field in obj}, type=${typeof val}, value=${val !== undefined ? JSON.stringify(val).slice(0, 200) : 'UNDEFINED'}`)
    }

    throw validationErr
  }
}
