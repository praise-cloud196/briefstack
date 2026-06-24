import type { BriefOutput } from '@/types'

const REQUIRED_SECTIONS: (keyof BriefOutput)[] = [
  'briefSummary',
  'audienceAnalysis',
  'searchIntent',
  'contentGoal',
  'recommendedContentAngle',
  'questionsToAnswer',
  'suggestedContentStructure',
  'ctaRecommendation',
]

export function validateBriefOutput(raw: unknown): BriefOutput {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid brief output: not an object')
  }

  const obj = raw as Record<string, unknown>

  for (const key of REQUIRED_SECTIONS) {
    if (!(key in obj)) {
      throw new Error(`Invalid brief output: missing section "${key}"`)
    }
  }

  const output: BriefOutput = {
    briefSummary: String(obj.briefSummary ?? ''),
    audienceAnalysis: String(obj.audienceAnalysis ?? ''),
    searchIntent: String(obj.searchIntent ?? ''),
    contentGoal: String(obj.contentGoal ?? ''),
    recommendedContentAngle: String(obj.recommendedContentAngle ?? ''),
    questionsToAnswer: ensureStringArray(obj.questionsToAnswer),
    suggestedContentStructure: ensureStringArray(obj.suggestedContentStructure),
    ctaRecommendation: String(obj.ctaRecommendation ?? ''),
  }

  if (obj.metaTitle != null) {
    output.metaTitle = String(obj.metaTitle)
  }
  if (obj.metaDescription != null) {
    output.metaDescription = String(obj.metaDescription)
  }

  return output
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item ?? ''))
}
