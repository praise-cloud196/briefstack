export interface BriefInput {
  topic: string
  targetAudience: string
  contentType: string
  funnelStage: string
  businessGoal?: string
  productContext?: string
  brandVoice?: string
}

export interface BriefSection {
  heading: string
  content: string
}

export interface BriefOutput {
  briefSummary: string
  audienceAnalysis: string
  searchIntent: string
  contentGoal: string
  recommendedContentAngle: string
  questionsToAnswer: string[]
  suggestedContentStructure: string[]
  ctaRecommendation: string
  metaTitle?: string
  metaDescription?: string
}

export interface Brief {
  id: string
  userId: string
  topic: string
  targetAudience: string
  contentType: string
  funnelStage: string
  businessGoal: string | null
  productContext: string | null
  brandVoice: string | null
  output: BriefOutput
  createdAt: Date
  updatedAt: Date
}

export interface BriefListItem {
  id: string
  topic: string
  contentType: string
  funnelStage: string
  createdAt: Date
}

export type RefinementMode = 'shorter' | 'strategic' | 'actionable' | 'tone'

export type ExportFormat = 'markdown' | 'copy'
