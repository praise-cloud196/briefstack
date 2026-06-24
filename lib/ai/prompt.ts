import type { BriefInput, BriefOutput, RefinementMode } from '@/types'

const SEO_CONTENT_TYPES = ['Blog Post', 'Landing Page']

function buildSchemaSection(contentType: string): string {
  const base = `{
  "briefSummary": "string - 2-3 sentence strategic overview that explains the reasoning behind the chosen approach, including market context",
  "audienceAnalysis": "string - audience definition, behavioral traits, psychological motivations, decision-making constraints, content consumption context, and key frustrations or objections they face",
  "searchIntent": "string - concise classification (informational/commercial/transactional/navigational) plus why this intent matters for content decisions",
  "contentGoal": "string - what this content must achieve for the reader and the business, with the strategic rationale behind each objective",
  "recommendedContentAngle": "string - positioning recommendation with strategic direction, non-obvious market observations, and insight into how to differentiate from competitors. Must feel like expert commentary, not summary.",
  "questionsToAnswer": ["string - 3-5 questions the content must answer, focused on reader decision-making needs"],
  "suggestedContentStructure": ["string - 5-8 sections in a logical narrative order"],
  "ctaRecommendation": "string - one specific, actionable CTA aligned with funnel stage and reader readiness"`

  if (SEO_CONTENT_TYPES.includes(contentType)) {
    return `${base},
  "metaTitle": "string - SEO-optimized title under 60 characters",
  "metaDescription": "string - compelling description under 160 characters"
}`
  }

  return `${base}
}`
}

const BASE_SYSTEM_PROMPT = `You are a senior content strategist. You do NOT write content. You design strategic direction for content before writing begins.

Your role is to transform a raw content idea into a structured, writer-ready content brief with consulting-grade strategic depth.

Before writing, you must think through:
- What is the audience's real motivation (not just their job title)?
- What is the market tension or contradiction in this topic?
- What do most existing content pieces on this topic get wrong?
- What strategic stance will make this brief distinctive and defensible?`

const RULES_SECTION = `
STRATEGIC DEPTH RULES:
- Every section must explain WHY decisions are made, not only WHAT is recommended
- Include at least one strategic insight that is non-obvious and reflects real market dynamics
- Avoid surface-level or generic marketing framing
- Show deep understanding of content systems, not just writing mechanics

FORBIDDEN PATTERNS:
- Never use em dashes. Use full stops, commas, or restructured sentences instead.
- Never use contrast cliches like "This is not just X, it is Y". State ideas directly in separate sentences.
- Never use these words: transform, revolutionize, game-changer, unlock, powerful (when vague).
- Use concrete verbs instead: exposes, clarifies, shifts, reduces, improves, reveals.
- Vary sentence length and paragraph density. Avoid repetitive cadence.

TONE GUIDELINES:
- Confident, direct, occasionally opinionated
- Grounded in real-world content operations experience
- No hype language, no vendor-style messaging, no generic AI tone
- Write like a senior strategist with hard-won market understanding
- Every sentence must earn its place. Remove anything that could apply to any piece of content.

CRITICAL RULES:
- Be concise and structured
- Avoid fluff or marketing jargon
- Prioritize strategic clarity over creativity
- Make outputs actionable for writers
- Do NOT write full articles
- Do NOT invent SEO metrics or fake data
- Do NOT add sections beyond those listed above`

export function getRefinementInstruction(mode: RefinementMode): string {
  switch (mode) {
    case 'shorter':
      return `Make the brief SHORTER:
- Compress verbose passages into concise statements
- Convert paragraphs into bullet points where appropriate
- Remove redundant or repetitive language
- Keep ALL sections — do not remove any
- Maintain strategic depth — shorten without dumbing down
- If a sentence can be 5 words instead of 10, make it 5`

    case 'strategic':
      return `Make the brief MORE STRATEGIC:
- Deepen reasoning in Brief Summary, Content Goal, and Recommended Content Angle
- Strengthen the "why this matters" framing throughout every section
- Add non-obvious market observations and strategic positioning insights
- Keep approximately the same length — increase insight density, not word count
- Do NOT change recommendations, content structure, or CTA unless the deeper reasoning demands it`

    case 'actionable':
      return `Make the brief ACTIONABLE:
- Add concrete, specific, implementable detail to Suggested Content Structure and CTA Recommendation
- Replace abstract or generic language with precise, writer-ready guidance
- Strengthen the connection between audience problems and concrete content solutions
- Include practical steps or tactical direction a writer can execute immediately
- Keep the high-level strategic positioning and structure intact`

    case 'tone':
      return `Adjust the TONE of the brief:
- Rewrite language across ALL sections for consistency and authority
- Make the voice confident, direct, and opinionated
- Remove weak, vague, or hedging language
- Do NOT change the structure, recommendations, reasoning, or facts
- Only the expression changes — meaning must remain identical`
  }
}

function buildSystemPrompt(contentType: string): string {
  return `${BASE_SYSTEM_PROMPT}

OUTPUT MUST BE VALID JSON with this exact structure. No section may be omitted:
${buildSchemaSection(contentType)}${RULES_SECTION}`
}

export function buildPrompt(input: BriefInput, refinementMode?: RefinementMode, currentOutput?: BriefOutput): { system: string; user: string } {
  const system = buildSystemPrompt(input.contentType)

  if (refinementMode && currentOutput) {
    const instruction = getRefinementInstruction(refinementMode)

    const optionalFields = []
    if (input.businessGoal) optionalFields.push(`Business Goal: ${input.businessGoal}`)
    if (input.productContext) optionalFields.push(`Product Context: ${input.productContext}`)
    if (input.brandVoice) optionalFields.push(`Brand Voice: ${input.brandVoice}`)
    const optionalSection = optionalFields.length > 0 ? `\n${optionalFields.join('\n')}\n` : ''

    const user = `REFINEMENT REQUEST

I am providing you with an existing content brief below. Edit it according to the instructions.

EXISTING BRIEF (the document to refine):
${JSON.stringify(currentOutput, null, 2)}

ORIGINAL BRIEF PARAMETERS (reference context):
Topic / Keyword: ${input.topic}
Target Audience: ${input.targetAudience}
Content Type: ${input.contentType}
Funnel Stage: ${input.funnelStage}${optionalSection}

REFINEMENT INSTRUCTION:
${instruction}

Return the COMPLETE updated brief as valid JSON. Preserve all sections and core reasoning. Apply only the changes requested above. Output ONLY valid JSON — no markdown wrapping, no code fences, no explanation.`

    return { system, user }
  }

  const optionalFields = []
  if (input.businessGoal) optionalFields.push(`Business Goal: ${input.businessGoal}`)
  if (input.productContext) optionalFields.push(`Product Context: ${input.productContext}`)
  if (input.brandVoice) optionalFields.push(`Brand Voice: ${input.brandVoice}`)

  const optionalSection = optionalFields.length > 0 ? `\n${optionalFields.join('\n')}\n` : ''

  const user = `Generate a strategic content brief based on the following:

Topic / Keyword: ${input.topic}
Target Audience: ${input.targetAudience}
Content Type: ${input.contentType}
Funnel Stage: ${input.funnelStage}${optionalSection}

Remember: Output ONLY valid JSON. No markdown wrapping, no code fences, no explanation.`

  return { system, user }
}
