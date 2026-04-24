import { useTrackStore } from '../../store/useTrackStore'
import { fmtKey } from './ShortcutBadge'

export function WaveformHints() {
  const show = useTrackStore((s) => s.showShortcutHints)
  const shortcuts = useTrackStore((s) => s.settings.shortcuts)
  if (!show) return null

  const rows = [
    { key: '1–0', label: 'Drop marker' },
    { key: 'Alt+1–0', label: 'Markers 11–20' },
    { key: fmtKey('$mod') + '+1–0', label: 'Jump to marker' },
    { key: '⇧+1–0', label: 'Delete marker' },
    { key: 'A–F', label: 'Focus stem' },
    { key: '← →', label: 'Skip / nudge marker' },
    { key: '⇧← →', label: 'Fine skip' },
    { key: 'F2', label: 'Edit label' },
    { key: 'Del', label: 'Remove marker' },
    { key: fmtKey(shortcuts['zoom-in'] ?? '=') + ' ' + fmtKey(shortcuts['zoom-out'] ?? '-'), label: 'Zoom in / out' },
    { key: 'G', label: 'Go to time' },
    { key: '?', label: 'Hide hints' },
  ]

  return (
    <div className="absolute bottom-2 right-2 z-50 bg-zinc-900/90 border border-zinc-700 rounded-lg p-2 pointer-events-none">
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-yellow-400 font-bold whitespace-nowrap">{r.key}</span>
            <span className="text-[9px] text-zinc-400">{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
