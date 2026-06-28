export interface InferredBriefMetadata {
  contentType: string
  targetAudience: string
  funnelStage: string
}

export const DEFAULT_BRIEF_METADATA: InferredBriefMetadata = {
  contentType: 'Blog Post',
  targetAudience: 'General Audience',
  funnelStage: 'TOFU - Awareness',
}

type ContentTypeRule = {
  patterns: string[]
  value: string
}

const CONTENT_TYPE_RULES: ContentTypeRule[] = [
  { patterns: ['landing page'], value: 'Landing Page' },
  { patterns: ['newsletter'], value: 'Email' },
  { patterns: ['linkedin'], value: 'LinkedIn Post' },
  { patterns: ['x thread'], value: 'X Thread' },
  { patterns: ['twitter', 'tweet'], value: 'X Thread' },
  { patterns: ['youtube', 'yt'], value: 'YouTube Script' },
  { patterns: ['facebook', 'fb'], value: 'Facebook Post' },
  { patterns: ['blog', 'article'], value: 'Blog Post' },
  { patterns: ['email'], value: 'Email' },
]

function inferContentType(prompt: string): string {
  const normalized = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')

  for (const rule of CONTENT_TYPE_RULES) {
    for (const pattern of rule.patterns) {
      if (normalized.includes(` ${pattern} `) || normalized.startsWith(`${pattern} `) || normalized.endsWith(` ${pattern}`) || normalized === pattern) {
        return rule.value
      }
    }
  }

  return DEFAULT_BRIEF_METADATA.contentType
}

export function inferBriefMetadata(prompt: string): InferredBriefMetadata {
  return {
    contentType: inferContentType(prompt),
    targetAudience: DEFAULT_BRIEF_METADATA.targetAudience,
    funnelStage: DEFAULT_BRIEF_METADATA.funnelStage,
  }
}
