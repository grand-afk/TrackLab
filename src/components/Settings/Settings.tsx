import { useState } from 'react'
import { X } from 'lucide-react'
import { useTrackStore } from '../../store/useTrackStore'

type Props = { open: boolean; onClose: () => void }

const ACTION_LABELS: Record<string, string> = {
  'play-pause': 'Play / Pause',
  'stop': 'Stop',
  'add-marker': 'Add vertical marker',
  'add-hline': 'Add horizontal line',
  'zoom-in': 'Zoom in',
  'zoom-out': 'Zoom out',
  'next-beat': 'Next beat',
  'prev-beat': 'Previous beat',
  'export': 'Export',
  'settings': 'Open settings',
}

export function Settings({ open, onClose }: Props) {
  const shortcuts = useTrackStore((s) => s.settings.shortcuts)
  const updateSettings = useTrackStore((s) => s.updateSettings)
  const [editing, setEditing] = useState<string | null>(null)

  if (!open) return null

  function capture(action: string, e: React.KeyboardEvent) {
    e.preventDefault()
    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('ctrl')
    if (e.shiftKey) parts.push('shift')
    if (e.altKey) parts.push('alt')
    const key = e.key === ' ' ? 'Space' : e.key
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) parts.push(key)
    if (parts.length) {
      updateSettings({ shortcuts: { ...shortcuts, [action]: parts.join('+') } })
      setEditing(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-zinc-100">Settings</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-500 mb-4">Click a shortcut and press a new key to rebind.</p>

        <div className="space-y-2">
          {Object.entries(ACTION_LABELS).map(([action, label]) => (
            <div key={action} className="flex items-center justify-between gap-4">
              <span className="text-sm text-zinc-300">{label}</span>
              <button
                className={`font-mono text-xs px-3 py-1 rounded border transition-colors ${
                  editing === action
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-zinc-500'
                }`}
                onClick={() => setEditing(action)}
                onKeyDown={(e) => editing === action && capture(action, e)}
              >
                {editing === action ? 'press key…' : (shortcuts[action] ?? '—')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
