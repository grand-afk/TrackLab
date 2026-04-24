import { useTrackStore } from '../../store/useTrackStore'

const isMac = /Mac|iPod|iPhone|iPad/.test(typeof navigator !== 'undefined' ? navigator.platform : '')

export function fmtKey(key: string): string {
  return key
    .replace(/\$mod/g, isMac ? '⌘' : 'Ctrl')
    .replace(/Shift/g, '⇧')
    .replace(/Alt/g, isMac ? '⌥' : 'Alt')
    .replace(/Control/g, 'Ctrl')
    .replace('Space', '␣')
    .replace('Escape', 'Esc')
    .replace('ArrowLeft', '←')
    .replace('ArrowRight', '→')
    .replace(/\+/g, '')  // compact: no separator between modifiers
}

type Props = {
  // Pass either a store action name OR a literal key string
  action?: string
  label?: string
  className?: string  // override positioning
}

export function ShortcutBadge({ action, label, className }: Props) {
  const show = useTrackStore((s) => s.showShortcutHints)
  const shortcuts = useTrackStore((s) => s.settings.shortcuts)
  if (!show) return null
  const raw = label ?? (action ? shortcuts[action] : null)
  if (!raw) return null
  return (
    <span
      className={`pointer-events-none absolute z-[60] px-0.5 py-px rounded text-[9px] font-bold font-mono bg-yellow-400 text-zinc-900 select-none ${className ?? 'top-0 right-0'}`}
    >
      {fmtKey(raw)}
    </span>
  )
}
