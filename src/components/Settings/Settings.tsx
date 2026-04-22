import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useTrackStore } from '../../store/useTrackStore'

type Props = { open: boolean; onClose: () => void }

const ACTION_LABELS: Record<string, string> = {
  'play-pause':    'Play / Pause',
  'stop':          'Stop',
  'skip-start':    'Skip to start',
  'zoom-in':       'Zoom in',
  'zoom-out':      'Zoom out',
  'goto':          'Go to time',
  'export':        'Export',
  'settings':      'Open settings',
}

export function Settings({ open, onClose }: Props) {
  const shortcuts    = useTrackStore((s) => s.settings.shortcuts)
  const updateSettings = useTrackStore((s) => s.updateSettings)
  const [editing, setEditing] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Delete') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  function capture(action: string, e: React.KeyboardEvent) {
    e.preventDefault()
    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('ctrl')
    if (e.shiftKey) parts.push('shift')
    if (e.altKey)   parts.push('alt')
    const key = e.key === ' ' ? 'Space' : e.key
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) parts.push(key)
    if (parts.length) {
      updateSettings({ shortcuts: { ...shortcuts, [action]: parts.join('+') } })
      setEditing(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-100">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-500 mb-4">Click a shortcut then press a new key to rebind. Esc or Delete closes.</p>

        <div className="space-y-2">
          {Object.entries(ACTION_LABELS).map(([action, label]) => (
            <div key={action} className="flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-300">{label}</span>
              <button
                className={`font-mono text-xs px-2.5 py-1 rounded border min-w-[80px] text-center transition-colors ${
                  editing === action
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
                }`}
                onClick={() => setEditing(action)}
                onKeyDown={(e) => editing === action && capture(action, e)}
              >
                {editing === action ? '…' : (shortcuts[action] ?? '—')}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-zinc-800 text-xs text-zinc-500 space-y-1">
          <p><span className="text-zinc-400 font-mono">1–0</span> · Drop cue marker at playhead</p>
          <p><span className="text-zinc-400 font-mono">Alt+1–0</span> · Markers 11–20</p>
          <p><span className="text-zinc-400 font-mono">← →</span> · Nudge selected marker ±0.1s</p>
          <p><span className="text-zinc-400 font-mono">Shift+← →</span> · Fine nudge ±0.01s</p>
          <p><span className="text-zinc-400 font-mono">Delete</span> · Remove selected marker</p>
          <p><span className="text-zinc-400 font-mono">G</span> · Focus time input</p>
          <p><span className="text-zinc-400 font-mono">Scroll / Pinch</span> · Zoom waveform</p>
        </div>
      </div>
    </div>
  )
}
