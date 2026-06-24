import type { BriefOutput } from '@/types'

export function briefToMarkdown(output: BriefOutput): string {
  const sections: { key: keyof BriefOutput; label: string }[] = [
    { key: 'briefSummary', label: 'Brief Summary' },
    { key: 'audienceAnalysis', label: 'Audience Analysis' },
    { key: 'searchIntent', label: 'Search Intent' },
    { key: 'contentGoal', label: 'Content Goal' },
    { key: 'recommendedContentAngle', label: 'Recommended Content Angle' },
    { key: 'questionsToAnswer', label: 'Questions To Answer' },
    { key: 'suggestedContentStructure', label: 'Suggested Content Structure' },
    { key: 'ctaRecommendation', label: 'CTA Recommendation' },
    { key: 'metaTitle', label: 'Meta Title' },
    { key: 'metaDescription', label: 'Meta Description' },
  ]

  const lines: string[] = []

  for (const { key, label } of sections) {
    const value = output[key]

    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
      continue
    }

    lines.push(`## ${label}`)
    lines.push('')

    if (Array.isArray(value)) {
      for (const item of value) {
        lines.push(`- ${item}`)
      }
    } else {
      lines.push(value)
    }

    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n').trim()
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text)
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  return Promise.resolve()
}
