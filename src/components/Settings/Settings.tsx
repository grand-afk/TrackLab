import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { useTrackStore } from '../../store/useTrackStore'
import type { SkipUnit } from '../../store/useTrackStore'

const TIME_SIG_TOPS    = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const TIME_SIG_BOTTOMS = [2, 4, 8, 16]
const SUBDIV_OPTIONS   = [
  { value: 2, label: '1/8 note' },
  { value: 4, label: '1/16 note' },
  { value: 8, label: '1/32 note' },
]

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
  'clear-markers': 'Clear all markers',
}

const cls = {
  input: 'w-16 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500 text-right',
  select: 'bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500',
}

export function Settings({ open, onClose }: Props) {
  const shortcuts        = useTrackStore((s) => s.settings.shortcuts)
  const skip             = useTrackStore((s) => s.settings.skip)
  const timeSigTop       = useTrackStore((s) => s.settings.timeSignatureTop)
  const timeSigBot       = useTrackStore((s) => s.settings.timeSignatureBottom)
  const subdivTicks      = useTrackStore((s) => s.settings.subdivisionTicks)
  const updateSettings   = useTrackStore((s) => s.updateSettings)
  const updateSkipSettings = useTrackStore((s) => s.updateSkipSettings)
  const [editing, setEditing] = useState<string | null>(null)
  const editingRef = useRef<string | null>(null)
  editingRef.current = editing

  // Close on Escape — but not while capturing a new shortcut
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (editingRef.current) return
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  function capture(action: string, e: React.KeyboardEvent) {
    e.preventDefault()
    const isModifier = ['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)
    if (isModifier) return  // wait for the actual key
    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('$mod')
    if (e.shiftKey) parts.push('Shift')
    if (e.altKey)   parts.push('Alt')
    const key = e.key === ' ' ? 'Space' : e.key
    parts.push(key)
    updateSettings({ shortcuts: { ...shortcuts, [action]: parts.join('+') } })
    setEditing(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-100">Settings</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Skip configuration */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Skip / Rewind</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-300">Normal skip</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={0.1} step={0.1}
                  value={skip.amount}
                  onChange={(e) => updateSkipSettings({ amount: parseFloat(e.target.value) || 1 })}
                  className={cls.input}
                />
                <select
                  value={skip.unit}
                  onChange={(e) => updateSkipSettings({ unit: e.target.value as SkipUnit })}
                  className={cls.select}
                >
                  <option value="seconds">sec</option>
                  <option value="beats">beats</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-300">Fine skip <span className="text-zinc-600">(Shift+←→)</span></span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min={0.01} step={0.01}
                  value={skip.fineAmount}
                  onChange={(e) => updateSkipSettings({ fineAmount: parseFloat(e.target.value) || 0.1 })}
                  className={cls.input}
                />
                <select
                  value={skip.fineUnit}
                  onChange={(e) => updateSkipSettings({ fineUnit: e.target.value as SkipUnit })}
                  className={cls.select}
                >
                  <option value="seconds">sec</option>
                  <option value="beats">beats</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Time signature + subdivision */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Time Signature &amp; Bars Display</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-300">Time signature</span>
              <div className="flex items-center gap-1.5">
                <select
                  value={timeSigTop}
                  onChange={(e) => updateSettings({ timeSignatureTop: parseInt(e.target.value) })}
                  className={cls.select}
                >
                  {TIME_SIG_TOPS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="text-zinc-500 text-xs">/</span>
                <select
                  value={timeSigBot}
                  onChange={(e) => updateSettings({ timeSignatureBottom: parseInt(e.target.value) })}
                  className={cls.select}
                >
                  {TIME_SIG_BOTTOMS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-zinc-300">Bar subdivision</span>
              <select
                value={subdivTicks}
                onChange={(e) => updateSettings({ subdivisionTicks: parseInt(e.target.value) })}
                className={cls.select}
              >
                {SUBDIV_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">
              Affects bars:beats display in transport. Beat grid always shows whole-bar divisions.
            </p>
          </div>
        </div>

        {/* Keyboard shortcuts */}
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Keyboard Shortcuts</p>
        <p className="text-xs text-zinc-500 mb-3">Click a shortcut then press a new key to rebind.</p>

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
          <p><span className="text-zinc-400 font-mono">Ctrl+1–0</span> · Jump to marker</p>
          <p><span className="text-zinc-400 font-mono">← →</span> · Skip / nudge selected marker</p>
          <p><span className="text-zinc-400 font-mono">Shift+← →</span> · Fine skip / nudge (±0.01s)</p>
          <p><span className="text-zinc-400 font-mono">Ctrl+Shift+← →</span> · Very fine nudge (±0.001s)</p>
          <p><span className="text-zinc-400 font-mono">F2</span> · Edit selected marker label</p>
          <p><span className="text-zinc-400 font-mono">Delete</span> · Remove selected marker</p>
          <p><span className="text-zinc-400 font-mono">G</span> · Focus time input</p>
          <p><span className="text-zinc-400 font-mono">Scroll / Pinch</span> · Zoom waveform</p>
        </div>
      </div>
    </div>
  )
}
