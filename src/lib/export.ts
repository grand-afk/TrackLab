import type { Stem, Annotation } from '../store/useTrackStore'

function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = (s % 60).toFixed(2).padStart(5, '0')
  return `${m}:${sec}`
}

export function exportMarkdown(stems: Stem[], annotations: Annotation[]): string {
  const date = new Date().toISOString().split('T')[0]
  const lines: string[] = []

  lines.push(`# TrackLab Session — ${date}`, '')

  for (const stem of stems) {
    lines.push(`## ${stem.name}`)
    if (stem.bpm) lines.push(`- **BPM**: ${stem.bpm}`)
    if (stem.key) lines.push(`- **Key**: ${stem.key} ${stem.scale ?? ''}`)
    if (stem.duration) lines.push(`- **Duration**: ${formatTime(stem.duration)}`)
    lines.push('')
  }

  if (annotations.length > 0) {
    lines.push('## Annotations', '')
    for (const ann of annotations) {
      if (ann.type === 'vertical') {
        lines.push(`- **Marker** @ ${formatTime(ann.position)}${ann.label ? ` — ${ann.label}` : ''}`)
      } else if (ann.type === 'horizontal') {
        lines.push(`- **H-line** @ ${(ann.position * 100).toFixed(1)}%${ann.label ? ` — ${ann.label}` : ''}`)
      } else {
        lines.push(`- **Note** @ ${formatTime(ann.position)}: ${ann.label}`)
      }
    }
  }

  return lines.join('\n')
}

export async function triggerExport(content: string, filename: string) {
  if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    const file = new File([content], filename, { type: 'text/plain' })
    await navigator.share({ files: [file], title: 'TrackLab Export' })
  } else {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}
